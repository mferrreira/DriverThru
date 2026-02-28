from __future__ import annotations

from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path
import re
from uuid import uuid4

from minio.commonconfig import CopySource
from minio.error import S3Error
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.deps.minio.minio_client import get_minio_client
from app.modules.customers.errors import CustomerDocumentFileNotFoundError, LicenseNotFoundError, PassportNotFoundError
from app.modules.customers.models import BrazilDriverLicense, NJDriverLicense, Passport

ALLOWED_DOCUMENT_FILE_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
    "application/pdf",
}
MAX_DOCUMENT_FILE_SIZE_BYTES = 20 * 1024 * 1024
DOC_FILES_PREFIX = "customer-doc-files"
STAGED_DOC_FILES_PREFIX = "staged-customer-doc-files"


def upload_nj_license_document_file(
    db: Session,
    customer_id: int,
    license_id: int,
    payload: bytes,
    file_name: str | None,
    content_type: str | None,
) -> NJDriverLicense:
    license_obj = _get_nj_license_or_404(db=db, customer_id=customer_id, license_id=license_id)
    object_key = _upload_document_file(
        owner_prefix="nj-license",
        customer_id=customer_id,
        record_id=license_id,
        payload=payload,
        file_name=file_name,
        content_type=content_type,
    )
    license_obj.document_file_object_key = object_key
    db.commit()
    db.refresh(license_obj)
    return license_obj


def upload_brazil_license_document_file(
    db: Session,
    customer_id: int,
    license_id: int,
    payload: bytes,
    file_name: str | None,
    content_type: str | None,
) -> BrazilDriverLicense:
    license_obj = _get_brazil_license_or_404(db=db, customer_id=customer_id, license_id=license_id)
    object_key = _upload_document_file(
        owner_prefix="brazil-license",
        customer_id=customer_id,
        record_id=license_id,
        payload=payload,
        file_name=file_name,
        content_type=content_type,
    )
    license_obj.document_file_object_key = object_key
    db.commit()
    db.refresh(license_obj)
    return license_obj


def upload_passport_document_file(
    db: Session,
    customer_id: int,
    passport_id: int,
    payload: bytes,
    file_name: str | None,
    content_type: str | None,
) -> Passport:
    passport = _get_passport_or_404(db=db, customer_id=customer_id, passport_id=passport_id)
    object_key = _upload_document_file(
        owner_prefix="passport",
        customer_id=customer_id,
        record_id=passport_id,
        payload=payload,
        file_name=file_name,
        content_type=content_type,
    )
    passport.document_file_object_key = object_key
    db.commit()
    db.refresh(passport)
    return passport


def get_nj_license_document_file(
    db: Session,
    customer_id: int,
    license_id: int,
) -> tuple[bytes, str, str]:
    license_obj = _get_nj_license_or_404(db=db, customer_id=customer_id, license_id=license_id)
    return _download_document_file(license_obj.document_file_object_key)


def get_brazil_license_document_file(
    db: Session,
    customer_id: int,
    license_id: int,
) -> tuple[bytes, str, str]:
    license_obj = _get_brazil_license_or_404(db=db, customer_id=customer_id, license_id=license_id)
    return _download_document_file(license_obj.document_file_object_key)


def get_passport_document_file(
    db: Session,
    customer_id: int,
    passport_id: int,
) -> tuple[bytes, str, str]:
    passport = _get_passport_or_404(db=db, customer_id=customer_id, passport_id=passport_id)
    return _download_document_file(passport.document_file_object_key)


def delete_nj_license_document_file(db: Session, customer_id: int, license_id: int) -> NJDriverLicense:
    license_obj = _get_nj_license_or_404(db=db, customer_id=customer_id, license_id=license_id)
    _delete_document_file(license_obj.document_file_object_key)
    license_obj.document_file_object_key = None
    db.commit()
    db.refresh(license_obj)
    return license_obj


def delete_brazil_license_document_file(db: Session, customer_id: int, license_id: int) -> BrazilDriverLicense:
    license_obj = _get_brazil_license_or_404(db=db, customer_id=customer_id, license_id=license_id)
    _delete_document_file(license_obj.document_file_object_key)
    license_obj.document_file_object_key = None
    db.commit()
    db.refresh(license_obj)
    return license_obj


def delete_passport_document_file(db: Session, customer_id: int, passport_id: int) -> Passport:
    passport = _get_passport_or_404(db=db, customer_id=customer_id, passport_id=passport_id)
    _delete_document_file(passport.document_file_object_key)
    passport.document_file_object_key = None
    db.commit()
    db.refresh(passport)
    return passport


