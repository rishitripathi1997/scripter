from __future__ import annotations

import json
import uuid

import boto3
from botocore.exceptions import ClientError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.encryption import decrypt_credential
from app.models.credential import UserCredential

AWS_STS_CONFIG_KEY = "AWS_STS_CONFIG"
AWS_KEYS = ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN")


def load_aws_sts_env(db: Session, user_id: uuid.UUID) -> dict[str, str]:
    """If user has AWS_STS_CONFIG, assume role and return temporary AWS credentials."""
    row = (
        db.query(UserCredential)
        .filter(
            UserCredential.user_id == user_id,
            UserCredential.credential_key == AWS_STS_CONFIG_KEY,
        )
        .first()
    )
    if not row:
        return {}

    try:
        config = json.loads(decrypt_credential(str(user_id), AWS_STS_CONFIG_KEY, row.ciphertext))
    except (json.JSONDecodeError, KeyError):
        return {}

    role_arn = config.get("role_arn")
    if not role_arn:
        return {}

    settings = get_settings()
    session_name = config.get("session_name") or f"connectx-{user_id}"
    external_id = config.get("external_id")

    sts_kwargs: dict = {"region_name": settings.aws_region}
    if settings.s3_endpoint_url:
        sts_kwargs["endpoint_url"] = settings.s3_endpoint_url

    sts = boto3.client("sts", **sts_kwargs)
    assume_kwargs: dict = {
        "RoleArn": role_arn,
        "RoleSessionName": session_name[:64],
        "DurationSeconds": min(int(config.get("duration_seconds", 3600)), 43200),
    }
    if external_id:
        assume_kwargs["ExternalId"] = external_id

    try:
        resp = sts.assume_role(**assume_kwargs)
    except ClientError as e:
        raise RuntimeError(f"AWS STS AssumeRole failed: {e.response['Error']['Message']}") from e

    creds = resp["Credentials"]
    return {
        "AWS_ACCESS_KEY_ID": creds["AccessKeyId"],
        "AWS_SECRET_ACCESS_KEY": creds["SecretAccessKey"],
        "AWS_SESSION_TOKEN": creds["SessionToken"],
    }


def merge_aws_credentials(env: dict[str, str], sts_env: dict[str, str]) -> dict[str, str]:
    """STS temporary credentials override static AWS keys when present."""
    if not sts_env:
        return env
    merged = dict(env)
    for key in AWS_KEYS:
        if key in sts_env:
            merged[key] = sts_env[key]
    return merged
