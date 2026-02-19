import logging

from app.core.config import settings
from app.deps.minio.minio_client import get_minio_client

logger = logging.getLogger(__name__)


def init_minio_bucket(*, strict: bool = False) -> bool:
    try:
        client = get_minio_client()
        if not client.bucket_exists(settings.MINIO_BUCKET):
            client.make_bucket(settings.MINIO_BUCKET)
        return True
    except Exception:
        if strict:
            raise
        logger.warning("MinIO is unavailable during startup. Continuing without bucket initialization.")
        return False
