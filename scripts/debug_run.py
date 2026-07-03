#!/usr/bin/env python3
"""Run inside the API container to debug script run failures."""

from app.db.session import SessionLocal
from app.models.script import Script
from app.models.user import User
from app.services.credentials_service import load_user_credentials_for_script
from app.services.runner import create_pending_run

SCRIPT_ID = "8fbad555-0e13-4d04-b6a7-d9ded86df9aa"

db = SessionLocal()
try:
    script = db.query(Script).filter(Script.id == SCRIPT_ID).first()
    user = db.query(User).filter(User.username == "admin").first()
    if not script or not user:
        print("FAIL: script or user not found")
        raise SystemExit(1)

    print(f"script={script.name!r} s3_key={script.script_s3_key!r}")

    try:
        _, used, missing = load_user_credentials_for_script(db, user.id, script)
        print(f"credentials ok used={used} missing={missing}")
    except Exception as exc:
        print(f"credentials FAIL: {exc}")
        raise

    try:
        run = create_pending_run(db, script, user, {})
        print(f"create_pending_run ok id={run.id} status={run.status.value}")
    except Exception as exc:
        print(f"create_pending_run FAIL: {exc}")
        raise

    try:
        from app.api.scripts import _run_summary

        summary = _run_summary(run, script)
        print(f"run_summary ok: {summary.model_dump()}")
    except Exception as exc:
        print(f"run_summary FAIL: {exc}")
        raise
finally:
    db.close()
