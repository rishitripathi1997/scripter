from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, DbSession
from app.core.config import get_settings
from app.models.script import Script, ScriptStatus
from app.models.user import User
from app.schemas.run import RunCreate, RunSummary
from app.schemas.script import ScriptSummary
from app.services.credentials_service import load_user_credentials_for_script
from app.services.permissions import get_script_permissions, user_can_run_script
from app.services.queue import enqueue_script_run
from app.services.runner import RunnerError, create_and_execute_run, create_pending_run

router = APIRouter(prefix="/scripts", tags=["scripts"])


def _to_summary(script: Script, db: DbSession, user: User) -> ScriptSummary:
    can_run = None
    run_restricted = False
    perms = get_script_permissions(db, script.id)
    run_restricted = len(perms) > 0
    can_run = user_can_run_script(db, user, script)

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
        can_run=can_run,
        run_restricted=run_restricted,
    )


def _run_summary(run, script) -> RunSummary:
    return RunSummary(
        id=str(run.id),
        script_id=str(run.script_id),
        script_name=script.name,
        status=run.status.value,
        is_test_run=run.is_test_run,
        input_snapshot=run.input_snapshot or {},
        credentials_used=run.credentials_used or [],
        username_snapshot=run.username_snapshot,
        started_at=run.started_at,
        finished_at=run.finished_at,
        exit_code=run.exit_code,
        error_message=run.error_message,
        created_at=run.created_at,
    )


@router.get("", response_model=list[ScriptSummary])
def list_active_scripts(db: DbSession, current_user: CurrentUser) -> list[ScriptSummary]:
    scripts = (
        db.query(Script)
        .filter(Script.status == ScriptStatus.active)
        .order_by(Script.name)
        .all()
    )
    return [_to_summary(s, db, current_user) for s in scripts]


@router.get("/{script_id}", response_model=ScriptSummary)
def get_script(script_id: str, db: DbSession, current_user: CurrentUser) -> ScriptSummary:
    script = db.query(Script).filter(Script.id == script_id).first()
    if not script or script.status != ScriptStatus.active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Script not found")
    return _to_summary(script, db, current_user)


@router.post("/{script_id}/run", response_model=RunSummary, status_code=status.HTTP_201_CREATED)
def run_script(
    script_id: str,
    body: RunCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> RunSummary:
    script = db.query(Script).filter(Script.id == script_id).first()
    if not script or script.status != ScriptStatus.active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Script not found")

    if not user_can_run_script(db, current_user, script):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot run this script")

    if not script.script_s3_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Script is not published. Ask admin to re-approve the script.",
        )

    _, _, missing = load_user_credentials_for_script(db, current_user.id, script)
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Missing required credentials",
                "missing": missing,
            },
        )

    settings = get_settings()

    try:
        if settings.async_runs_enabled:
            run = create_pending_run(db, script, current_user, body.inputs or {})
            enqueue_script_run(run.id, script.id, current_user.id)
        else:
            run = create_and_execute_run(db, script, current_user, body.inputs or {})
    except RunnerError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    return _run_summary(run, script)
