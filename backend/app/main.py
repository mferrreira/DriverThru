from contextlib import asynccontextmanager

from fastapi import APIRouter, Depends, FastAPI
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import JSONResponse

from app.api.deps import get_current_user
from app.api.router import api_router
from app.core.config import settings
from app.deps.minio.minio_init import init_minio_bucket
from app.utils.health import check_database, check_minio

@asynccontextmanager
async def lifespan(_: FastAPI):
    init_minio_bucket(strict=settings.MINIO_STARTUP_STRICT)
    yield

app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.APP_DEBUG,
    root_path=settings.API_ROOT_PATH,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)
app.include_router(api_router)

docs_router = APIRouter(dependencies=[Depends(get_current_user)])


@docs_router.get("/docs", include_in_schema=False)
def protected_swagger():
    return get_swagger_ui_html(
        openapi_url=f"{settings.API_ROOT_PATH}/openapi.json",
        title=f"{settings.APP_NAME} - Swagger UI",
    )


@docs_router.get("/openapi.json", include_in_schema=False)
def protected_openapi():
    return JSONResponse(app.openapi())


app.include_router(docs_router)

@app.get("/health")
def healthcheck():
    db_ok = check_database()
    minio_ok = check_minio()

    if not db_ok or not minio_ok:
        return {
            "status": "degraded",
            "database": db_ok,
            "minio": minio_ok,
        }

    return {
        "status": "ok",
        "database": True,
        "minio": True,
    }
