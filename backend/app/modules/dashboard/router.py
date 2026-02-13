from __future__ import annotations
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.modules.dashboard.schemas import (
    DashboardPendingListResponse,
    DashboardSummaryResponse,
    NotificationUpdateRequest,
)
from app.modules.dashboard.service import get_dashboard_summary, list_prioritized_pending, set_notification_status

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/summary", response_model=DashboardSummaryResponse)
def summary_route(db: Session = Depends(get_db)) -> DashboardSummaryResponse:
    return get_dashboard_summary(db)


@router.get("/pending", response_model=DashboardPendingListResponse)
def pending_route(
    db: Session = Depends(get_db),
    days_ahead: int = Query(default=30, ge=0, le=365),
    include_notified: bool = Query(default=True),
) -> DashboardPendingListResponse:
    return list_prioritized_pending(db=db, days_ahead=days_ahead, include_notified=include_notified)


@router.post("/pending/notify", status_code=status.HTTP_204_NO_CONTENT)
def pending_notify_route(payload: NotificationUpdateRequest, db: Session = Depends(get_db)) -> Response:
    set_notification_status(
        db=db,
        customer_id=payload.customer_id,
        document_type=payload.document_type,
        source_document_id=payload.source_document_id,
        expiration_date=payload.expiration_date,
        notified=payload.notified,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
