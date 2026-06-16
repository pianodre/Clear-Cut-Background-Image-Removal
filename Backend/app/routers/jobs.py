"""Jobs API: create a batch (streamed), list jobs, fetch one, download results."""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse

from ..auth import AuthUser, get_current_user
from ..config import Settings, get_settings
from ..services.images import UploadError, collect_images
from ..services.processor import JobProcessor, build_results_zip
from ..supabase_client import get_supabase

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


def _clamp_scale(raw: int, settings: Settings) -> int:
    return max(settings.min_scale_percent, min(100, raw))


@router.post("")
async def create_job(
    files: list[UploadFile] = File(...),
    mode: str | None = Form(default=None),
    scale_percent: int = Form(default=100),
    user: AuthUser = Depends(get_current_user),
):
    settings = get_settings()
    db = get_supabase()

    # Read uploads into memory and normalize all three modes into one image list.
    raw: list[tuple[str, bytes]] = []
    for upload in files:
        raw.append((upload.filename or "upload", await upload.read()))
    try:
        images, resolved_mode = collect_images(raw, settings, mode)
    except UploadError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    scale = _clamp_scale(scale_percent, settings)

    # Friendly up-front credit check (the per-image reserve is the real guard).
    required = len(images) * settings.credits_per_image
    profile = db.table("profiles").select("credits").eq("id", user.id).single().execute()
    balance = (profile.data or {}).get("credits", 0)
    if balance < required:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Not enough credits: this batch needs {required}, you have {balance}.",
        )

    processor = JobProcessor(db, settings, user.id)
    job_id, image_rows = processor.create_job(images, resolved_mode, scale)

    return StreamingResponse(
        processor.stream(job_id, image_rows, scale),
        media_type="application/x-ndjson",
        headers={"X-Job-Id": job_id, "Cache-Control": "no-cache"},
    )


@router.get("")
def list_jobs(user: AuthUser = Depends(get_current_user)) -> dict:
    jobs = (
        get_supabase()
        .table("jobs")
        .select("id, status, upload_mode, total_images, successful_count, failed_count, "
                "credits_charged, created_at, completed_at")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return {"jobs": jobs.data or []}


RESULT_URL_TTL_SECONDS = 3600  # signed result URLs are valid for one hour


def _signed_result_url(db, output_path: str) -> str | None:
    """Mint a short-lived signed URL for a result object in the private bucket."""
    if not output_path:
        return None
    try:
        signed = db.storage.from_("results").create_signed_url(output_path, RESULT_URL_TTL_SECONDS)
    except Exception:  # noqa: BLE001 — a missing/expired object shouldn't fail the whole response
        return None
    # supabase-py has used both 'signedURL' and 'signedUrl' across versions.
    return signed.get("signedURL") or signed.get("signedUrl") if isinstance(signed, dict) else None


@router.get("/{job_id}")
def get_job(job_id: str, user: AuthUser = Depends(get_current_user)) -> dict:
    db = get_supabase()
    job = db.table("jobs").select("*").eq("id", job_id).eq("user_id", user.id).execute()
    if not job.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")

    images = (
        db.table("job_images")
        .select("id, original_filename, status, error, output_path, bytes_in, bytes_out")
        .eq("job_id", job_id)
        .eq("user_id", user.id)
        .order("created_at")
        .execute()
    )
    rows = images.data or []
    for row in rows:
        row["result_url"] = (
            _signed_result_url(db, row["output_path"]) if row.get("status") == "success" else None
        )
    return {"job": job.data[0], "images": rows}


@router.get("/{job_id}/download")
def download_job(job_id: str, user: AuthUser = Depends(get_current_user)) -> StreamingResponse:
    import io

    db = get_supabase()
    job = db.table("jobs").select("id").eq("id", job_id).eq("user_id", user.id).execute()
    if not job.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")

    archive = build_results_zip(db, user.id, job_id)
    if not archive:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No results to download yet.")

    return StreamingResponse(
        io.BytesIO(archive),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="clearcut-{job_id}.zip"'},
    )
