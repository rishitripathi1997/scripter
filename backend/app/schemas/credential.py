from datetime import datetime

from pydantic import BaseModel, Field


class CredentialUpsert(BaseModel):
    value: str = Field(min_length=1)
    expires_at: datetime | None = None


class AwsStsConfig(BaseModel):
    role_arn: str = Field(min_length=1)
    external_id: str | None = None
    session_name: str | None = None
    duration_seconds: int = Field(default=3600, ge=900, le=43200)


class CredentialMetadata(BaseModel):
    credential_key: str
    masked_hint: str
    kind: str = "static"
    expires_at: datetime | None
    updated_at: datetime

    model_config = {"from_attributes": True}
