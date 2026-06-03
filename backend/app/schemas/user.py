from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str


class UserRead(BaseModel):
    id: int
    email: str
    full_name: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    full_name: str | None = None
    password: str | None = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
