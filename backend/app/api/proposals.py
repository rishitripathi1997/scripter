import re
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, DbSession
from app.models.notification import NotificationType
from app.models.script import ReviewAction, Script, ScriptRevision, ScriptReviewAction, ScriptStatus
from app.schemas.script import ProposalCreate, ProposalUpdate, ScriptSummary
from app.services.notifications import notify_admins

router = APIRouter(prefix="/proposals", tags=["proposals"])


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
    )


def _ensure_editable(script: Script, user_id: uuid.UUID) -> None:
    if script.proposed_by != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposal not found")
    if script.status not in {
        ScriptStatus.draft,
        ScriptStatus.changes_requested,
        ScriptStatus.rejected,
    }:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Proposal not editable")


@router.get("/mine", response_model=list[ScriptSummary])
def list_my_proposals(db: DbSession, current_user: CurrentUser) -> list[ScriptSummary]:
    scripts = (
        db.query(Script)
        .filter(Script.proposed_by == current_user.id)
        .order_by(Script.updated_at.desc())
        .all()
    )
    return [_to_summary(s) for s in scripts]


@router.post("", response_model=ScriptSummary, status_code=status.HTTP_201_CREATED)
def create_proposal(body: ProposalCreate, db: DbSession, current_user: CurrentUser) -> ScriptSummary:
    existing = db.query(Script).filter(Script.slug == body.slug).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug already in use")

    script = Script(
        name=body.name,
        slug=body.slug,
        description=body.description,
        input_schema=body.input_schema.model_dump(),
        credential_requirements=body.credential_requirements.model_dump(),
        timeout_seconds=body.timeout_seconds,
        status=ScriptStatus.draft,
        proposed_by=current_user.id,
    )
    db.add(script)
    db.flush()

    revision = ScriptRevision(
        script_id=script.id,
        revision_number=1,
        script_content=body.script_content,
        manifest_snapshot={
            "input_schema": body.input_schema.model_dump(),
            "credential_requirements": body.credential_requirements.model_dump(),
        },
        submitted_by=current_user.id,
        change_summary=body.change_summary,
    )
    db.add(revision)
    db.commit()
    db.refresh(script)
    return _to_summary(script)


@router.get("/{proposal_id}", response_model=ScriptSummary)
def get_proposal(proposal_id: str, db: DbSession, current_user: CurrentUser) -> ScriptSummary:
    script = db.query(Script).filter(Script.id == proposal_id).first()
    if not script or script.proposed_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposal not found")
    return _to_summary(script)


@router.put("/{proposal_id}", response_model=ScriptSummary)
def update_proposal(
    proposal_id: str,
    body: ProposalUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> ScriptSummary:
    script = db.query(Script).filter(Script.id == proposal_id).first()
    if not script:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposal not found")
    _ensure_editable(script, current_user.id)

    if body.name is not None:
        script.name = body.name
    if body.description is not None:
        script.description = body.description
    if body.input_schema is not None:
        script.input_schema = body.input_schema.model_dump()
    if body.credential_requirements is not None:
        script.credential_requirements = body.credential_requirements.model_dump()

    if body.script_content is not None:
        last_rev = (
            db.query(ScriptRevision)
            .filter(ScriptRevision.script_id == script.id)
            .order_by(ScriptRevision.revision_number.desc())
            .first()
        )
        next_num = (last_rev.revision_number + 1) if last_rev else 1
        revision = ScriptRevision(
            script_id=script.id,
            revision_number=next_num,
            script_content=body.script_content,
            manifest_snapshot={
                "input_schema": script.input_schema,
                "credential_requirements": script.credential_requirements,
            },
            submitted_by=current_user.id,
            change_summary=body.change_summary,
        )
        db.add(revision)

    db.commit()
    db.refresh(script)
    return _to_summary(script)


@router.post("/{proposal_id}/submit", response_model=ScriptSummary)
def submit_proposal(proposal_id: str, db: DbSession, current_user: CurrentUser) -> ScriptSummary:
    script = db.query(Script).filter(Script.id == proposal_id).first()
    if not script:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposal not found")
    _ensure_editable(script, current_user.id)

    latest = (
        db.query(ScriptRevision)
        .filter(ScriptRevision.script_id == script.id)
        .order_by(ScriptRevision.revision_number.desc())
        .first()
    )
    if not latest or not latest.script_content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Script content required")

    script.status = ScriptStatus.pending_review
    action = ScriptReviewAction(
        script_id=script.id,
        revision_id=latest.id,
        action=ReviewAction.submit,
        actor_id=current_user.id,
    )
    db.add(action)
    db.commit()
    db.refresh(script)

    notify_admins(
        db,
        title="New script proposal",
        message=f'{current_user.username} submitted "{script.name}" for review.',
        link="/admin/review",
        ntype=NotificationType.info,
    )

    return _to_summary(script)
