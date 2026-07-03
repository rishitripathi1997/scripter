from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentAdmin, CurrentUser, DbSession
from app.core.config import get_settings
from app.core.security import (
    generate_session_token,
    hash_password,
    hash_session_token,
    session_expires_at,
    verify_password,
)
from app.models.user import User, UserRole, UserSession
from app.schemas.auth import AuthResponse, CreateUserRequest, LoginRequest, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_response(user: User) -> UserResponse:
    return UserResponse(
        id=str(user.id),
        username=user.username,
        display_name=user.display_name,
        role=user.role.value,
    )


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, response: Response, db: DbSession) -> AuthResponse:
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not verify_password(user.password_hash, body.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    token = generate_session_token()
    session = UserSession(
        user_id=user.id,
        token_hash=hash_session_token(token),
        expires_at=session_expires_at(),
    )
    db.add(session)
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    settings = get_settings()
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=settings.session_max_age_seconds,
        secure=settings.session_cookie_secure,
    )
    return AuthResponse(user=_user_response(user))


@router.post("/logout")
def logout(
    response: Response,
    db: DbSession,
    current_user: CurrentUser,
) -> dict:
    settings = get_settings()
    db.query(UserSession).filter(UserSession.user_id == current_user.id).delete()
    db.commit()
    response.delete_cookie(
        settings.session_cookie_name,
        httponly=True,
        samesite="lax",
        secure=settings.session_cookie_secure,
    )
    return {"ok": True}


@router.get("/me", response_model=AuthResponse)
def me(current_user: CurrentUser) -> AuthResponse:
    return AuthResponse(user=_user_response(current_user))


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(body: CreateUserRequest, db: DbSession, _: CurrentAdmin) -> UserResponse:
    existing = db.query(User).filter(User.username == body.username).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username taken")

    role = UserRole.admin if body.role == "admin" else UserRole.user
    user = User(
        username=body.username,
        password_hash=hash_password(body.password),
        display_name=body.display_name or body.username,
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _user_response(user)
