from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.api.router import api_router
from app.core.config import settings
from app.deps.minio.minio_init import init_minio_bucket
from app.utils.health import check_database, check_minio

@asynccontextmanager
async def lifespan(_: FastAPI):
    init_minio_bucket()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.APP_DEBUG,
    lifespan=lifespan,
)
app.include_router(api_router)

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
