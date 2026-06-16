"""Authentication: require a valid Supabase JWT on protected endpoints.

The frontend signs in with Supabase Auth and sends the access token as a Bearer
header. We hand that token to GoTrue (via the Supabase client) to verify it and
resolve the user — so verification works regardless of the project's JWT signing
method, with no shared secret to manage on this side.
"""

from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .supabase_client import get_supabase

_bearer = HTTPBearer(auto_error=True)


@dataclass(frozen=True)
class AuthUser:
    id: str
    email: str | None


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> AuthUser:
    token = credentials.credentials
    try:
        response = get_supabase().auth.get_user(token)
    except Exception:  # noqa: BLE001 — any verification failure is an auth failure
        response = None

    user = getattr(response, "user", None)
    if user is None or not getattr(user, "id", None):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return AuthUser(id=user.id, email=getattr(user, "email", None))
