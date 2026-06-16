"""ClearCut backend — FastAPI app.

Multi-user HTTP API in front of the Photoroom engine: authenticated, credit-gated,
batch-first (single image / folder / zip). Storage, auth, and billing data live in
Supabase; this service holds the secrets and does all privileged writes.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routers import health, jobs, me


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fail fast at boot if required secrets are missing, rather than mid-request.
    get_settings().require_runtime_keys()
    yield


app = FastAPI(title="ClearCut API", version="0.1.0", lifespan=lifespan)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,  # locked to the frontend origin(s)
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["X-Job-Id"],
)

app.include_router(health.router)
app.include_router(me.router)
app.include_router(jobs.router)
