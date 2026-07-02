from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "ConnectX Scripts"
    debug: bool = False

    database_url: str = "postgresql+psycopg://connectx:connectx@localhost:5432/connectx_scripts"

    secret_key: str = "change-me-in-production-use-long-random-string"
    session_cookie_name: str = "connectx_session"
    session_max_age_seconds: int = 60 * 60 * 24 * 7  # 7 days

    app_encryption_key: str = "change-me-32-byte-base64-key-for-aes"

    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # S3 (Phase 2+)
    aws_region: str = "us-east-1"
    s3_bucket: str = ""
    s3_endpoint_url: str | None = None
    local_storage_path: str = "./data"

    script_run_timeout_seconds: int = 600
    async_runs_enabled: bool = True

    # External notifications (Phase 4)
    slack_webhook_url: str = ""
    webhook_notifications_enabled: bool = False

    # Alembic
    run_db_migrations: bool = True

    # Seed admin (first boot)
    seed_admin_username: str = "admin"
    seed_admin_password: str = "admin123"
    seed_admin_enabled: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
