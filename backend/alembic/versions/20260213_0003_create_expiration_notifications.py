"""create expiration notifications table

Revision ID: 20260213_0003
Revises: 20260213_0002
Create Date: 2026-02-13 14:05:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260213_0003"
down_revision = "20260213_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "expiration_notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("customer_id", sa.Integer(), nullable=False),
        sa.Column("document_type", sa.String(length=40), nullable=False),
        sa.Column("source_document_id", sa.Integer(), nullable=False),
        sa.Column("expiration_date", sa.Date(), nullable=False),
        sa.Column("notified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("document_type", "source_document_id", name="uq_expiration_notifications_document_ref"),
    )
    op.create_index("ix_expiration_notifications_customer_id", "expiration_notifications", ["customer_id"], unique=False)
    op.create_index("ix_expiration_notifications_notified_at", "expiration_notifications", ["notified_at"], unique=False)
    op.create_index("ix_expiration_notifications_expiration_date", "expiration_notifications", ["expiration_date"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_expiration_notifications_expiration_date", table_name="expiration_notifications")
    op.drop_index("ix_expiration_notifications_notified_at", table_name="expiration_notifications")
    op.drop_index("ix_expiration_notifications_customer_id", table_name="expiration_notifications")
    op.drop_table("expiration_notifications")
