from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Index, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ExpirationNotification(Base):
    __tablename__ = "expiration_notifications"
    __table_args__ = (
        UniqueConstraint(
            "document_type",
            "source_document_id",
            name="uq_expiration_notifications_document_ref",
        ),
        Index("ix_expiration_notifications_customer_id", "customer_id"),
        Index("ix_expiration_notifications_notified_at", "notified_at"),
        Index("ix_expiration_notifications_expiration_date", "expiration_date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    document_type: Mapped[str] = mapped_column(String(40), nullable=False)
    source_document_id: Mapped[int] = mapped_column(Integer, nullable=False)
    expiration_date: Mapped[date] = mapped_column(Date, nullable=False)
    notified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
