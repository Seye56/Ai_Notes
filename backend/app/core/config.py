from functools import lru_cache

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    project_name: str = "AI Notes App"
    api_v1_prefix: str = "/api"
    app_env: str = "development"
    debug: bool = Field(
        default=True,
        validation_alias=AliasChoices("APP_DEBUG", "DEBUG"),
    )
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_db_url: str = ""
    supabase_jwt_secret: str = ""

    claude_api_key: str = ""
    claude_model: str = "claude-3-5-sonnet-latest"
    claude_fallback_models: list[str] = [
        "claude-haiku-4-5-20251001",
        "claude-3-haiku-20240307",
    ]
    elevenlabs_api_key: str = ""
    elevenlabs_base_url: str = "https://api.elevenlabs.io/v1"
    elevenlabs_default_voice_id: str = "EXAVITQu4vr4xnSDxMaL"
    elevenlabs_default_language: str = "en"
    elevenlabs_default_mood: str = "normal"
    elevenlabs_interactive_model: str = "eleven_flash_v2_5"
    elevenlabs_narration_model: str = "eleven_multilingual_v2"

    supabase_audio_bucket: str = "audio-files"
    supabase_imports_bucket: str = "note-imports"
    supabase_signed_url_expires_in: int = 3600

    database_echo: bool = False
    auto_create_tables: bool = False

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        enable_decoding=False,
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, list):
            return value
        if not value:
            return []
        return [origin.strip() for origin in value.split(",") if origin.strip()]

    @field_validator("claude_fallback_models", mode="before")
    @classmethod
    def parse_claude_fallback_models(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, list):
            return [item.strip() for item in value if str(item).strip()]
        if not value:
            return []
        return [model.strip() for model in value.split(",") if model.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
