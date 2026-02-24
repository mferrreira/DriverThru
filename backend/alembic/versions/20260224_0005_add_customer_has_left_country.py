"""add has_left_country flag to customers

Revision ID: 20260224_0005
Revises: 20260213_0004
Create Date: 2026-02-24 12:00:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260224_0005"
down_revision = "20260213_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "customers",
        sa.Column("has_left_country", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("customers", "has_left_country")
