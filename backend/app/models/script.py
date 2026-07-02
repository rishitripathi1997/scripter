import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ScriptStatus(str, enum.Enum):
    draft = "draft"
    pending_review = "pending_review"
    changes_requested = "changes_requested"
    rejected = "rejected"
    active = "active"
    deprecated = "deprecated"


class ReviewAction(str, enum.Enum):
    submit = "submit"
    approve = "approve"
    reject = "reject"
    request_changes = "request_changes"
    deprecate = "deprecate"


class Script(Base):
    __tablename__ = "scripts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(128))
    slug: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    script_s3_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    input_schema: Mapped[dict] = mapped_column(JSONB, default=dict)
    credential_requirements: Mapped[dict] = mapped_column(JSONB, default=dict)
    status: Mapped[ScriptStatus] = mapped_column(Enum(ScriptStatus), default=ScriptStatus.draft)
    proposed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    approved_version: Mapped[int] = mapped_column(Integer, default=0)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    timeout_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    deprecated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deprecation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    proposer: Mapped["User | None"] = relationship(foreign_keys=[proposed_by], back_populates="proposed_scripts")
    revisions: Mapped[list["ScriptRevision"]] = relationship(back_populates="script", cascade="all, delete-orphan")
    review_actions: Mapped[list["ScriptReviewAction"]] = relationship(
        back_populates="script", cascade="all, delete-orphan"
    )
    runs: Mapped[list["ScriptRun"]] = relationship(back_populates="script")
    run_permissions: Mapped[list["ScriptRunPermission"]] = relationship(
        back_populates="script", cascade="all, delete-orphan"
    )


class ScriptRevision(Base):
    __tablename__ = "script_revisions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    script_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("scripts.id", ondelete="CASCADE"))
    revision_number: Mapped[int] = mapped_column(Integer)
    script_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    manifest_snapshot: Mapped[dict] = mapped_column(JSONB, default=dict)
    submitted_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    change_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    script: Mapped[Script] = relationship(back_populates="revisions")


class ScriptReviewAction(Base):
    __tablename__ = "script_review_actions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    script_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("scripts.id", ondelete="CASCADE"))
    revision_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("script_revisions.id"), nullable=True
    )
    action: Mapped[ReviewAction] = mapped_column(Enum(ReviewAction))
    actor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    script: Mapped[Script] = relationship(back_populates="review_actions")


# Avoid circular import for type hints
from app.models.user import User  # noqa: E402
