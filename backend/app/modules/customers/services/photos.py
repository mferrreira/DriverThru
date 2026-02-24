from __future__ import annotations

from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path
import re
from uuid import uuid4

from minio.error import S3Error
from PIL import Image, ImageOps
from pillow_heif import register_heif_opener
from sqlalchemy.orm import Session

from app.core.config import settings
from app.deps.minio.minio_client import get_minio_client
from app.modules.customers.errors import CustomerPhotoNotFoundError
from app.modules.customers.models import Customer

from .customers import get_customer_or_404

ALLOWED_PHOTO_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
}
PHOTO_PREFIX = "customer-photos"
MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024
MAX_IMAGE_DIMENSION = 1800
OUTPUT_WEBP_QUALITY = 82

register_heif_opener()


def upload_customer_photo(
    db: Session,
    customer_id: int,
    payload: bytes,
    file_name: str | None,
    content_type: str | None,
) -> Customer:
    customer = get_customer_or_404(db=db, customer_id=customer_id)
    safe_content_type = _resolve_content_type(file_name=file_name, content_type=content_type)
    if safe_content_type not in ALLOWED_PHOTO_CONTENT_TYPES:
        raise ValueError("Unsupported file type. Use JPG, PNG, WEBP, HEIC, or HEIF.")
    if not payload:
        raise ValueError("Photo payload is empty.")
    if len(payload) > MAX_PHOTO_SIZE_BYTES:
        raise ValueError("Photo is too large. Maximum allowed is 5MB.")

    optimized_payload, optimized_content_type = _transcode_to_webp(payload, source_content_type=safe_content_type)
    object_key = _build_photo_object_key(
        customer_id=customer_id,
        file_name=file_name,
        content_type=optimized_content_type,
    )
    client = get_minio_client()
    try:
        client.put_object(
            bucket_name=settings.MINIO_BUCKET,
            object_name=object_key,
            data=BytesIO(optimized_payload),
            length=len(optimized_payload),
            content_type=optimized_content_type,
        )
    except S3Error as exc:
        raise ValueError("Could not upload photo right now. Please try again.") from exc

    customer.customer_photo_object_key = object_key
    db.commit()
    db.refresh(customer)
    return customer


def get_customer_photo(customer: Customer) -> tuple[bytes, str, str]:
    object_key = customer.customer_photo_object_key
    if not object_key:
        raise CustomerPhotoNotFoundError(f"Customer {customer.id} has no photo")
    if not object_key.startswith(f"{PHOTO_PREFIX}/"):
        raise CustomerPhotoNotFoundError("Unsupported photo path")

    client = get_minio_client()
    response = None
    try:
        stat = client.stat_object(settings.MINIO_BUCKET, object_key)
        content_type = (getattr(stat, "content_type", None) or "application/octet-stream").strip()
        response = client.get_object(settings.MINIO_BUCKET, object_key)
        payload = response.read()
    except S3Error as exc:
        raise CustomerPhotoNotFoundError(f"Photo not found: {object_key}") from exc
    finally:
        if response is not None:
            response.close()
            response.release_conn()
    return payload, content_type, Path(object_key).name


def delete_customer_photo(db: Session, customer_id: int) -> Customer:
    customer = get_customer_or_404(db=db, customer_id=customer_id)
    object_key = customer.customer_photo_object_key
    if not object_key:
        raise CustomerPhotoNotFoundError(f"Customer {customer.id} has no photo")
    if not object_key.startswith(f"{PHOTO_PREFIX}/"):
        raise CustomerPhotoNotFoundError("Unsupported photo path")

    client = get_minio_client()
    try:
        client.remove_object(settings.MINIO_BUCKET, object_key)
    except S3Error as exc:
        code = (getattr(exc, "code", None) or "").lower()
        if code not in {"nosuchkey", "nosuchobject", "notfound"}:
            raise ValueError("Could not delete photo right now. Please try again.") from exc

    customer.customer_photo_object_key = None
    db.commit()
    db.refresh(customer)
    return customer


def _build_photo_object_key(customer_id: int, file_name: str | None, content_type: str) -> str:
    now = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
    suffix = uuid4().hex[:10]
    ext = _pick_extension(file_name=file_name, content_type=content_type)
    return f"{PHOTO_PREFIX}/{customer_id}/{now}_{suffix}.{ext}"


def _pick_extension(file_name: str | None, content_type: str) -> str:
    if file_name:
        suffix = Path(file_name).suffix.lower().lstrip(".")
        if suffix in {"jpg", "jpeg", "png", "webp", "heic", "heif"}:
            return "jpg" if suffix == "jpeg" else suffix

    if content_type == "image/png":
        return "png"
    if content_type == "image/webp":
        return "webp"
    if content_type in {"image/jpeg", "image/jpg"}:
        return "jpg"
    if content_type == "image/heic":
        return "heic"
    if content_type == "image/heif":
        return "heif"

    cleaned = re.sub(r"[^a-z0-9]", "", content_type.split("/")[-1].lower())
    return cleaned or "bin"


def _resolve_content_type(file_name: str | None, content_type: str | None) -> str:
    candidate = (content_type or "").strip().lower()
    if candidate and candidate != "application/octet-stream":
        return candidate

    suffix = Path(file_name or "").suffix.lower()
    if suffix in {".jpg", ".jpeg"}:
        return "image/jpeg"
    if suffix == ".png":
        return "image/png"
    if suffix == ".webp":
        return "image/webp"
    if suffix == ".heic":
        return "image/heic"
    if suffix == ".heif":
        return "image/heif"
    return candidate


def _transcode_to_webp(payload: bytes, source_content_type: str) -> tuple[bytes, str]:
    try:
        with Image.open(BytesIO(payload)) as original:
            image = ImageOps.exif_transpose(original)
            width, height = image.size
            largest = max(width, height)
            if largest > MAX_IMAGE_DIMENSION:
                ratio = MAX_IMAGE_DIMENSION / float(largest)
                image = image.resize(
                    (max(1, int(width * ratio)), max(1, int(height * ratio))),
                    Image.Resampling.LANCZOS,
                )

            output_buffer = BytesIO()
            if image.mode not in {"RGB", "RGBA"}:
                image = image.convert("RGB")
            image.save(
                output_buffer,
                format="WEBP",
                quality=OUTPUT_WEBP_QUALITY,
                method=6,
                optimize=True,
            )
            return output_buffer.getvalue(), "image/webp"
    except Exception as exc:  # noqa: BLE001
        raise ValueError(
            f"Unsupported or corrupted image for conversion ({source_content_type})."
        ) from exc
