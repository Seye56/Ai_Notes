from functools import lru_cache

from fastapi import HTTPException, status
from supabase import Client, create_client

from app.core.config import settings


def _build_client(api_key: str) -> Client:
    if not settings.supabase_url or not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase client is not configured.",
        )
    return create_client(settings.supabase_url, api_key)


@lru_cache
def get_supabase_anon_client() -> Client:
    return _build_client(settings.supabase_anon_key)


@lru_cache
def get_supabase_admin_client() -> Client:
    return _build_client(settings.supabase_service_role_key)


def build_storage_public_url(bucket: str, path: str) -> str:
    return f"{settings.supabase_url}/storage/v1/object/public/{bucket}/{path}"
