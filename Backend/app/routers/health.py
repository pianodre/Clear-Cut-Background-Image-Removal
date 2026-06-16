"""Liveness probe — no auth, no DB. Used by hosts and uptime checks."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}
