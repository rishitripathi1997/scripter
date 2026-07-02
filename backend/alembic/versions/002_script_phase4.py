"""Add script timeout and deprecation fields.

Revision ID: 002_script_phase4
Revises: 001_baseline
Create Date: 2025-07-02
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "002_script_phase4"
down_revision: Union[str, None] = "001_baseline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(table: str, column: str) -> bool:
    bind = op.get_bind()
    if not inspect(bind).has_table(table):
        return False
    return column in {c["name"] for c in inspect(bind).get_columns(table)}


def upgrade() -> None:
    if not _has_column("scripts", "timeout_seconds"):
        op.add_column("scripts", sa.Column("timeout_seconds", sa.Integer(), nullable=True))
    if not _has_column("scripts", "deprecated_at"):
        op.add_column("scripts", sa.Column("deprecated_at", sa.DateTime(timezone=True), nullable=True))
    if not _has_column("scripts", "deprecation_reason"):
        op.add_column("scripts", sa.Column("deprecation_reason", sa.Text(), nullable=True))


def downgrade() -> None:
    if _has_column("scripts", "deprecation_reason"):
        op.drop_column("scripts", "deprecation_reason")
    if _has_column("scripts", "deprecated_at"):
        op.drop_column("scripts", "deprecated_at")
    if _has_column("scripts", "timeout_seconds"):
        op.drop_column("scripts", "timeout_seconds")
