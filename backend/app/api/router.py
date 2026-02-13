from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse

from app.api.deps import get_current_user
from app.modules.auth.router import router as auth_router
from app.modules.customers.router import router as customers_router
from app.modules.dashboard.router import router as dashboard_router
from app.modules.documents.router import router as documents_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(documents_router, dependencies=[Depends(get_current_user)])
api_router.include_router(dashboard_router, dependencies=[Depends(get_current_user)])
api_router.include_router(customers_router, dependencies=[Depends(get_current_user)])

@api_router.get("/templates", include_in_schema=False, dependencies=[Depends(get_current_user)])
def templates_alias() -> RedirectResponse:
    return RedirectResponse(url="/documents/templates", status_code=307)

@api_router.get(
    "/templates/{template_key}/fields",
    include_in_schema=False,
    dependencies=[Depends(get_current_user)],
)
def template_fields_alias(template_key: str) -> RedirectResponse:
    return RedirectResponse(url=f"/documents/templates/{template_key}/fields", status_code=307)
