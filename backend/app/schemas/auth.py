from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Optional

class RegisterRequest(BaseModel):
    org_name: str
    user_name: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserSchema(BaseModel):
    id: UUID
    name: Optional[str]
    email: EmailStr
    organization_id: UUID
    role_id: UUID
    role_name: Optional[str] = None
    created_at: datetime

    model_config = {
        "from_attributes": True
    }
