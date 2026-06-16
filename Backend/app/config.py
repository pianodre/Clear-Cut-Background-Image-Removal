"""Typed application settings, loaded once from the environment (.env).

Centralizing config here means every tunable — keys, limits, concurrency — lives
in one place and is validated at startup, so a missing key fails loudly instead
of surfacing as a confusing error mid-request.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Photoroom
    photoroom_api_key: str = ""
    photoroom_endpoint: str = "https://sdk.photoroom.com/v1/segment"

    # Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # CORS — comma-separated origins in the env, parsed to a list below.
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Concurrency / billing. 2 workers matches the proven prototype: higher
    # concurrency of large (10+ MB) uploads can trip transient Photoroom TLS resets.
    max_workers: int = 2
    credits_per_image: int = 1

    # Upload limits (bytes / counts)
    max_file_bytes: int = 26_214_400          # 25 MB per image
    max_total_upload_bytes: int = 524_288_000  # 500 MB per batch
    max_batch_images: int = 500

    # Zip-bomb guards
    max_zip_entries: int = 2000
    max_zip_uncompressed_bytes: int = 1_073_741_824  # 1 GB

    # Image scaling (percent) applied before upload; 100 = full quality.
    default_scale_percent: int = 100
    min_scale_percent: int = 10

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    def require_runtime_keys(self) -> None:
        """Fail fast if the secrets needed to actually serve traffic are missing."""
        missing = [
            name
            for name, value in (
                ("PHOTOROOM_API_KEY", self.photoroom_api_key),
                ("SUPABASE_URL", self.supabase_url),
                ("SUPABASE_SERVICE_ROLE_KEY", self.supabase_service_role_key),
            )
            if not value
        ]
        if missing:
            raise RuntimeError(
                "Missing required environment variables: "
                + ", ".join(missing)
                + ". Copy .env.example to .env and fill them in."
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()
