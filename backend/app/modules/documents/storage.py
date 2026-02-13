from __future__ import annotations

from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path
import re

from minio.error import S3Error

from app.core.config import settings
from app.deps.minio.minio_client import get_minio_client
from app.modules.documents.errors import DocumentNotFoundError
from app.modules.documents.schemas import GeneratedDocumentItem, GeneratedDocumentListResponse, TemplateKey


def save_generated_document(customer_id: int, template_key: TemplateKey, payload: bytes) -> tuple[str, datetime]:
    now = datetime.now(UTC)
    object_key = (
        f"{settings.GENERATED_DOCUMENTS_PREFIX}/"
        f"{customer_id}/"
        f"{template_key}_{now.strftime('%Y%m%d_%H%M%S')}.pdf"
    )
    client = get_minio_client()
    client.put_object(
        bucket_name=settings.MINIO_BUCKET,
        object_name=object_key,
        data=BytesIO(payload),
        length=len(payload),
        content_type="application/pdf",
    )
    return object_key, now


def download_generated_document(object_key: str) -> tuple[bytes, str]:
    if not object_key.startswith(f"{settings.GENERATED_DOCUMENTS_PREFIX}/"):
        raise DocumentNotFoundError("Unsupported document path")

    client = get_minio_client()
    response = None
    try:
        response = client.get_object(settings.MINIO_BUCKET, object_key)
        payload = response.read()
    except S3Error as exc:
        raise DocumentNotFoundError(f"Document not found: {object_key}") from exc
    finally:
        if response is not None:
            response.close()
            response.release_conn()
    return payload, Path(object_key).name


def list_generated_documents(
    customer_id: int | None = None,
    template_key: TemplateKey | None = None,
    limit: int = 200,
) -> GeneratedDocumentListResponse:
    if limit <= 0:
        limit = 200
    if limit > 1000:
        limit = 1000

    client = get_minio_client()
    prefix = f"{settings.GENERATED_DOCUMENTS_PREFIX}/"
    objects = client.list_objects(settings.MINIO_BUCKET, prefix=prefix, recursive=True)

    items: list[GeneratedDocumentItem] = []
    for obj in objects:
        object_key = str(getattr(obj, "object_name", ""))
        if not object_key.endswith(".pdf"):
            continue

        parsed_customer_id, parsed_template_key, parsed_generated_at = _parse_generated_key(object_key)
        if customer_id is not None and parsed_customer_id != customer_id:
            continue
        if template_key is not None and parsed_template_key != template_key:
            continue

        items.append(
            GeneratedDocumentItem(
                bucket=settings.MINIO_BUCKET,
                object_key=object_key,
                file_name=Path(object_key).name,
                customer_id=parsed_customer_id,
                template_key=parsed_template_key,
                generated_at=parsed_generated_at,
                last_modified=getattr(obj, "last_modified", None),
                size_bytes=getattr(obj, "size", None),
            )
        )

    items.sort(key=lambda item: item.generated_at or item.last_modified or datetime.min.replace(tzinfo=UTC), reverse=True)
    return GeneratedDocumentListResponse(items=items[:limit], total=len(items))


def _parse_generated_key(object_key: str) -> tuple[int | None, TemplateKey | None, datetime | None]:
    pattern = re.compile(
        rf"^{re.escape(settings.GENERATED_DOCUMENTS_PREFIX)}/(?P<customer_id>\d+)/"
        r"(?P<template_key>affidavit|ba208)_(?P<stamp>\d{8}_\d{6})\.pdf$"
    )
    match = pattern.match(object_key)
    if not match:
        return None, None, None
    customer = int(match.group("customer_id"))
    raw_template = match.group("template_key")
    parsed_template: TemplateKey = "affidavit" if raw_template == "affidavit" else "ba208"
    stamp = match.group("stamp")
    parsed = datetime.strptime(stamp, "%Y%m%d_%H%M%S").replace(tzinfo=UTC)
    return customer, parsed_template, parsed
