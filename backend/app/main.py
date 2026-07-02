from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, auth, credentials, health, notifications, proposals, runs, scripts
from app.core.config import get_settings
from app.db.session import SessionLocal
from app.services.seed import backfill_unpublished_scripts, init_db, seed_admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    db = SessionLocal()
    try:
        seed_admin(db)
        backfill_unpublished_scripts(db)
    finally:
        db.close()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(auth.router, prefix="/api")
    app.include_router(scripts.router, prefix="/api")
    app.include_router(proposals.router, prefix="/api")
    app.include_router(admin.router, prefix="/api")
    app.include_router(credentials.router, prefix="/api")
    app.include_router(runs.router, prefix="/api")
    app.include_router(notifications.router, prefix="/api")

    return app


app = create_app()
