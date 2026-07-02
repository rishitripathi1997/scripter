import csv
import io
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from app.api.deps import CurrentAdmin, DbSession
from app.models.notification import NotificationType
from app.models.permission import GranteeType
from app.models.run import ScriptRun
from app.models.script import ReviewAction, Script, ScriptRevision, ScriptReviewAction, ScriptStatus
from app.models.user import User
from app.schemas.auth import UserResponse
from app.schemas.script import (
    DeprecateScriptRequest,
    ReviewActionRequest,
    ScriptPermissionsResponse,
    ScriptPermissionsUpdate,
    ScriptSettingsUpdate,
    ScriptSummary,
)
from app.services.notifications import notify_user
from app.services.permissions import get_script_permissions, set_script_permissions
from app.services.storage import publish_script_version

router = APIRouter(prefix="/admin", tags=["admin"])


def _to_summary(script: Script) -> ScriptSummary:
    return ScriptSummary(
        id=str(script.id),
        name=script.name,
        slug=script.slug,
        description=script.description,
        status=script.status.value,
        input_schema=script.input_schema or {},
        credential_requirements=script.credential_requirements or {},
        approved_version=script.approved_version,
        published_at=script.published_at,
        timeout_seconds=script.timeout_seconds,
        deprecated_at=script.deprecated_at,
        deprecation_reason=script.deprecation_reason,
    )


@router.get("/users", response_model=list[UserResponse])
def list_users(db: DbSession, _: CurrentAdmin) -> list[UserResponse]:
    users = db.query(User).filter(User.is_active.is_(True)).order_by(User.username).all()
    return [
        UserResponse(
            id=str(u.id),
            username=u.username,
            display_name=u.display_name,
            role=u.role.value,
        )
        for u in users
    ]


@router.get("/review-queue", response_model=list[ScriptSummary])
def review_queue(db: DbSession, _: CurrentAdmin) -> list[ScriptSummary]:
    scripts = (
        db.query(Script)
        .filter(Script.status == ScriptStatus.pending_review)
        .order_by(Script.updated_at.desc())
        .all()
    )
    return [_to_summary(s) for s in scripts]


@router.get("/proposals/{proposal_id}", response_model=ScriptSummary)
def get_proposal_for_review(proposal_id: str, db: DbSession, _: CurrentAdmin) -> ScriptSummary:
    script = db.query(Script).filter(Script.id == proposal_id).first()
    if not script:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposal not found")
    return _to_summary(script)


@router.get("/proposals/{proposal_id}/content")
def get_proposal_content(proposal_id: str, db: DbSession, _: CurrentAdmin) -> dict:
    script = db.query(Script).filter(Script.id == proposal_id).first()
    if not script:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposal not found")

    revision = (
        db.query(ScriptRevision)
        .filter(ScriptRevision.script_id == script.id)
        .order_by(ScriptRevision.revision_number.desc())
        .first()
    )
    if not revision:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No revision found")

    return {
        "revision_number": revision.revision_number,
        "script_content": revision.script_content,
        "manifest_snapshot": revision.manifest_snapshot,
        "change_summary": revision.change_summary,
    }


@router.post("/proposals/{proposal_id}/approve", response_model=ScriptSummary)
def approve_proposal(
    proposal_id: str,
    db: DbSession,
    admin: CurrentAdmin,
    body: ReviewActionRequest | None = None,
) -> ScriptSummary:
    script = db.query(Script).filter(Script.id == proposal_id).first()
    if not script or script.status != ScriptStatus.pending_review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposal not in review")

    latest = (
        db.query(ScriptRevision)
        .filter(ScriptRevision.script_id == script.id)
        .order_by(ScriptRevision.revision_number.desc())
        .first()
    )

    now = datetime.now(timezone.utc)
    script.status = ScriptStatus.active
    script.reviewed_by = admin.id
    script.reviewed_at = now
    script.approved_version += 1
    if not script.published_at:
        script.published_at = now
    script.rejection_reason = None
    script.review_notes = body.notes if body else None

    if latest and latest.script_content:
        manifest = {
            "input_schema": script.input_schema,
            "credential_requirements": script.credential_requirements,
        }
        script_key = publish_script_version(
            script_id=str(script.id),
            version=script.approved_version,
            script_content=latest.script_content,
            manifest=manifest,
        )
        script.script_s3_key = script_key

    db.add(
        ScriptReviewAction(
            script_id=script.id,
            revision_id=latest.id if latest else None,
            action=ReviewAction.approve,
            actor_id=admin.id,
            notes=body.notes if body else None,
        )
    )
    db.commit()
    db.refresh(script)

    if script.proposed_by:
        notify_user(
            db,
            script.proposed_by,
            title="Script approved",
            message=f'Your script "{script.name}" was approved and is now in the catalog.',
            link="/proposals",
            ntype=NotificationType.success,
        )

    return _to_summary(script)


