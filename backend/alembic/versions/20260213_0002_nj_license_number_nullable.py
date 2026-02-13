"""make nj license number nullable

Revision ID: 20260213_0002
Revises: 20260213_0001
Create Date: 2026-02-13 12:35:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260213_0002"
down_revision = "20260213_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("nj_driver_licenses", "license_number_encrypted", existing_type=sa.Text(), nullable=True)


def downgrade() -> None:
    op.alter_column("nj_driver_licenses", "license_number_encrypted", existing_type=sa.Text(), nullable=False)
