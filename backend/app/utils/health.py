from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.core.database import engine
from app.deps.minio.minio_client import get_minio_client

def check_database():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except SQLAlchemyError:
        return False


def check_minio():
    try:
        client = get_minio_client()
        return client.bucket_exists(settings.MINIO_BUCKET)
    except Exception:
        return False
