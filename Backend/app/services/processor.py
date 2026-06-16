"""Batch processing pipeline: storage + Photoroom + credits + progress streaming.

One internal flow for every upload mode. Per image we *reserve* a credit before
calling Photoroom (so we never spend Photoroom money without a paid credit) and
*refund* it if the call fails (so a failed image is never charged). Progress is
streamed as NDJSON, reusing the prototype's start/progress/done event shape.
"""

import io
import json
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Iterator

from postgrest.exceptions import APIError
from supabase import Client

from ..config import Settings
from ..photoroom import remove_background
from ..supabase_client import new_client
from .images import ImageInput

UPLOADS_BUCKET = "uploads"
RESULTS_BUCKET = "results"

# Storage transfers occasionally hit transient TLS/connection errors under
# concurrency; retry with linear backoff on a fresh connection. Uploads use
# upsert (same path overwrites), so a retry is idempotent and safe.
STORAGE_MAX_RETRIES = 4
STORAGE_BACKOFF_SECONDS = 2

# Each worker thread gets its own Supabase client — sharing one client's
# connection pool across threads corrupts concurrent large uploads.
_thread_local = threading.local()


def _thread_db() -> Client:
    db = getattr(_thread_local, "db", None)
    if db is None:
        db = new_client()
        _thread_local.db = db
    return db


def _reset_thread_db() -> None:
    """Drop this thread's client so the next call rebuilds it with a fresh pool."""
    _thread_local.db = None

_CONTENT_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".heic": "image/heic",
}


def _content_type(filename: str) -> str:
    return _CONTENT_TYPES.get(os.path.splitext(filename)[1].lower(), "application/octet-stream")


def _is_insufficient_credits(exc: APIError) -> bool:
    message = f"{getattr(exc, 'message', '')} {getattr(exc, 'details', '')}"
    return "insufficient_credits" in message


