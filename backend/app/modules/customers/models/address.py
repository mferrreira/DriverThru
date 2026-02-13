from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

from .enums import AddressType
from .mixins import TimestampMixin

if TYPE_CHECKING:
    from .customer import Customer


class CustomerAddress(TimestampMixin, Base):
    __tablename__ = "customer_addresses"
    __table_args__ = (
        UniqueConstraint("customer_id", "address_type", name="uq_customer_address_type"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    customer_id: Mapped[int] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    address_type: Mapped[AddressType] = mapped_column(
        Enum(AddressType, native_enum=False),
        nullable=False,
    )
    street: Mapped[str] = mapped_column(String(255), nullable=False)
    apt: Mapped[str | None] = mapped_column(String(30))
    city: Mapped[str] = mapped_column(String(120), nullable=False)
    state: Mapped[str] = mapped_column(String(2), nullable=False)
    zip_code: Mapped[str] = mapped_column(String(10), nullable=False)
    county: Mapped[str | None] = mapped_column(String(120))

    customer: Mapped[Customer] = relationship(back_populates="addresses")
