from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Date, Enum, Index, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

from .enums import Gender
from .mixins import TimestampMixin

if TYPE_CHECKING:
    from .address import CustomerAddress
    from .brazil_driver_license import BrazilDriverLicense
    from .nj_driver_license import NJDriverLicense
    from .passport import Passport


class Customer(TimestampMixin, Base):
    __tablename__ = "customers"
    __table_args__ = (
        CheckConstraint(
            "(has_no_ssn = true AND ssn_encrypted IS NULL) "
            "OR (has_no_ssn = false AND ssn_encrypted IS NOT NULL)",
            name="ck_customers_ssn_presence",
        ),
        CheckConstraint("weight_lbs IS NULL OR weight_lbs > 0", name="ck_customers_weight_positive"),
        CheckConstraint(
            "height_feet IS NULL OR (height_feet >= 0 AND height_feet <= 8)",
            name="ck_customers_height_feet_range",
        ),
        CheckConstraint(
            "height_inches IS NULL OR (height_inches >= 0 AND height_inches <= 11)",
            name="ck_customers_height_inches_range",
        ),
        Index("ix_customers_name_lookup", "last_name", "first_name"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    customer_photo_object_key: Mapped[str | None] = mapped_column(String(255))
    first_name: Mapped[str] = mapped_column(String(120), nullable=False)
    middle_name: Mapped[str | None] = mapped_column(String(120))
    last_name: Mapped[str] = mapped_column(String(120), nullable=False)
    suffix: Mapped[str | None] = mapped_column(String(30))
    phone_number: Mapped[str | None] = mapped_column(String(30))
    email: Mapped[str | None] = mapped_column(String(255), index=True)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    has_left_country: Mapped[bool] = mapped_column(default=False, nullable=False)
    has_no_ssn: Mapped[bool] = mapped_column(default=False, nullable=False)
    ssn_encrypted: Mapped[str | None] = mapped_column(Text)
    gender: Mapped[Gender | None] = mapped_column(Enum(Gender, native_enum=False))
    eye_color: Mapped[str | None] = mapped_column(String(30))
    weight_lbs: Mapped[float | None] = mapped_column(Numeric(5, 2))
    height_feet: Mapped[int | None] = mapped_column(Integer)
    height_inches: Mapped[int | None] = mapped_column(Integer)

    addresses: Mapped[list[CustomerAddress]] = relationship(
        back_populates="customer",
        cascade="all, delete-orphan",
    )
    nj_driver_licenses: Mapped[list[NJDriverLicense]] = relationship(
        back_populates="customer",
        cascade="all, delete-orphan",
    )
    brazil_driver_licenses: Mapped[list[BrazilDriverLicense]] = relationship(
        back_populates="customer",
        cascade="all, delete-orphan",
    )
    passports: Mapped[list[Passport]] = relationship(
        back_populates="customer",
        cascade="all, delete-orphan",
    )
