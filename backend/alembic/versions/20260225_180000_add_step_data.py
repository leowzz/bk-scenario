"""add step_data column to execution_steps

Revision ID: c3e1a902b8d5
Revises: 7b6f2d38a1f4
Create Date: 2026-02-25 18:00:00
"""
from __future__ import annotations

import sqlalchemy as sa
import sqlmodel
from alembic import op


# revision identifiers, used by Alembic.
revision = "c3e1a902b8d5"
down_revision = "7b6f2d38a1f4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "execution_steps",
        sa.Column("step_data", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("execution_steps", "step_data")
