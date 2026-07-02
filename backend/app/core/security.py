import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.core.config import get_settings

_ph = PasswordHasher()


def hash_password(password: str) -> str:
    return _ph.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _ph.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def generate_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_session_token(token: str) -> str:
    settings = get_settings()
    return hashlib.sha256(f"{settings.secret_key}:{token}".encode()).hexdigest()


def session_expires_at() -> datetime:
    settings = get_settings()
    return datetime.now(timezone.utc) + timedelta(seconds=settings.session_max_age_seconds)
