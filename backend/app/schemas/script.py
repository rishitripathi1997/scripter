from datetime import datetime

from pydantic import BaseModel, Field


class InputFieldSchema(BaseModel):
    name: str
    label: str
    type: str = "text"
    required: bool = False
    default: str | bool | int | None = None
    options: list[str] | None = None


class InputSchema(BaseModel):
    inputs: list[InputFieldSchema] = Field(default_factory=list)


class CredentialRequirements(BaseModel):
    required: list[str] = Field(default_factory=list)
    optional: list[str] = Field(default_factory=list)


class ScriptSummary(BaseModel):
    id: str
    name: str
    slug: str
    description: str | None
    status: str
    input_schema: dict
    credential_requirements: dict
    approved_version: int
    published_at: datetime | None
    can_run: bool | None = None
    run_restricted: bool = False
    timeout_seconds: int | None = None
    deprecated_at: datetime | None = None
    deprecation_reason: str | None = None

    model_config = {"from_attributes": True}


class ProposalCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    slug: str = Field(min_length=1, max_length=128, pattern=r"^[a-z0-9-]+$")
    description: str | None = None
    script_content: str = Field(min_length=1)
    input_schema: InputSchema
    credential_requirements: CredentialRequirements = Field(default_factory=CredentialRequirements)
    change_summary: str | None = None
    timeout_seconds: int | None = Field(default=None, ge=30, le=86400)


class ProposalUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    script_content: str | None = None
    input_schema: InputSchema | None = None
    credential_requirements: CredentialRequirements | None = None
    change_summary: str | None = None


class ReviewActionRequest(BaseModel):
    notes: str | None = None
    reason: str | None = None


class ScriptPermissionsUpdate(BaseModel):
    user_ids: list[str] = []
    roles: list[str] = []


class ScriptPermissionsResponse(BaseModel):
    script_id: str
    restricted: bool
    user_ids: list[str]
    roles: list[str]


class ScriptSettingsUpdate(BaseModel):
    timeout_seconds: int | None = Field(default=None, ge=30, le=86400)


class DeprecateScriptRequest(BaseModel):
    reason: str = Field(min_length=1)
