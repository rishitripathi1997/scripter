from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.models.permission import GranteeType, ScriptRunPermission
from app.models.script import Script
from app.models.user import User, UserRole


def user_can_run_script(db: Session, user: User, script: Script) -> bool:
    if user.role == UserRole.admin:
        return True

    perms = db.query(ScriptRunPermission).filter(ScriptRunPermission.script_id == script.id).all()
    if not perms:
        return True

    user_id_str = str(user.id)
    role_str = user.role.value

    for perm in perms:
        if perm.grantee_type == GranteeType.user and perm.grantee_value == user_id_str:
            return True
        if perm.grantee_type == GranteeType.role and perm.grantee_value == role_str:
            return True
    return False


def get_script_permissions(db: Session, script_id: uuid.UUID) -> list[ScriptRunPermission]:
    return db.query(ScriptRunPermission).filter(ScriptRunPermission.script_id == script_id).all()


def set_script_permissions(
    db: Session,
    script: Script,
    user_ids: list[str],
    roles: list[str],
) -> list[ScriptRunPermission]:
    db.query(ScriptRunPermission).filter(ScriptRunPermission.script_id == script.id).delete()

    perms: list[ScriptRunPermission] = []
    for uid in user_ids:
        perms.append(
            ScriptRunPermission(
                script_id=script.id,
                grantee_type=GranteeType.user,
                grantee_value=uid,
            )
        )
    for role in roles:
        perms.append(
            ScriptRunPermission(
                script_id=script.id,
                grantee_type=GranteeType.role,
                grantee_value=role,
            )
        )
    db.add_all(perms)
    db.commit()
    return perms