def _upload_document_file(
    *,
    owner_prefix: str,
    customer_id: int,
    record_id: int,
    payload: bytes,
    file_name: str | None,
    content_type: str | None,
) -> str:
    safe_content_type = _resolve_content_type(file_name=file_name, content_type=content_type)
    if safe_content_type not in ALLOWED_DOCUMENT_FILE_CONTENT_TYPES:
        raise ValueError("Unsupported file type. Use image (JPG/PNG/WEBP/HEIC/HEIF) or PDF.")
    if not payload:
        raise ValueError("Document payload is empty.")
    if len(payload) > MAX_DOCUMENT_FILE_SIZE_BYTES:
        raise ValueError("Document file is too large. Maximum allowed is 20MB.")

    object_key = _build_document_object_key(
        owner_prefix=owner_prefix,
        customer_id=customer_id,
        record_id=record_id,
        file_name=file_name,
        content_type=safe_content_type,
    )
    client = get_minio_client()
    try:
        client.put_object(
            bucket_name=settings.MINIO_BUCKET,
            object_name=object_key,
            data=BytesIO(payload),
            length=len(payload),
            content_type=safe_content_type,
        )
    except S3Error as exc:
        raise ValueError("Could not upload document file right now. Please try again.") from exc
    return object_key


def upload_staged_document_file(
    *,
    customer_id: int,
    doc_type: str,
    payload: bytes,
    file_name: str | None,
    content_type: str | None,
) -> tuple[str, str, str]:
    safe_content_type = _resolve_content_type(file_name=file_name, content_type=content_type)
    if safe_content_type not in ALLOWED_DOCUMENT_FILE_CONTENT_TYPES:
        raise ValueError("Unsupported file type. Use image (JPG/PNG/WEBP/HEIC/HEIF) or PDF.")
    if not payload:
        raise ValueError("Document payload is empty.")
    if len(payload) > MAX_DOCUMENT_FILE_SIZE_BYTES:
        raise ValueError("Document file is too large. Maximum allowed is 20MB.")

    object_key = _build_staged_document_object_key(
        customer_id=customer_id,
        doc_type=doc_type,
        file_name=file_name,
        content_type=safe_content_type,
    )
    client = get_minio_client()
    try:
        client.put_object(
            bucket_name=settings.MINIO_BUCKET,
            object_name=object_key,
            data=BytesIO(payload),
            length=len(payload),
            content_type=safe_content_type,
        )
    except S3Error as exc:
        raise ValueError("Could not upload document file right now. Please try again.") from exc
    return object_key, safe_content_type, Path(object_key).name


def get_staged_document_file(customer_id: int, doc_type: str, object_key: str) -> tuple[bytes, str, str]:
    _assert_staged_key(customer_id=customer_id, doc_type=doc_type, object_key=object_key)
    return _download_document_file(object_key)


def delete_staged_document_file(customer_id: int, doc_type: str, object_key: str) -> None:
    _assert_staged_key(customer_id=customer_id, doc_type=doc_type, object_key=object_key)
    _delete_document_file(object_key)


def finalize_staged_document_file_for_nj_license(
    *,
    customer_id: int,
    license_id: int,
    staged_object_key: str,
) -> str:
    return _finalize_staged_document_file(
        customer_id=customer_id,
        doc_type="nj-license",
        record_id=license_id,
        owner_prefix="nj-license",
        staged_object_key=staged_object_key,
    )


def finalize_staged_document_file_for_brazil_license(
    *,
    customer_id: int,
    license_id: int,
    staged_object_key: str,
) -> str:
    return _finalize_staged_document_file(
        customer_id=customer_id,
        doc_type="brazil-license",
        record_id=license_id,
        owner_prefix="brazil-license",
        staged_object_key=staged_object_key,
    )


def finalize_staged_document_file_for_passport(
    *,
    customer_id: int,
    passport_id: int,
    staged_object_key: str,
) -> str:
    return _finalize_staged_document_file(
        customer_id=customer_id,
        doc_type="passport",
        record_id=passport_id,
        owner_prefix="passport",
        staged_object_key=staged_object_key,
    )


def _finalize_staged_document_file(
    *,
    customer_id: int,
    doc_type: str,
    record_id: int,
    owner_prefix: str,
    staged_object_key: str,
) -> str:
    _assert_staged_key(customer_id=customer_id, doc_type=doc_type, object_key=staged_object_key)
    client = get_minio_client()
    try:
        stat = client.stat_object(settings.MINIO_BUCKET, staged_object_key)
        content_type = (getattr(stat, "content_type", None) or "application/octet-stream").strip().lower()
    except S3Error as exc:
        raise CustomerDocumentFileNotFoundError(f"Staged document file not found: {staged_object_key}") from exc

    final_key = _build_document_object_key(
        owner_prefix=owner_prefix,
        customer_id=customer_id,
        record_id=record_id,
        file_name=Path(staged_object_key).name,
        content_type=content_type,
    )
    try:
        client.copy_object(
            bucket_name=settings.MINIO_BUCKET,
            object_name=final_key,
            source=CopySource(settings.MINIO_BUCKET, staged_object_key),
        )
        client.remove_object(settings.MINIO_BUCKET, staged_object_key)
    except S3Error as exc:
        raise ValueError("Could not finalize document file upload right now. Please try again.") from exc
    return final_key


