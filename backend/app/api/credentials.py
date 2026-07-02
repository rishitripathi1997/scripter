from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, DbSession
from app.core.encryption import decrypt_credential, encrypt_credential, mask_secret
from app.models.credential import UserCredential
from app.schemas.credential import AwsStsConfig, CredentialMetadata, CredentialUpsert
from app.services.aws_sts import AWS_STS_CONFIG_KEY

router = APIRouter(prefix="/credentials", tags=["credentials"])


def _metadata_for_row(user_id: str, row: UserCredential) -> CredentialMetadata:
    if row.credential_key == AWS_STS_CONFIG_KEY:
        try:
            import json

            data = json.loads(decrypt_credential(user_id, row.credential_key, row.ciphertext))
            role = data.get("role_arn", "")
            hint = f"STS Role {mask_secret(role)}" if role else "STS configured"
        except Exception:
            hint = "STS configured"
        return CredentialMetadata(
            credential_key=row.credential_key,
            masked_hint=hint,
            kind="aws_sts",
            expires_at=row.expires_at,
            updated_at=row.updated_at,
        )

    plaintext = decrypt_credential(user_id, row.credential_key, row.ciphertext)
    return CredentialMetadata(
        credential_key=row.credential_key,
        masked_hint=mask_secret(plaintext),
        kind="static",
        expires_at=row.expires_at,
        updated_at=row.updated_at,
    )


@router.get("", response_model=list[CredentialMetadata])
def list_credentials(db: DbSession, current_user: CurrentUser) -> list[CredentialMetadata]:
    rows = (
        db.query(UserCredential)
        .filter(UserCredential.user_id == current_user.id)
        .order_by(UserCredential.credential_key)
        .all()
    )
    return [_metadata_for_row(str(current_user.id), row) for row in rows]


@router.put("/aws-sts", response_model=CredentialMetadata)
def upsert_aws_sts(body: AwsStsConfig, db: DbSession, current_user: CurrentUser) -> CredentialMetadata:
    import json

    payload = json.dumps(body.model_dump())
    key = AWS_STS_CONFIG_KEY
    ciphertext = encrypt_credential(str(current_user.id), key, payload)
    row = (
        db.query(UserCredential)
        .filter(UserCredential.user_id == current_user.id, UserCredential.credential_key == key)
        .first()
    )
    if row:
        row.ciphertext = ciphertext
    else:
        row = UserCredential(user_id=current_user.id, credential_key=key, ciphertext=ciphertext)
        db.add(row)
    db.commit()
    db.refresh(row)
    return _metadata_for_row(str(current_user.id), row)


@router.put("/{credential_key}", response_model=CredentialMetadata)
def upsert_credential(
    credential_key: str,
    body: CredentialUpsert,
    db: DbSession,
    current_user: CurrentUser,
) -> CredentialMetadata:
    key = credential_key.strip().upper()
    if not key or len(key) > 128:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid credential key")
    if key == AWS_STS_CONFIG_KEY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use /credentials/aws-sts for STS configuration",
        )

    ciphertext = encrypt_credential(str(current_user.id), key, body.value)
    row = (
        db.query(UserCredential)
        .filter(
            UserCredential.user_id == current_user.id,
            UserCredential.credential_key == key,
        )
        .first()
    )
    if row:
        row.ciphertext = ciphertext
        row.expires_at = body.expires_at
    else:
        row = UserCredential(
            user_id=current_user.id,
            credential_key=key,
            ciphertext=ciphertext,
            expires_at=body.expires_at,
        )
        db.add(row)

    db.commit()
    db.refresh(row)
    return _metadata_for_row(str(current_user.id), row)


@router.delete("/{credential_key}", status_code=status.HTTP_204_NO_CONTENT)
def delete_credential(
    credential_key: str,
    db: DbSession,
    current_user: CurrentUser,
) -> None:
    key = credential_key.strip().upper()
    row = (
        db.query(UserCredential)
        .filter(
            UserCredential.user_id == current_user.id,
            UserCredential.credential_key == key,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credential not found")
    db.delete(row)
    db.commit()
