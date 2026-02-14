from __future__ import annotations

from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.customers.models import BrazilDriverLicense, Customer, NJDriverLicense, Passport
from app.modules.dashboard.schemas import DashboardSummaryResponse

from .common import count_expiring_for_model, count_generated_documents_today, utc_today


def get_dashboard_summary(db: Session) -> DashboardSummaryResponse:
    today = utc_today()
    plus_30 = today + timedelta(days=30)

    customers_total = db.scalar(select(func.count(Customer.id)).where(Customer.active.is_(True))) or 0
    expiring_today = _count_expiring_documents(db=db, start=today, end=today)
    expiring_in_30_days = _count_expiring_documents(db=db, start=today + timedelta(days=1), end=plus_30)
    documents_generated_today = count_generated_documents_today()

    return DashboardSummaryResponse(
        customers_total=customers_total,
        documents_generated_today=documents_generated_today,
        expiring_in_30_days=expiring_in_30_days,
        expiring_today=expiring_today,
    )


def _count_expiring_documents(db: Session, start, end) -> int:
    return (
        count_expiring_for_model(db, model=NJDriverLicense, start=start, end=end)
        + count_expiring_for_model(db, model=BrazilDriverLicense, start=start, end=end)
        + count_expiring_for_model(db, model=Passport, start=start, end=end)
    )