def _download_document_file(object_key: str | None) -> tuple[bytes, str, str]:
    if not object_key:
        raise CustomerDocumentFileNotFoundError("No document file uploaded")
    if not (object_key.startswith(f"{DOC_FILES_PREFIX}/") or object_key.startswith(f"{STAGED_DOC_FILES_PREFIX}/")):
        raise CustomerDocumentFileNotFoundError("Unsupported document file path")

    client = get_minio_client()
    response = None
    try:
        stat = client.stat_object(settings.MINIO_BUCKET, object_key)
        content_type = (getattr(stat, "content_type", None) or "application/octet-stream").strip()
        response = client.get_object(settings.MINIO_BUCKET, object_key)
        payload = response.read()
    except S3Error as exc:
        raise CustomerDocumentFileNotFoundError(f"Document file not found: {object_key}") from exc
    finally:
        if response is not None:
            response.close()
            response.release_conn()
    return payload, content_type, Path(object_key).name


def _delete_document_file(object_key: str | None) -> None:
    if not object_key:
        raise CustomerDocumentFileNotFoundError("No document file uploaded")
    if not (object_key.startswith(f"{DOC_FILES_PREFIX}/") or object_key.startswith(f"{STAGED_DOC_FILES_PREFIX}/")):
        raise CustomerDocumentFileNotFoundError("Unsupported document file path")
    client = get_minio_client()
    try:
        client.remove_object(settings.MINIO_BUCKET, object_key)
    except S3Error as exc:
        code = (getattr(exc, "code", None) or "").lower()
        if code not in {"nosuchkey", "nosuchobject", "notfound"}:
            raise ValueError("Could not delete document file right now. Please try again.") from exc


def _build_document_object_key(
    *,
    owner_prefix: str,
    customer_id: int,
    record_id: int,
    file_name: str | None,
    content_type: str,
) -> str:
    stamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
    suffix = uuid4().hex[:10]
    ext = _pick_extension(file_name=file_name, content_type=content_type)
    return f"{DOC_FILES_PREFIX}/{owner_prefix}/{customer_id}/{record_id}/{stamp}_{suffix}.{ext}"


def _build_staged_document_object_key(
    *,
    customer_id: int,
    doc_type: str,
    file_name: str | None,
    content_type: str,
) -> str:
    stamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
    suffix = uuid4().hex[:10]
    ext = _pick_extension(file_name=file_name, content_type=content_type)
    return f"{STAGED_DOC_FILES_PREFIX}/{doc_type}/{customer_id}/{stamp}_{suffix}.{ext}"


def _assert_staged_key(*, customer_id: int, doc_type: str, object_key: str) -> None:
    expected_prefix = f"{STAGED_DOC_FILES_PREFIX}/{doc_type}/{customer_id}/"
    if not object_key.startswith(expected_prefix):
        raise CustomerDocumentFileNotFoundError("Unsupported staged document file path")


def _get_nj_license_or_404(db: Session, customer_id: int, license_id: int) -> NJDriverLicense:
    license_obj = db.scalar(select(NJDriverLicense).where(NJDriverLicense.id == license_id, NJDriverLicense.customer_id == customer_id))
    if license_obj is None:
        raise LicenseNotFoundError(f"NJ license {license_id} not found for customer {customer_id}")
    return license_obj


def _get_brazil_license_or_404(db: Session, customer_id: int, license_id: int) -> BrazilDriverLicense:
    license_obj = db.scalar(select(BrazilDriverLicense).where(BrazilDriverLicense.id == license_id, BrazilDriverLicense.customer_id == customer_id))
    if license_obj is None:
        raise LicenseNotFoundError(f"Brazil license {license_id} not found for customer {customer_id}")
    return license_obj


def _get_passport_or_404(db: Session, customer_id: int, passport_id: int) -> Passport:
    passport = db.scalar(select(Passport).where(Passport.id == passport_id, Passport.customer_id == customer_id))
    if passport is None:
        raise PassportNotFoundError(f"Passport {passport_id} not found for customer {customer_id}")
    return passport


def _pick_extension(file_name: str | None, content_type: str) -> str:
    if file_name:
        suffix = Path(file_name).suffix.lower().lstrip(".")
        if suffix in {"jpg", "jpeg", "png", "webp", "heic", "heif", "pdf"}:
            return "jpg" if suffix == "jpeg" else suffix

    by_content_type = {
        "image/png": "png",
        "image/webp": "webp",
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/heic": "heic",
        "image/heif": "heif",
        "application/pdf": "pdf",
    }
    if content_type in by_content_type:
        return by_content_type[content_type]
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
    if suffix == ".pdf":
        return "application/pdf"
    return candidate
