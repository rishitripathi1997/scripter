from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import engine
from app.models import User, UserRole
from app.models.script import Script, ScriptRevision, ScriptStatus
from app.services.storage import publish_script_version


def init_db() -> None:
    """Legacy helper — prefer Alembic migrations via run_migrations()."""
    Base.metadata.create_all(bind=engine)


def seed_admin(db: Session) -> None:
    settings = get_settings()
    if not settings.seed_admin_enabled:
        return

    existing = db.query(User).filter(User.username == settings.seed_admin_username).first()
    if existing:
        return

    admin = User(
        username=settings.seed_admin_username,
        password_hash=hash_password(settings.seed_admin_password),
        display_name="Administrator",
        role=UserRole.admin,
    )
    db.add(admin)
    db.commit()


def backfill_unpublished_scripts(db: Session) -> None:
    """Publish active scripts missing storage keys (e.g. approved before Phase 2)."""
    scripts = (
        db.query(Script)
        .filter(Script.status == ScriptStatus.active, Script.script_s3_key.is_(None))
        .all()
    )
    for script in scripts:
        revision = (
            db.query(ScriptRevision)
            .filter(ScriptRevision.script_id == script.id)
            .order_by(ScriptRevision.revision_number.desc())
            .first()
        )
        if not revision or not revision.script_content:
            continue
        version = script.approved_version or 1
        manifest = {
            "input_schema": script.input_schema,
            "credential_requirements": script.credential_requirements,
        }
        script.script_s3_key = publish_script_version(
            script_id=str(script.id),
            version=version,
            script_content=revision.script_content,
            manifest=manifest,
        )
    if scripts:
        db.commit()
