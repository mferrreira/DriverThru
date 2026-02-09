from minio import Minio
from app.core.config import settings

def get_minio_client() -> Minio:
    return Minio(
        settings.MINIO_ENDPOINT, 
        access_key=settings.MINIO_ROOT_USER,
        secret_key= settings.MINIO_ROOT_PASSWORD,
        secure=False #TODO: Mudar para True após habilitar HTTPS
    )