from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.models.notification import Notification, NotificationType
from app.models.user import User, UserRole


def notify_user(
    db: Session,
    user_id: uuid.UUID,
    title: str,
    message: str,
    link: str | None = None,
    ntype: NotificationType = NotificationType.info,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        type=ntype,
        title=title,
        message=message,
        link=link,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def notify_admins(
    db: Session,
    title: str,
    message: str,
    link: str | None = None,
    ntype: NotificationType = NotificationType.info,
) -> list[Notification]:
    admins = db.query(User).filter(User.role == UserRole.admin, User.is_active.is_(True)).all()
    created = []
    for admin in admins:
        created.append(
            notify_user(db, admin.id, title, message, link=link, ntype=ntype)
        )
    return created