@router.post("/proposals/{proposal_id}/reject", response_model=ScriptSummary)
def reject_proposal(
    proposal_id: str,
    body: ReviewActionRequest,
    db: DbSession,
    admin: CurrentAdmin,
) -> ScriptSummary:
    if not body.reason:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rejection reason required")

    script = db.query(Script).filter(Script.id == proposal_id).first()
    if not script or script.status != ScriptStatus.pending_review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposal not in review")

    script.status = ScriptStatus.rejected
    script.reviewed_by = admin.id
    script.reviewed_at = datetime.now(timezone.utc)
    script.rejection_reason = body.reason
    script.review_notes = body.notes

    db.add(
        ScriptReviewAction(
            script_id=script.id,
            action=ReviewAction.reject,
            actor_id=admin.id,
            notes=body.reason,
        )
    )
    db.commit()
    db.refresh(script)

    if script.proposed_by:
        notify_user(
            db,
            script.proposed_by,
            title="Script rejected",
            message=f'Your script "{script.name}" was rejected: {body.reason}',
            link="/proposals",
            ntype=NotificationType.error,
        )

    return _to_summary(script)


@router.post("/proposals/{proposal_id}/request-changes", response_model=ScriptSummary)
def request_changes(
    proposal_id: str,
    body: ReviewActionRequest,
    db: DbSession,
    admin: CurrentAdmin,
) -> ScriptSummary:
    if not body.notes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Notes required")

    script = db.query(Script).filter(Script.id == proposal_id).first()
    if not script or script.status != ScriptStatus.pending_review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposal not in review")

    script.status = ScriptStatus.changes_requested
    script.reviewed_by = admin.id
    script.reviewed_at = datetime.now(timezone.utc)
    script.review_notes = body.notes

    db.add(
        ScriptReviewAction(
            script_id=script.id,
            action=ReviewAction.request_changes,
            actor_id=admin.id,
            notes=body.notes,
        )
    )
    db.commit()
    db.refresh(script)

    if script.proposed_by:
        notify_user(
            db,
            script.proposed_by,
            title="Changes requested",
            message=f'Admin requested changes for "{script.name}": {body.notes}',
            link="/proposals",
            ntype=NotificationType.warning,
        )

    return _to_summary(script)


@router.get("/scripts/deprecated", response_model=list[ScriptSummary])
def list_deprecated_scripts(db: DbSession, _: CurrentAdmin) -> list[ScriptSummary]:
    scripts = (
        db.query(Script)
        .filter(Script.status == ScriptStatus.deprecated)
        .order_by(Script.deprecated_at.desc())
        .all()
    )
    return [_to_summary(s) for s in scripts]


@router.get("/scripts/{script_id}/permissions", response_model=ScriptPermissionsResponse)
def get_permissions(script_id: str, db: DbSession, _: CurrentAdmin) -> ScriptPermissionsResponse:
    script = db.query(Script).filter(Script.id == script_id).first()
    if not script:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Script not found")

    perms = get_script_permissions(db, script.id)
    user_ids = [p.grantee_value for p in perms if p.grantee_type == GranteeType.user]
    roles = [p.grantee_value for p in perms if p.grantee_type == GranteeType.role]

    return ScriptPermissionsResponse(
        script_id=str(script.id),
        restricted=len(perms) > 0,
        user_ids=user_ids,
        roles=roles,
    )


