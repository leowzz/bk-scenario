"""add connectors and stored_data scope

Revision ID: 7b6f2d38a1f4
Revises: 389b3bf76691
Create Date: 2026-02-25 16:00:00
"""
from __future__ import annotations

import sqlalchemy as sa
import sqlmodel
from alembic import op


# revision identifiers, used by Alembic.
revision = "7b6f2d38a1f4"
down_revision = "389b3bf76691"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "connectors",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("type", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("config_encrypted", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("created_at", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("updated_at", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id", "name", name="uq_connectors_project_name"),
    )

    op.add_column(
        "stored_data",
        sa.Column("scope", sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default="rule"),
    )
    op.alter_column("stored_data", "scope", server_default=None)


def downgrade() -> None:
    op.drop_column("stored_data", "scope")
    op.drop_table("connectors")
