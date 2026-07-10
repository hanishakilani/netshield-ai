import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from app.models.user import UserRole


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8)
    role: UserRole = UserRole.viewer


class UserResponse(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True