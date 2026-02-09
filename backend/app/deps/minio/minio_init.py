from app.deps.minio.minio_client import get_minio_client
from app.core.config import settings

def init_minio_bucket():
    client = get_minio_client()

    if not client.bucket_exists(settings.MINIO_BUCKET):
        client.make_bucket(settings.MINIO_BUCKET)