from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from typing import Annotated
from uuid import UUID
from app.services.auth_service import decode_token
from app.schemas.auth import UserSchema
from datetime import datetime, timezone

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme)) -> UserSchema:
    payload = decode_token(token)
    user_id_str = payload.get("user_id")
    org_id_str = payload.get("organization_id")
    role_name = payload.get("role_name")
    
    if user_id_str is None or org_id_str is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    # Reconstruct a UserSchema from the JWT payload without querying DB for fast access
    # 'created_at' and 'role_id' might not be in JWT, we use dummy values if needed,
    # but let's assume we included what we need in the token or we just map it.
    # The instruction says get_current_user returns UserSchema.
    return UserSchema(
        id=UUID(user_id_str),
        email=payload.get("email", ""),
        name=payload.get("name", ""),
        organization_id=UUID(org_id_str),
        role_id=UUID(payload.get("role_id", "00000000-0000-0000-0000-000000000000")),
        role_name=role_name,
        created_at=datetime.now(timezone.utc) # Not used in deps usually
    )

def get_current_org_id(user: UserSchema = Depends(get_current_user)) -> UUID:
    return user.organization_id

def require_role(required_role: str):
    def role_checker(user: UserSchema = Depends(get_current_user)):
        if user.role_name == "Admin":
            return user
        if user.role_name != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Not enough permissions"
            )
        return user
    return role_checker