class JobProcessor:
    """Creates a job and its image rows, then runs and streams the batch."""

    def __init__(self, supabase: Client, settings: Settings, user_id: str):
        self.db = supabase
        self.settings = settings
        self.user_id = user_id

    # --- setup -------------------------------------------------------------

    def create_job(self, images: list[ImageInput], mode: str, scale_percent: int) -> tuple[str, list[dict]]:
        """Insert the job and one row per image. Returns (job_id, image_rows)."""
        job = (
            self.db.table("jobs")
            .insert(
                {
                    "user_id": self.user_id,
                    "status": "processing",
                    "upload_mode": mode,
                    "total_images": len(images),
                    "scale_percent": scale_percent,
                }
            )
            .execute()
        )
        job_id = job.data[0]["id"]

        rows = [
            {
                "job_id": job_id,
                "user_id": self.user_id,
                "original_filename": img.filename,
                "status": "pending",
            }
            for img in images
        ]
        inserted = self.db.table("job_images").insert(rows).execute()
        # Pair each DB row id back with its bytes, preserving order.
        image_rows = [
            {"row_id": inserted.data[i]["id"], "index": i + 1, "image": images[i]}
            for i in range(len(images))
        ]
        return job_id, image_rows

    # --- per-image work ----------------------------------------------------

    @staticmethod
    def _storage_upload(bucket: str, path: str, data: bytes, content_type: str) -> None:
        """Upload to Storage, retrying transient connection errors on a fresh client."""
        last_exc: Exception | None = None
        for attempt in range(1, STORAGE_MAX_RETRIES + 1):
            try:
                _thread_db().storage.from_(bucket).upload(
                    path, data, {"content-type": content_type, "upsert": "true"}
                )
                return
            except Exception as exc:  # noqa: BLE001 — transient TLS/network: rebuild + retry
                last_exc = exc
                _reset_thread_db()
                if attempt < STORAGE_MAX_RETRIES:
                    time.sleep(STORAGE_BACKOFF_SECONDS * attempt)
        raise last_exc if last_exc else RuntimeError("Storage upload failed")

    def _process_one(self, job_id: str, item: dict, scale_percent: int) -> dict:
        row_id: str = item["row_id"]
        index: int = item["index"]
        image: ImageInput = item["image"]
        filename = image.filename
        base = os.path.splitext(filename)[0]
        db = _thread_db()

        db.table("job_images").update({"status": "processing"}).eq("id", row_id).execute()

        # Reserve a credit up front; if the user is out, skip Photoroom entirely.
        # No retry here — re-running the RPC could double-charge.
        try:
            db.rpc(
                "deduct_credits",
                {"p_user_id": self.user_id, "p_amount": self.settings.credits_per_image,
                 "p_type": "usage", "p_job_id": job_id},
            ).execute()
        except APIError as exc:
            if _is_insufficient_credits(exc):
                db.table("job_images").update(
                    {"status": "failed", "error": "insufficient_credits"}
                ).eq("id", row_id).execute()
                return {"status": "failed", "filename": filename, "error": "insufficient_credits"}
            raise

        input_path = f"{self.user_id}/{job_id}/{index}_{filename}"
        output_path = f"{self.user_id}/{job_id}/{index}_{base}.png"

        step = "upload_original"
        try:
            self._storage_upload(UPLOADS_BUCKET, input_path, image.data, _content_type(filename))
            step = "photoroom"
            result = remove_background(filename, image.data, scale_percent)
            step = "store_result"
            self._storage_upload(RESULTS_BUCKET, output_path, result, "image/png")
        except Exception as exc:  # noqa: BLE001 — refund the reserved credit on any failure
            message = f"[{step}] {exc}"
            _thread_db().rpc(
                "add_credits",
                {"p_user_id": self.user_id, "p_amount": self.settings.credits_per_image,
                 "p_type": "refund", "p_job_id": job_id},
            ).execute()
            _thread_db().table("job_images").update(
                {"status": "failed", "error": message[:500], "input_path": input_path}
            ).eq("id", row_id).execute()
            return {"status": "failed", "filename": filename, "error": message}

        _thread_db().table("job_images").update(
            {
                "status": "success",
                "input_path": input_path,
                "output_path": output_path,
                "bytes_in": len(image.data),
                "bytes_out": len(result),
                "error": None,
            }
        ).eq("id", row_id).execute()
        return {"status": "success", "filename": filename}

    # --- streaming run -----------------------------------------------------

    def stream(self, job_id: str, image_rows: list[dict], scale_percent: int) -> Iterator[str]:
        total = len(image_rows)
        successful = failed = 0
        failures: list[dict] = []
        completed = 0

        yield json.dumps({"type": "start", "job_id": job_id, "total": total}) + "\n"

        with ThreadPoolExecutor(max_workers=self.settings.max_workers) as executor:
            futures = [
                executor.submit(self._process_one, job_id, item, scale_percent)
                for item in image_rows
            ]
            for future in as_completed(futures):
                result = future.result()
                completed += 1
                if result["status"] == "success":
                    successful += 1
                else:
                    failed += 1
                    failures.append({"filename": result["filename"], "error": result["error"]})
                yield json.dumps(
                    {
                        "type": "progress",
                        "current": completed,
                        "total": total,
                        "filename": result["filename"],
                        "status": result["status"],
                    }
                ) + "\n"

        status = "completed" if failed == 0 else ("failed" if successful == 0 else "partial")
        credits_charged = successful * self.settings.credits_per_image
        self.db.table("jobs").update(
            {
                "status": status,
                "successful_count": successful,
                "failed_count": failed,
                "credits_charged": credits_charged,
                "completed_at": "now()",
            }
        ).eq("id", job_id).execute()

        yield json.dumps(
            {
                "type": "done",
                "job_id": job_id,
                "total": total,
                "successful": successful,
                "failed": failed,
                "credits_charged": credits_charged,
                "failures": failures,
            }
        ) + "\n"


def _storage_download(supabase: Client, path: str) -> bytes:
    """Download from Storage, retrying transient connection errors with backoff."""
    last_exc: Exception | None = None
    for attempt in range(1, STORAGE_MAX_RETRIES + 1):
        try:
            return supabase.storage.from_(RESULTS_BUCKET).download(path)
        except Exception as exc:  # noqa: BLE001 — transient TLS/network: back off + retry
            last_exc = exc
            if attempt < STORAGE_MAX_RETRIES:
                time.sleep(STORAGE_BACKOFF_SECONDS * attempt)
    raise last_exc if last_exc else RuntimeError("Storage download failed")


def build_results_zip(supabase: Client, user_id: str, job_id: str) -> bytes:
    """Download every successful result for a job from Storage and zip it in memory."""
    import zipfile

    rows = (
        supabase.table("job_images")
        .select("original_filename, output_path")
        .eq("job_id", job_id)
        .eq("user_id", user_id)
        .eq("status", "success")
        .execute()
    )

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as archive:
        for row in rows.data or []:
            output_path = row.get("output_path")
            if not output_path:
                continue
            content = _storage_download(supabase, output_path)
            base = os.path.splitext(row["original_filename"])[0]
            archive.writestr(f"{base}.png", content)
    return buf.getvalue()
