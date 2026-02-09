from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from minio import Minio
import os

from app.core.database import engine

def check_database():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except SQLAlchemyError:
        return False


def check_minio():
    try:
        client = Minio(
            os.getenv("MINIO_ENDPOINT").replace("http://", "").replace("https://", ""),
            access_key=os.getenv("MINIO_ROOT_USER"),
            secret_key=os.getenv("MINIO_ROOT_PASSWORD"),
            secure=os.getenv("MINIO_ENDPOINT", "").startswith("https"),
        )
        client.bucket_exists(os.getenv("MINIO_BUCKET"))
        return True
    except Exception:
        return False
