from __future__ import annotations

import threading
import uuid

from app.db.session import SessionLocal
from app.models.notification import NotificationType
from app.models.run import ScriptRun
from app.models.script import Script
from app.models.user import User
from app.services.notifications import notify_user
from app.services.runner import execute_script_run


def enqueue_script_run(run_id: uuid.UUID, script_id: uuid.UUID, user_id: uuid.UUID) -> None:
    thread = threading.Thread(
        target=_run_worker,
        args=(run_id, script_id, user_id),
        daemon=True,
        name=f"run-{run_id}",
    )
    thread.start()


def _run_worker(run_id: uuid.UUID, script_id: uuid.UUID, user_id: uuid.UUID) -> None:
    db = SessionLocal()
    try:
        run = db.query(ScriptRun).filter(ScriptRun.id == run_id).first()
        script = db.query(Script).filter(Script.id == script_id).first()
        user = db.query(User).filter(User.id == user_id).first()
        if not run or not script or not user:
            return

        execute_script_run(db, run, script, user)
        db.refresh(run)

        status_label = run.status.value
        ntype = NotificationType.success if run.status.value == "success" else NotificationType.error
        notify_user(
            db,
            user_id,
            title=f"Script run {status_label}",
            message=f"Your run of '{script.name}' finished with status {status_label}.",
            link=f"/runs/{run.id}",
            ntype=ntype,
        )
    finally:
        db.close()
