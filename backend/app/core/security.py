from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from functools import lru_cache
from hmac import compare_digest

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.core.config import settings

password_hasher = PasswordHasher()


@dataclass
class AuthUser:
    username: str
    role: str


def create_access_token(user: AuthUser) -> str:
    now = datetime.now(UTC)
    expires = now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user.username,
        "role": user.role,
        "iat": int(now.timestamp()),
        "exp": int(expires.timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> AuthUser:
    payload = jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )
    username = payload.get("sub")
    role = payload.get("role")
    if not username or not role:
        raise jwt.InvalidTokenError("Invalid token payload")
    return AuthUser(username=username, role=role)


def authenticate_user(username: str, password: str) -> AuthUser | None:
    for user_record in load_auth_users():
        if user_record["username"] != username:
            continue
        if not _verify_password(password=password, stored=user_record["password"]):
            return None
        return AuthUser(username=user_record["username"], role=user_record["role"])
    return None


@lru_cache(maxsize=1)
def load_auth_users() -> list[dict[str, str]]:
    try:
        payload = json.loads(settings.AUTH_USERS_JSON)
    except json.JSONDecodeError as exc:
        raise ValueError("AUTH_USERS_JSON is not valid JSON") from exc

    if not isinstance(payload, list):
        raise ValueError("AUTH_USERS_JSON must be a JSON array")

    users: list[dict[str, str]] = []
    for item in payload:
        if not isinstance(item, dict):
            continue
        username = str(item.get("username", "")).strip()
        password = str(item.get("password", "")).strip()
        role = str(item.get("role", "operator")).strip() or "operator"
        if username and password:
            users.append({"username": username, "password": password, "role": role})

    if not users:
        raise ValueError("AUTH_USERS_JSON does not contain valid users")
    return users


def _verify_password(password: str, stored: str) -> bool:
    if stored.startswith("$argon2"):
        try:
            return password_hasher.verify(stored, password)
        except VerifyMismatchError:
            return False
    return compare_digest(password, stored)
