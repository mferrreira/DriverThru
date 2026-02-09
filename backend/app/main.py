from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.deps.minio.minio_init import init_minio_bucket
from app.utils.health import check_database, check_minio
import app.core.database

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_minio_bucket()
    yield

app = FastAPI(lifespan=lifespan)

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