from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import AuthUser
from app.modules.auth.schemas import AuthUserResponse, LoginRequest
from app.modules.auth.service import login

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=AuthUserResponse)
def login_route(payload: LoginRequest, response: Response) -> AuthUserResponse:
    auth_result = login(username=payload.username, password=payload.password)
    if auth_result is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    user, token = auth_result
    max_age = settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
    response.set_cookie(
        key=settings.AUTH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        max_age=max_age,
        path="/",
    )
    return AuthUserResponse(username=user.username, role=user.role)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout_route(response: Response) -> Response:
    response.delete_cookie(
        key=settings.AUTH_COOKIE_NAME,
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        path="/",
    )
    return response


@router.get("/me", response_model=AuthUserResponse)
def me_route(current_user: AuthUser = Depends(get_current_user)) -> AuthUserResponse:
    return AuthUserResponse(username=current_user.username, role=current_user.role)
