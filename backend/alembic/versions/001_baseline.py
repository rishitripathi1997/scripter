"""Baseline schema from SQLAlchemy models.

Revision ID: 001_baseline
Revises:
Create Date: 2025-07-02
"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import inspect

from app.db.base import Base
from app.models import (  # noqa: F401
    Notification,
    Script,
    ScriptReviewAction,
    ScriptRevision,
    ScriptRun,
    ScriptRunPermission,
    User,
    UserCredential,
    UserSession,
)

revision: str = "001_baseline"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind)


def downgrade() -> None:
    bind = op.get_bind()
    for table in reversed(Base.metadata.sorted_tables):
        if inspect(bind).has_table(table.name):
            op.drop_table(table.name)