@router.put("/scripts/{script_id}/permissions", response_model=ScriptPermissionsResponse)
def update_permissions(
    script_id: str,
    body: ScriptPermissionsUpdate,
    db: DbSession,
    _: CurrentAdmin,
) -> ScriptPermissionsResponse:
    script = db.query(Script).filter(Script.id == script_id).first()
    if not script or script.status != ScriptStatus.active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active script not found")

    set_script_permissions(db, script, body.user_ids, body.roles)
    perms = get_script_permissions(db, script.id)

    return ScriptPermissionsResponse(
        script_id=str(script.id),
        restricted=len(perms) > 0,
        user_ids=body.user_ids,
        roles=body.roles,
    )


@router.get("/audit/export")
def export_audit_csv(db: DbSession, _: CurrentAdmin) -> StreamingResponse:
    rows = (
        db.query(ScriptRun, Script)
        .join(Script, Script.id == ScriptRun.script_id)
        .order_by(ScriptRun.created_at.desc())
        .limit(5000)
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "run_id",
            "username",
            "script_name",
            "script_id",
            "status",
            "exit_code",
            "credentials_used",
            "started_at",
            "finished_at",
            "created_at",
            "error_message",
        ]
    )
    for run, script in rows:
        writer.writerow(
            [
                str(run.id),
                run.username_snapshot,
                script.name,
                str(script.id),
                run.status.value,
                run.exit_code if run.exit_code is not None else "",
                ", ".join(run.credentials_used or []),
                run.started_at.isoformat() if run.started_at else "",
                run.finished_at.isoformat() if run.finished_at else "",
                run.created_at.isoformat() if run.created_at else "",
                run.error_message or "",
            ]
        )

    output.seek(0)
    filename = f"connectx-audit-{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.patch("/scripts/{script_id}/settings", response_model=ScriptSummary)
def update_script_settings(
    script_id: str,
    body: ScriptSettingsUpdate,
    db: DbSession,
    _: CurrentAdmin,
) -> ScriptSummary:
    script = db.query(Script).filter(Script.id == script_id).first()
    if not script or script.status not in {ScriptStatus.active, ScriptStatus.deprecated}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Script not found")

    script.timeout_seconds = body.timeout_seconds
    db.commit()
    db.refresh(script)
    return _to_summary(script)


@router.post("/scripts/{script_id}/deprecate", response_model=ScriptSummary)
def deprecate_script(
    script_id: str,
    body: DeprecateScriptRequest,
    db: DbSession,
    admin: CurrentAdmin,
) -> ScriptSummary:
    script = db.query(Script).filter(Script.id == script_id).first()
    if not script or script.status != ScriptStatus.active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active script not found")

    now = datetime.now(timezone.utc)
    script.status = ScriptStatus.deprecated
    script.deprecated_at = now
    script.deprecation_reason = body.reason
    script.reviewed_by = admin.id
    script.reviewed_at = now

    db.add(
        ScriptReviewAction(
            script_id=script.id,
            action=ReviewAction.deprecate,
            actor_id=admin.id,
            notes=body.reason,
        )
    )
    db.commit()
    db.refresh(script)

    if script.proposed_by:
        notify_user(
            db,
            script.proposed_by,
            title="Script deprecated",
            message=f'"{script.name}" was deprecated: {body.reason}',
            link="/proposals",
            ntype=NotificationType.warning,
            external=True,
        )

    return _to_summary(script)


@router.post("/scripts/{script_id}/reactivate", response_model=ScriptSummary)
def reactivate_script(
    script_id: str,
    db: DbSession,
    admin: CurrentAdmin,
) -> ScriptSummary:
    script = db.query(Script).filter(Script.id == script_id).first()
    if not script or script.status != ScriptStatus.deprecated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deprecated script not found")

    script.status = ScriptStatus.active
    script.deprecated_at = None
    script.deprecation_reason = None
    script.reviewed_by = admin.id
    script.reviewed_at = datetime.now(timezone.utc)

    db.add(
        ScriptReviewAction(
            script_id=script.id,
            action=ReviewAction.approve,
            actor_id=admin.id,
            notes="Reactivated from deprecated",
        )
    )
    db.commit()
    db.refresh(script)

    if script.proposed_by:
        notify_user(
            db,
            script.proposed_by,
            title="Script reactivated",
            message=f'"{script.name}" is active again in the catalog.',
            link="/catalog",
            ntype=NotificationType.success,
        )

    return _to_summary(script)
