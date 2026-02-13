"""create customer domain tables

Revision ID: 20260213_0001
Revises:
Create Date: 2026-02-13 07:00:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260213_0001"
down_revision = None
branch_labels = None
depends_on = None


address_type_enum = sa.Enum(
    "residential",
    "mailing",
    "out_of_state",
    name="addresstype",
    native_enum=False,
)
gender_enum = sa.Enum(
    "female",
    "male",
    "non_binary",
    "undisclosed",
    name="gender",
    native_enum=False,
)
nj_license_class_enum = sa.Enum(
    "A",
    "B",
    "C",
    "D",
    "E",
    "I",
    name="njlicenseclass",
    native_enum=False,
)
nj_endorsement_enum = sa.Enum(
    "M",
    "F",
    "H",
    "N",
    "P",
    "S",
    "T",
    "X",
    name="njendorsementcode",
    native_enum=False,
)
nj_restriction_enum = sa.Enum(
    "1",
    "2",
    "3",
    "4",
    "L",
    "P",
    name="njrestrictioncode",
    native_enum=False,
)


def upgrade() -> None:
    op.create_table(
        "customers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("customer_photo_object_key", sa.String(length=255), nullable=True),
        sa.Column("first_name", sa.String(length=120), nullable=False),
        sa.Column("middle_name", sa.String(length=120), nullable=True),
        sa.Column("last_name", sa.String(length=120), nullable=False),
        sa.Column("suffix", sa.String(length=30), nullable=True),
        sa.Column("phone_number", sa.String(length=30), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("date_of_birth", sa.Date(), nullable=False),
        sa.Column("has_no_ssn", sa.Boolean(), nullable=False),
        sa.Column("ssn_encrypted", sa.Text(), nullable=True),
        sa.Column("gender", gender_enum, nullable=True),
        sa.Column("eye_color", sa.String(length=30), nullable=True),
        sa.Column("weight_lbs", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("height_feet", sa.Integer(), nullable=True),
        sa.Column("height_inches", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.CheckConstraint(
            "(has_no_ssn = true AND ssn_encrypted IS NULL) OR (has_no_ssn = false AND ssn_encrypted IS NOT NULL)",
            name="ck_customers_ssn_presence",
        ),
        sa.CheckConstraint("height_feet IS NULL OR (height_feet >= 0 AND height_feet <= 8)", name="ck_customers_height_feet_range"),
        sa.CheckConstraint("height_inches IS NULL OR (height_inches >= 0 AND height_inches <= 11)", name="ck_customers_height_inches_range"),
        sa.CheckConstraint("weight_lbs IS NULL OR weight_lbs > 0", name="ck_customers_weight_positive"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_customers_date_of_birth", "customers", ["date_of_birth"], unique=False)
    op.create_index("ix_customers_email", "customers", ["email"], unique=False)
    op.create_index("ix_customers_name_lookup", "customers", ["last_name", "first_name"], unique=False)

    op.create_table(
        "brazil_driver_licenses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("customer_id", sa.Integer(), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("identity_number", sa.String(length=50), nullable=True),
        sa.Column("issuing_agency", sa.String(length=120), nullable=True),
        sa.Column("issuing_state", sa.String(length=2), nullable=True),
        sa.Column("cpf_encrypted", sa.Text(), nullable=True),
        sa.Column("father_name", sa.String(length=255), nullable=True),
        sa.Column("mother_name", sa.String(length=255), nullable=True),
        sa.Column("category", sa.String(length=10), nullable=True),
        sa.Column("registry_number", sa.String(length=50), nullable=True),
        sa.Column("expiration_date", sa.Date(), nullable=True),
        sa.Column("first_license_date", sa.Date(), nullable=True),
        sa.Column("observations", sa.Text(), nullable=True),
        sa.Column("issue_place", sa.String(length=120), nullable=True),
        sa.Column("issue_date", sa.Date(), nullable=True),
        sa.Column("paper_number", sa.String(length=50), nullable=True),
        sa.Column("issue_code", sa.String(length=50), nullable=True),
        sa.Column("is_current", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.CheckConstraint(
            "expiration_date IS NULL OR issue_date IS NULL OR expiration_date >= issue_date",
            name="ck_br_dl_dates_valid",
        ),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_brazil_driver_licenses_customer_id", "brazil_driver_licenses", ["customer_id"], unique=False)

    op.create_table(
        "customer_addresses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("customer_id", sa.Integer(), nullable=False),
        sa.Column("address_type", address_type_enum, nullable=False),
        sa.Column("street", sa.String(length=255), nullable=False),
        sa.Column("apt", sa.String(length=30), nullable=True),
        sa.Column("city", sa.String(length=120), nullable=False),
        sa.Column("state", sa.String(length=2), nullable=False),
        sa.Column("zip_code", sa.String(length=10), nullable=False),
        sa.Column("county", sa.String(length=120), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("customer_id", "address_type", name="uq_customer_address_type"),
    )
    op.create_index("ix_customer_addresses_customer_id", "customer_addresses", ["customer_id"], unique=False)

    op.create_table(
        "nj_driver_licenses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("customer_id", sa.Integer(), nullable=False),
        sa.Column("license_number_encrypted", sa.Text(), nullable=False),
        sa.Column("issue_date", sa.Date(), nullable=True),
        sa.Column("expiration_date", sa.Date(), nullable=True),
        sa.Column("license_class", nj_license_class_enum, nullable=True),
        sa.Column("is_current", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.CheckConstraint(
            "expiration_date IS NULL OR issue_date IS NULL OR expiration_date >= issue_date",
            name="ck_nj_dl_dates_valid",
        ),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("license_number_encrypted"),
    )
    op.create_index("ix_nj_driver_licenses_customer_id", "nj_driver_licenses", ["customer_id"], unique=False)

    op.create_table(
        "passports",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("customer_id", sa.Integer(), nullable=False),
        sa.Column("document_type", sa.String(length=50), nullable=True),
        sa.Column("issuing_country", sa.String(length=80), nullable=True),
        sa.Column("passport_number_encrypted", sa.Text(), nullable=False),
        sa.Column("surname", sa.String(length=120), nullable=False),
        sa.Column("given_name", sa.String(length=120), nullable=False),
        sa.Column("middle_name", sa.String(length=120), nullable=True),
        sa.Column("father_name", sa.String(length=255), nullable=True),
        sa.Column("mother_name", sa.String(length=255), nullable=True),
        sa.Column("nationality", sa.String(length=80), nullable=True),
        sa.Column("birth_place", sa.String(length=255), nullable=True),
        sa.Column("issue_date", sa.Date(), nullable=True),
        sa.Column("expiration_date", sa.Date(), nullable=True),
        sa.Column("issuing_authority", sa.String(length=120), nullable=True),
        sa.Column("is_current", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.CheckConstraint(
            "expiration_date IS NULL OR issue_date IS NULL OR expiration_date >= issue_date",
            name="ck_passports_dates_valid",
        ),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_passports_customer_id", "passports", ["customer_id"], unique=False)

    op.create_table(
        "nj_driver_license_endorsements",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nj_driver_license_id", sa.Integer(), nullable=False),
        sa.Column("code", nj_endorsement_enum, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["nj_driver_license_id"], ["nj_driver_licenses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("nj_driver_license_id", "code", name="uq_nj_dl_endorsement_code"),
    )
    op.create_index(
        "ix_nj_driver_license_endorsements_nj_driver_license_id",
        "nj_driver_license_endorsements",
        ["nj_driver_license_id"],
        unique=False,
    )

    op.create_table(
        "nj_driver_license_restrictions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nj_driver_license_id", sa.Integer(), nullable=False),
        sa.Column("code", nj_restriction_enum, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["nj_driver_license_id"], ["nj_driver_licenses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("nj_driver_license_id", "code", name="uq_nj_dl_restriction_code"),
    )
    op.create_index(
        "ix_nj_driver_license_restrictions_nj_driver_license_id",
        "nj_driver_license_restrictions",
        ["nj_driver_license_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_nj_driver_license_restrictions_nj_driver_license_id", table_name="nj_driver_license_restrictions")
    op.drop_table("nj_driver_license_restrictions")

    op.drop_index("ix_nj_driver_license_endorsements_nj_driver_license_id", table_name="nj_driver_license_endorsements")
    op.drop_table("nj_driver_license_endorsements")

    op.drop_index("ix_passports_customer_id", table_name="passports")
    op.drop_table("passports")

    op.drop_index("ix_nj_driver_licenses_customer_id", table_name="nj_driver_licenses")
    op.drop_table("nj_driver_licenses")

    op.drop_index("ix_customer_addresses_customer_id", table_name="customer_addresses")
    op.drop_table("customer_addresses")

    op.drop_index("ix_brazil_driver_licenses_customer_id", table_name="brazil_driver_licenses")
    op.drop_table("brazil_driver_licenses")

    op.drop_index("ix_customers_name_lookup", table_name="customers")
    op.drop_index("ix_customers_email", table_name="customers")
    op.drop_index("ix_customers_date_of_birth", table_name="customers")
    op.drop_table("customers")
