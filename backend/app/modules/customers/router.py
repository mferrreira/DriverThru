from __future__ import annotations

from fastapi import APIRouter

from app.modules.customers.routers.brazil_licenses import router as brazil_licenses_router
from app.modules.customers.routers.customers import router as customers_router
from app.modules.customers.routers.nj_licenses import router as nj_licenses_router
from app.modules.customers.routers.passports import router as passports_router

router = APIRouter(tags=["customers"])
router.include_router(customers_router, prefix="/customers")
router.include_router(nj_licenses_router, prefix="/customers")
router.include_router(brazil_licenses_router, prefix="/customers")
router.include_router(passports_router, prefix="/customers")
