"""add document file object keys to licenses and passports

Revision ID: 20260226_0006
Revises: 20260224_0005
Create Date: 2026-02-26 18:00:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260226_0006"
down_revision = "20260224_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("nj_driver_licenses", sa.Column("document_file_object_key", sa.String(length=255), nullable=True))
    op.add_column("brazil_driver_licenses", sa.Column("document_file_object_key", sa.String(length=255), nullable=True))
    op.add_column("passports", sa.Column("document_file_object_key", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("passports", "document_file_object_key")
    op.drop_column("brazil_driver_licenses", "document_file_object_key")
    op.drop_column("nj_driver_licenses", "document_file_object_key")
