from fastapi import APIRouter, Depends
from app.api.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.schemas.user import UserResponse

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/admin-only", response_model=UserResponse)
def admin_only_route(current_user: User = Depends(require_role(UserRole.admin))):
    return current_user