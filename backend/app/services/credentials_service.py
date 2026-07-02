from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.encryption import decrypt_credential
from app.models.credential import UserCredential
from app.models.script import Script
from app.services.aws_sts import AWS_KEYS, AWS_STS_CONFIG_KEY, load_aws_sts_env, merge_aws_credentials


def get_required_credential_keys(script: Script) -> list[str]:
    reqs = script.credential_requirements or {}
    return [k.upper() for k in reqs.get("required", [])]


def get_optional_credential_keys(script: Script) -> list[str]:
    reqs = script.credential_requirements or {}
    return [k.upper() for k in reqs.get("optional", [])]


def load_user_credentials_for_script(
    db: Session,
    user_id: uuid.UUID,
    script: Script,
) -> tuple[dict[str, str], list[str], list[str]]:
    """Returns (env_dict, keys_used, missing_required_keys)."""
    required = get_required_credential_keys(script)
    optional = get_optional_credential_keys(script)
    all_keys = list(dict.fromkeys(required + optional))

    rows = (
        db.query(UserCredential)
        .filter(
            UserCredential.user_id == user_id,
            UserCredential.credential_key.in_(all_keys + [AWS_STS_CONFIG_KEY]),
        )
        .all()
    )
    by_key = {row.credential_key: row for row in rows}

    has_sts = AWS_STS_CONFIG_KEY in by_key
    aws_required = [k for k in required if k in AWS_KEYS]

    missing = []
    for k in required:
        if k in AWS_KEYS and has_sts:
            continue
        if k not in by_key:
            missing.append(k)

    env: dict[str, str] = {}
    used: list[str] = []

    for key in all_keys:
        row = by_key.get(key)
        if not row:
            continue
        env[key] = decrypt_credential(str(user_id), key, row.ciphertext)
        used.append(key)

    if has_sts:
        try:
            sts_env = load_aws_sts_env(db, user_id)
            if sts_env:
                env = merge_aws_credentials(env, sts_env)
                used.append(AWS_STS_CONFIG_KEY)
                for aws_key in AWS_KEYS:
                    if aws_key in sts_env and aws_key not in used:
                        used.append(aws_key)
            elif aws_required:
                missing.extend(k for k in aws_required if k not in env and k not in missing)
        except RuntimeError:
            if aws_required:
                missing.extend(k for k in aws_required if k not in env and k not in missing)

    missing = list(dict.fromkeys(missing))
    return env, used, missing


def validate_run_inputs(inputs: dict, input_schema: dict) -> dict:
    schema_inputs = input_schema.get("inputs", [])
    validated: dict = {}
    errors: list[str] = []

    for field in schema_inputs:
        name = field.get("name")
        if not name:
            continue
        required = field.get("required", False)
        ftype = field.get("type", "text")
        value = inputs.get(name)

        if value is None or value == "":
            if required:
                errors.append(f"Missing required input: {name}")
            elif "default" in field:
                validated[name] = field["default"]
            continue

        if ftype == "boolean":
            if isinstance(value, bool):
                validated[name] = value
            elif isinstance(value, str):
                validated[name] = value.lower() in ("true", "1", "yes", "on")
            else:
                validated[name] = bool(value)
        elif ftype == "number":
            try:
                validated[name] = float(value) if "." in str(value) else int(value)
            except (TypeError, ValueError):
                errors.append(f"Invalid number for {name}")
        else:
            validated[name] = value

    if errors:
        raise ValueError("; ".join(errors))
    return validated


def build_cli_args(inputs: dict, input_schema: dict) -> list[str]:
    args: list[str] = []
    for field in input_schema.get("inputs", []):
        name = field["name"]
        if name not in inputs:
            continue
        value = inputs[name]
        ftype = field.get("type", "text")
        if ftype == "boolean":
            args.extend([f"--{name}", "true" if value else "false"])
        else:
            args.extend([f"--{name}", str(value)])
    return args


def redact_secrets(text: str, env: dict[str, str], extra_keys: list[str] | None = None) -> str:
    if not text:
        return text
    result = text
    for value in env.values():
        if value and len(value) >= 4:
            result = result.replace(value, "[REDACTED]")
    for key in extra_keys or []:
        pattern = re.compile(rf"({re.escape(key)}\s*[=:]\s*)(\S+)", re.IGNORECASE)
        result = pattern.sub(r"\1[REDACTED]", result)
    return result


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
