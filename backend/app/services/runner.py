from __future__ import annotations

import subprocess
import tempfile
import uuid
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.run import RunStatus, ScriptRun
from app.models.script import Script, ScriptStatus
from app.models.user import User
from app.services.credentials_service import (
    build_cli_args,
    load_user_credentials_for_script,
    redact_secrets,
    utcnow,
    validate_run_inputs,
)
from app.services.storage import get_storage, run_log_key


class RunnerError(Exception):
    pass


def execute_script_run(db: Session, run: ScriptRun, script: Script, user: User) -> ScriptRun:
    if script.status != ScriptStatus.active:
        raise RunnerError("Script is not active")
    if not script.script_s3_key:
        raise RunnerError("Script has not been published to storage")

    env, creds_used, missing = load_user_credentials_for_script(db, user.id, script)
    if missing:
        raise RunnerError(f"Missing required credentials: {', '.join(missing)}")

    storage = get_storage()
    try:
        script_content = storage.get_text(script.script_s3_key)
    except FileNotFoundError as e:
        raise RunnerError("Script file not found in storage") from e

    try:
        validated_inputs = validate_run_inputs(run.input_snapshot or {}, script.input_schema or {})
    except ValueError as e:
        run.status = RunStatus.failed
        run.error_message = str(e)
        run.finished_at = utcnow()
        db.commit()
        return run

    run.input_snapshot = validated_inputs
    run.status = RunStatus.running
    run.started_at = utcnow()
    run.credentials_used = creds_used
    db.commit()

    from app.core.config import get_settings

    settings = get_settings()
    timeout = script.timeout_seconds or settings.script_run_timeout_seconds

    stdout_text = ""
    stderr_text = ""
    exit_code: int | None = None
    error_message: str | None = None

    try:
        cli_args = build_cli_args(validated_inputs, script.input_schema or {})

        with tempfile.TemporaryDirectory() as tmpdir:
            script_path = Path(tmpdir) / "main.py"
            script_path.write_text(script_content, encoding="utf-8")

            proc_env = {**{k: str(v) for k, v in env.items()}}
            proc = subprocess.run(
                ["python3", str(script_path), *cli_args],
                capture_output=True,
                text=True,
                timeout=timeout,
                env={**_safe_base_env(), **proc_env},
                cwd=tmpdir,
            )
            stdout_text = proc.stdout or ""
            stderr_text = proc.stderr or ""
            exit_code = proc.returncode

    except subprocess.TimeoutExpired:
        run.status = RunStatus.failed
        error_message = f"Script timed out after {timeout} seconds"
        stderr_text = error_message
        exit_code = -1
    except ValueError as e:
        run.status = RunStatus.failed
        error_message = str(e)
        stderr_text = error_message
        exit_code = -1
    except Exception as e:
        run.status = RunStatus.failed
        error_message = str(e)
        stderr_text = error_message
        exit_code = -1
    else:
        run.status = RunStatus.success if exit_code == 0 else RunStatus.failed
        if exit_code != 0:
            error_message = f"Script exited with code {exit_code}"

    stdout_redacted = redact_secrets(stdout_text, env, list(env.keys()))
    stderr_redacted = redact_secrets(stderr_text, env, list(env.keys()))

    run_id = str(run.id)
    stdout_key = run_log_key(run_id, "stdout")
    stderr_key = run_log_key(run_id, "stderr")
    storage.put_text(stdout_key, stdout_redacted)
    storage.put_text(stderr_key, stderr_redacted)

    run.stdout_s3_key = stdout_key
    run.stderr_s3_key = stderr_key
    run.exit_code = exit_code
    run.error_message = error_message
    run.finished_at = utcnow()
    db.commit()
    db.refresh(run)
    return run


def _safe_base_env() -> dict[str, str]:
    import os

    allowed = {"PATH", "HOME", "LANG", "LC_ALL", "PYTHONIOENCODING", "PYTHONUNBUFFERED"}
    return {k: v for k, v in os.environ.items() if k in allowed or k.startswith("LC_")}


def create_pending_run(
    db: Session,
    script: Script,
    user: User,
    inputs: dict,
    is_test_run: bool = False,
) -> ScriptRun:
    run = ScriptRun(
        user_id=user.id,
        script_id=script.id,
        script_version=script.approved_version or 1,
        status=RunStatus.pending,
        is_test_run=is_test_run,
        input_snapshot=inputs or {},
        credentials_used=[],
        username_snapshot=user.username,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def create_and_execute_run(
    db: Session,
    script: Script,
    user: User,
    inputs: dict,
    is_test_run: bool = False,
) -> ScriptRun:
    run = create_pending_run(db, script, user, inputs, is_test_run=is_test_run)
    return execute_script_run(db, run, script, user)
