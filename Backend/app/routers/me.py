"""Account endpoints: the profile/credits the dashboard reads."""

from fastapi import APIRouter, Depends, HTTPException, status

from ..auth import AuthUser, get_current_user
from ..supabase_client import get_supabase

router = APIRouter(prefix="/api", tags=["account"])


@router.get("/me")
def get_me(user: AuthUser = Depends(get_current_user)) -> dict:
    profile = (
        get_supabase()
        .table("profiles")
        .select("id, email, full_name, credits, plan")
        .eq("id", user.id)
        .single()
        .execute()
    )
    if not profile.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    return profile.data
