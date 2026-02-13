from __future__ import annotations

from app.core.security import AuthUser, authenticate_user, create_access_token

def login(username: str, password: str) -> tuple[AuthUser, str] | None:
    user = authenticate_user(username=username, password=password)
    if user is None:
        return None
    token = create_access_token(user)
    return user, token
