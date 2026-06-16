"""Normalize uploads (single image / folder / zip) into one validated image list.

Every upload mode is flattened into the same `list[ImageInput]` so the processing
pipeline never branches per mode. All size/count/type validation — including the
contents of a .zip — happens here, at the boundary where untrusted data enters.
"""

import io
import os
import posixpath
import zipfile
from dataclasses import dataclass

from ..config import Settings
from ..photoroom import SUPPORTED_EXTENSIONS, is_supported_filename


class UploadError(ValueError):
    """A bad upload (too big, too many, unsupported, unsafe zip). Maps to HTTP 400."""


@dataclass(frozen=True)
class ImageInput:
    filename: str
    data: bytes


def _is_zip(filename: str, data: bytes) -> bool:
    if filename.lower().endswith(".zip"):
        return True
    # Magic-number fallback so a mislabeled zip is still treated as one.
    return data[:4] == b"PK\x03\x04"


def _safe_zip_name(name: str) -> str | None:
    """Return a clean basename for a zip entry, or None if it should be skipped.

    Rejects directories, absolute paths, and `..` traversal. We only ever use the
    basename (we don't write to disk), but rejecting outright is the safe default.
    """
    if not name or name.endswith("/"):
        return None
    normalized = name.replace("\\", "/")
    if normalized.startswith("/") or ".." in normalized.split("/"):
        return None
    base = posixpath.basename(normalized)
    if not base or base.startswith("."):
        return None
    return base


def _extract_zip(data: bytes, settings: Settings) -> list[ImageInput]:
    images: list[ImageInput] = []
    uncompressed_total = 0

    try:
        archive = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile as exc:
        raise UploadError("Uploaded .zip is corrupt or not a real zip archive.") from exc

    with archive:
        infos = archive.infolist()
        if len(infos) > settings.max_zip_entries:
            raise UploadError(
                f"Zip has too many entries ({len(infos)} > {settings.max_zip_entries})."
            )

        for info in infos:
            if info.is_dir():
                continue
            base = _safe_zip_name(info.filename)
            if base is None or not is_supported_filename(base):
                continue  # skip junk, nested dirs, unsupported files

            # Trust the declared size first (cheap zip-bomb guard), then enforce on read.
            if info.file_size > settings.max_file_bytes:
                raise UploadError(f"Image '{base}' inside the zip exceeds the per-file size limit.")
            uncompressed_total += info.file_size
            if uncompressed_total > settings.max_zip_uncompressed_bytes:
                raise UploadError("Zip's total uncompressed size exceeds the limit (possible zip bomb).")

            with archive.open(info) as entry:
                content = entry.read(settings.max_file_bytes + 1)
            if len(content) > settings.max_file_bytes:
                raise UploadError(f"Image '{base}' inside the zip exceeds the per-file size limit.")
            images.append(ImageInput(filename=base, data=content))

    return images


def collect_images(
    files: list[tuple[str, bytes]],
    settings: Settings,
    declared_mode: str | None = None,
) -> tuple[list[ImageInput], str]:
    """Flatten raw uploads into validated images and resolve the upload mode.

    `files` is a list of (filename, bytes). Returns (images, mode) where mode is
    one of 'single' | 'folder' | 'zip'. Raises UploadError on any violation.
    """
    if not files:
        raise UploadError("No files were uploaded.")

    images: list[ImageInput] = []
    saw_zip = False
    total_bytes = 0

    for filename, data in files:
        total_bytes += len(data)
        if total_bytes > settings.max_total_upload_bytes:
            raise UploadError("Total upload size exceeds the per-batch limit.")

        if _is_zip(filename, data):
            saw_zip = True
            images.extend(_extract_zip(data, settings))
            continue

        if not is_supported_filename(filename):
            raise UploadError(
                f"Unsupported file type: '{filename}'. "
                f"Allowed: {', '.join(sorted(SUPPORTED_EXTENSIONS))}."
            )
        if len(data) > settings.max_file_bytes:
            raise UploadError(f"Image '{os.path.basename(filename)}' exceeds the per-file size limit.")
        images.append(ImageInput(filename=os.path.basename(filename), data=data))

    if not images:
        raise UploadError("No supported images found in the upload.")
    if len(images) > settings.max_batch_images:
        raise UploadError(
            f"Batch has too many images ({len(images)} > {settings.max_batch_images})."
        )

    mode = declared_mode if declared_mode in ("single", "folder", "zip") else None
    if mode is None:
        mode = "zip" if saw_zip else ("single" if len(images) == 1 else "folder")
    return images, mode
