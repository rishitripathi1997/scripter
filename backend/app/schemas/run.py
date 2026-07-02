from datetime import datetime

from pydantic import BaseModel, Field


class RunCreate(BaseModel):
    inputs: dict = Field(default_factory=dict)


class RunLogs(BaseModel):
    stdout: str
    stderr: str


class RunSummary(BaseModel):
    id: str
    script_id: str
    script_name: str | None = None
    status: str
    is_test_run: bool
    input_snapshot: dict
    credentials_used: list
    username_snapshot: str
    started_at: datetime | None
    finished_at: datetime | None
    exit_code: int | None
    error_message: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
