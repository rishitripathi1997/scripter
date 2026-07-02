from __future__ import annotations

import enum
import uuid

from sqlalchemy import Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class GranteeType(str, enum.Enum):
    user = "user"
    role = "role"


class ScriptRunPermission(Base):
    __tablename__ = "script_run_permissions"
    __table_args__ = (
        UniqueConstraint("script_id", "grantee_type", "grantee_value", name="uq_script_run_grantee"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    script_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("scripts.id", ondelete="CASCADE"))
    grantee_type: Mapped[GranteeType] = mapped_column(Enum(GranteeType))
    grantee_value: Mapped[str] = mapped_column(String(128))

    script: Mapped["Script"] = relationship(back_populates="run_permissions")


from app.models.script import Script  # noqa: E402
