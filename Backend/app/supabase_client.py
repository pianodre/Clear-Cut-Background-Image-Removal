"""Single service-role Supabase client for the backend.

The service-role key bypasses Row-Level Security, so this client is the only thing
that writes to the DB and storage. It must never be exposed to the frontend.
"""

from functools import lru_cache

from supabase import Client, create_client

from .config import get_settings


def new_client() -> Client:
    """Build a fresh service-role client (its own HTTP transport / connection pool).

    Used to give each worker thread its own client, since sharing one client's
    connection pool across threads is not safe for concurrent large transfers.
    """
    settings = get_settings()
    settings.require_runtime_keys()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


@lru_cache
def get_supabase() -> Client:
    """Shared client for single-threaded request handling (auth, reads, inserts)."""
    return new_client()
