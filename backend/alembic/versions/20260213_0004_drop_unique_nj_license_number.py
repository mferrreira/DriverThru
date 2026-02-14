"""drop unique constraint from nj license number

Revision ID: 20260213_0004
Revises: 20260213_0003
Create Date: 2026-02-13 15:15:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260213_0004"
down_revision = "20260213_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    unique_constraints = inspector.get_unique_constraints("nj_driver_licenses")
    for constraint in unique_constraints:
        columns = constraint.get("column_names") or []
        name = constraint.get("name")
        if name and columns == ["license_number_encrypted"]:
            op.drop_constraint(name, "nj_driver_licenses", type_="unique")


def downgrade() -> None:
    op.create_unique_constraint(
        "uq_nj_driver_licenses_license_number_encrypted",
        "nj_driver_licenses",
        ["license_number_encrypted"],
    )
