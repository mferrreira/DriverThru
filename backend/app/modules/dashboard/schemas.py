from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel


class DashboardSummaryResponse(BaseModel):
    customers_total: int
    documents_generated_today: int
    expiring_in_30_days: int
    expiring_today: int


DocumentKind = Literal["nj_driver_license", "brazil_driver_license", "passport"]


class DashboardPendingItem(BaseModel):
    customer_id: int
    customer_name: str
    document_type: DocumentKind
    source_document_id: int
    expiration_date: date
    days_until_expiration: int
    notified: bool
    notified_at: datetime | None = None


class DashboardPendingListResponse(BaseModel):
    items: list[DashboardPendingItem]
    total: int
    pending_count: int
    notified_count: int


class NotificationUpdateRequest(BaseModel):
    customer_id: int
    document_type: DocumentKind
    source_document_id: int
    expiration_date: date
    notified: bool
