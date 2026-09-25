from fastapi import APIRouter, Depends, HTTPException, status, Response
from core.config import settings
from core.database import get_db
from core.security import hash_password, verify_password, create_token, get_current_user
from db.queries.user_queries import get_user_by_email, get_user_by_id, create_user
from models.user import UserCreate, UserOut
from typing import Annotated

router = APIRouter()


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate, response: Response):
    with get_db() as cursor:
        existing_user = get_user_by_email(cursor, user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

        hashed_password = hash_password(user_data.password)
        new_user = create_user(cursor, user_data.email, hashed_password)

        # Create and set JWT token
        access_token = create_token(new_user["id"])
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            samesite="none" if settings.ENVIRONMENT == "production" else "lax",
            secure=True if settings.ENVIRONMENT == "production" else False,
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60  # in seconds
        )

    return {"message": "User registered successfully"}


@router.post("/login", response_model=UserOut)
async def login_user(user_data: UserCreate, response: Response):
    with get_db() as cursor:
        user = get_user_by_email(cursor, user_data.email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

        if not verify_password(user_data.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

        access_token = create_token(user["id"])
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            samesite="none" if settings.ENVIRONMENT == "production" else "lax",
            secure=True if settings.ENVIRONMENT == "production" else False,
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60  # in seconds
        )
        return UserOut(**user)


@router.post("/logout", response_model=dict)
async def logout_user(response: Response):
    response.set_cookie(
        key="access_token",
        value="",
        httponly=True,
        samesite="none" if settings.ENVIRONMENT == "production" else "lax",
        secure=True if settings.ENVIRONMENT == "production" else False,
        max_age=0
    )
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserOut)
async def read_users_me(user_id: Annotated[int, Depends(get_current_user)]):
    with get_db() as cursor:
        user = get_user_by_id(cursor, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return UserOut(**user)
