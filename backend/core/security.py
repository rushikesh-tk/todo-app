from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Request, HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from .config import settings

# Password hashing configuration
# ORM equivalent: Often handled by a User model property or a separate service
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    """Hashes a plain text password using bcrypt."""
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Verifies a plain text password against a hashed password."""
    return pwd_context.verify(plain, hashed)


def create_token(user_id: int) -> str:
    """
    Creates a JWT token containing only user_id and expiry.
    """
    expire = datetime.now(timezone.utc) + \
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(user_id)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt


def decode_token(token: str) -> Optional[int]:
    """
    Decodes a JWT token and returns the user_id.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id == None:
            return None
        return int(user_id)
    except JWTError:
        return None


async def get_current_user(request: Request) -> int:
    """
    FastAPI dependency that reads the JWT token from the 'access_token' cookie.

    ORM equivalent:
    def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
        user = db.query(User).filter(User.id == decoded_id).first()
        if not user: raise HTTPException(...)
        return user
    """
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    user_id = decode_token(token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    return user_id
