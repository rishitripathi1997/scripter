from __future__ import annotations

import logging
from pathlib import Path

from alembic import command
from alembic.config import Config

from app.core.config import get_settings

logger = logging.getLogger(__name__)

ALEMBIC_INI = Path(__file__).resolve().parents[2] / "alembic.ini"


def run_migrations() -> None:
    settings = get_settings()
    if not settings.run_db_migrations:
        logger.info("DB migrations disabled (RUN_DB_MIGRATIONS=false)")
        return
    if not ALEMBIC_INI.exists():
        logger.warning("alembic.ini not found — skipping migrations")
        return

    cfg = Config(str(ALEMBIC_INI))
    cfg.set_main_option("sqlalchemy.url", settings.database_url)
    logger.info("Running database migrations...")
    command.upgrade(cfg, "head")
    logger.info("Database migrations complete")
