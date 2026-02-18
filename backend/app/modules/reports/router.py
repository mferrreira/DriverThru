from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.modules.reports.service import build_all_customers_csv, build_expiring_licenses_csv

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/customers.csv")
def export_all_customers_csv(db: Session = Depends(get_db)) -> Response:
    content, filename = build_all_customers_csv(db)
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/licenses-expiring.csv")
def export_expiring_licenses_csv(
    db: Session = Depends(get_db),
    months_ahead: int = Query(default=3, ge=1, le=12),
) -> Response:
    content, filename = build_expiring_licenses_csv(db, months_ahead=months_ahead)
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
