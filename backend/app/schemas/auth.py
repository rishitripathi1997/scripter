from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1)


class UserResponse(BaseModel):
    id: str
    username: str
    display_name: str | None
    role: str

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    user: UserResponse


class CreateUserRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=8)
    display_name: str | None = None
    role: str = "user"
