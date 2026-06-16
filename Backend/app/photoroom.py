"""Photoroom background-removal engine.

Ported verbatim in spirit from Test-Version/app.py — same retry/backoff/timeout and
optional down-scaling — but it operates on in-memory bytes (uploaded files) instead
of reading from a local folder. This is the proven core; keep the behavior intact.
"""

import io
import os
import time

import requests
from PIL import Image
from pillow_heif import register_heif_opener

from .config import get_settings

register_heif_opener()

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".heic"}

MAX_RETRIES = 5
RETRY_BACKOFF_SECONDS = 2

# (connect/write, read) timeout. The first value also bounds the upload of the
# request body, so it must be large enough to send big images over slow links.
REQUEST_TIMEOUT = (120, 180)

JPEG_QUALITY = 90


def is_supported_filename(filename: str) -> bool:
    return os.path.splitext(filename)[1].lower() in SUPPORTED_EXTENSIONS


def prepare_upload(filename: str, image_bytes: bytes, scale_percent: int) -> tuple[str, bytes]:
    """Return (upload_filename, upload_bytes) ready to POST to Photoroom.

    At 100% the original bytes are sent untouched (best quality). Below 100% the
    image is resized and re-encoded as JPEG to shrink the upload. Anything we
    cannot decode is sent through unchanged.
    """
    if scale_percent >= 100:
        return filename, image_bytes

    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            scale = scale_percent / 100.0
            new_size = (max(1, round(img.width * scale)), max(1, round(img.height * scale)))
            resized = img.convert("RGB").resize(new_size, Image.LANCZOS)

            buf = io.BytesIO()
            resized.save(buf, format="JPEG", quality=JPEG_QUALITY)
            base = os.path.splitext(filename)[0]
            return f"{base}.jpg", buf.getvalue()
    except Exception:  # noqa: BLE001 — undecodable image: upload original bytes
        return filename, image_bytes


def remove_background(filename: str, image_bytes: bytes, scale_percent: int = 100) -> bytes:
    """Call Photoroom for one image and return the resulting PNG bytes.

    Retries on network errors, HTTP 429, and 5xx with linear backoff; raises on
    any other non-200 so the caller can record a per-image failure.
    """
    settings = get_settings()
    data = {"format": "png"}
    headers = {"x-api-key": settings.photoroom_api_key}
    last_exc: Exception | None = None

    upload_name, upload_bytes = prepare_upload(filename, image_bytes, scale_percent)

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            files = {"image_file": (upload_name, io.BytesIO(upload_bytes))}
            response = requests.post(
                settings.photoroom_endpoint,
                headers=headers,
                files=files,
                data=data,
                timeout=REQUEST_TIMEOUT,
            )
        except requests.exceptions.RequestException as exc:
            last_exc = exc
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_BACKOFF_SECONDS * attempt)
                continue
            raise

        if response.status_code == 200:
            return response.content

        if response.status_code >= 500 or response.status_code == 429:
            last_exc = RuntimeError(f"HTTP {response.status_code}: {response.text[:200]}")
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_BACKOFF_SECONDS * attempt)
                continue

        raise RuntimeError(f"HTTP {response.status_code}: {response.text[:200]}")

    raise last_exc if last_exc else RuntimeError("Unknown error")
