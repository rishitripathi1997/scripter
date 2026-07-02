from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentAdmin, CurrentUser, DbSession
from app.models.run import ScriptRun
from app.models.script import Script
from app.models.user import UserRole
from app.schemas.run import RunLogs, RunSummary
from app.services.storage import get_storage

router = APIRouter(prefix="/runs", tags=["runs"])


def _to_summary(run: ScriptRun, script: Script | None = None) -> RunSummary:
    return RunSummary(
        id=str(run.id),
        script_id=str(run.script_id),
        script_name=script.name if script else None,
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


def _get_run_row(db, run_id: str, current_user):
    q = (
        db.query(ScriptRun, Script)
        .join(Script, Script.id == ScriptRun.script_id)
        .filter(ScriptRun.id == run_id)
    )
    if current_user.role != UserRole.admin:
        q = q.filter(ScriptRun.user_id == current_user.id)
    return q.first()


@router.get("/mine", response_model=list[RunSummary])
def list_my_runs(db: DbSession, current_user: CurrentUser) -> list[RunSummary]:
    rows = (
        db.query(ScriptRun, Script)
        .join(Script, Script.id == ScriptRun.script_id)
        .filter(ScriptRun.user_id == current_user.id)
        .order_by(ScriptRun.created_at.desc())
        .limit(100)
        .all()
    )
    return [_to_summary(run, script) for run, script in rows]


@router.get("/all", response_model=list[RunSummary])
def list_all_runs(db: DbSession, _: CurrentAdmin) -> list[RunSummary]:
    rows = (
        db.query(ScriptRun, Script)
        .join(Script, Script.id == ScriptRun.script_id)
        .order_by(ScriptRun.created_at.desc())
        .limit(200)
        .all()
    )
    return [_to_summary(run, script) for run, script in rows]


@router.get("/{run_id}/logs", response_model=RunLogs)
def get_run_logs(run_id: str, db: DbSession, current_user: CurrentUser) -> RunLogs:
    row = _get_run_row(db, run_id, current_user)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    run, _ = row

    storage = get_storage()
    stdout = ""
    stderr = ""
    if run.stdout_s3_key:
        try:
            stdout = storage.get_text(run.stdout_s3_key)
        except FileNotFoundError:
            stdout = "(log not found)"
    if run.stderr_s3_key:
        try:
            stderr = storage.get_text(run.stderr_s3_key)
        except FileNotFoundError:
            stderr = "(log not found)"

    return RunLogs(stdout=stdout, stderr=stderr)


@router.get("/{run_id}", response_model=RunSummary)
def get_run(run_id: str, db: DbSession, current_user: CurrentUser) -> RunSummary:
    row = _get_run_row(db, run_id, current_user)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    run, script = row
    return _to_summary(run, script)
