"""add instagram handle to customers

Revision ID: 20260227_0007
Revises: 20260226_0006
Create Date: 2026-02-27 21:40:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260227_0007"
down_revision = "20260226_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Postgres-safe idempotent add for environments that may already have this column.
    op.execute("ALTER TABLE customers ADD COLUMN IF NOT EXISTS instagram_handle VARCHAR(80)")


def downgrade() -> None:
    op.execute("ALTER TABLE customers DROP COLUMN IF EXISTS instagram_handle")

