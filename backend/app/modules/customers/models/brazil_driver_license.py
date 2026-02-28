from __future__ import annotations

from datetime import date

from sqlalchemy import Boolean, CheckConstraint, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

from .mixins import TimestampMixin
from .customer import Customer


class BrazilDriverLicense(TimestampMixin, Base):
    __tablename__ = "brazil_driver_licenses"
    __table_args__ = (
        CheckConstraint(
            "expiration_date IS NULL OR issue_date IS NULL OR expiration_date >= issue_date",
            name="ck_br_dl_dates_valid",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    customer_id: Mapped[int] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    document_file_object_key: Mapped[str | None] = mapped_column(String(255))
    identity_number: Mapped[str | None] = mapped_column(String(50))
    issuing_agency: Mapped[str | None] = mapped_column(String(120))
    issuing_state: Mapped[str | None] = mapped_column(String(2))
    cpf_encrypted: Mapped[str | None] = mapped_column(Text)
    father_name: Mapped[str | None] = mapped_column(String(255))
    mother_name: Mapped[str | None] = mapped_column(String(255))
    category: Mapped[str | None] = mapped_column(String(10))
    registry_number: Mapped[str | None] = mapped_column(String(50))
    expiration_date: Mapped[date | None] = mapped_column(Date)
    first_license_date: Mapped[date | None] = mapped_column(Date)
    observations: Mapped[str | None] = mapped_column(Text)
    issue_place: Mapped[str | None] = mapped_column(String(120))
    issue_date: Mapped[date | None] = mapped_column(Date)
    paper_number: Mapped[str | None] = mapped_column(String(50))
    issue_code: Mapped[str | None] = mapped_column(String(50))
    is_current: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    customer: Mapped[Customer] = relationship(back_populates="brazil_driver_licenses")
