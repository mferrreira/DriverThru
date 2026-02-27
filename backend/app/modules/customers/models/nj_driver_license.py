from __future__ import annotations

from datetime import date

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

from .enums import NJEndorsementCode, NJLicenseClass, NJRestrictionCode
from .mixins import TimestampMixin
from .customer import Customer


class NJDriverLicense(TimestampMixin, Base):
    __tablename__ = "nj_driver_licenses"
    __table_args__ = (
        CheckConstraint(
            "expiration_date IS NULL OR issue_date IS NULL OR expiration_date >= issue_date",
            name="ck_nj_dl_dates_valid",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    customer_id: Mapped[int] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    license_number_encrypted: Mapped[str | None] = mapped_column(Text)
    document_file_object_key: Mapped[str | None] = mapped_column(String(255))
    issue_date: Mapped[date | None] = mapped_column(Date)
    expiration_date: Mapped[date | None] = mapped_column(Date)
    license_class: Mapped[NJLicenseClass | None] = mapped_column(
        Enum(NJLicenseClass, native_enum=False),
    )
    is_current: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    customer: Mapped[Customer] = relationship(back_populates="nj_driver_licenses")
    endorsements: Mapped[list[NJDriverLicenseEndorsement]] = relationship(
        back_populates="nj_driver_license",
        cascade="all, delete-orphan",
    )
    restrictions: Mapped[list[NJDriverLicenseRestriction]] = relationship(
        back_populates="nj_driver_license",
        cascade="all, delete-orphan",
    )


class NJDriverLicenseEndorsement(TimestampMixin, Base):
    __tablename__ = "nj_driver_license_endorsements"
    __table_args__ = (
        UniqueConstraint("nj_driver_license_id", "code", name="uq_nj_dl_endorsement_code"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nj_driver_license_id: Mapped[int] = mapped_column(
        ForeignKey("nj_driver_licenses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    code: Mapped[NJEndorsementCode] = mapped_column(
        Enum(NJEndorsementCode, native_enum=False),
        nullable=False,
    )

    nj_driver_license: Mapped[NJDriverLicense] = relationship(back_populates="endorsements")


class NJDriverLicenseRestriction(TimestampMixin, Base):
    __tablename__ = "nj_driver_license_restrictions"
    __table_args__ = (
        UniqueConstraint("nj_driver_license_id", "code", name="uq_nj_dl_restriction_code"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nj_driver_license_id: Mapped[int] = mapped_column(
        ForeignKey("nj_driver_licenses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    code: Mapped[NJRestrictionCode] = mapped_column(
        Enum(
            NJRestrictionCode,
            native_enum=False,
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        nullable=False,
    )

    nj_driver_license: Mapped[NJDriverLicense] = relationship(back_populates="restrictions")
