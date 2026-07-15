from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_current_user, require_role
from app.db.postgres import get_db
from app.models.user import User, UserRole
from app.models.login_history import LoginHistory
from app.schemas.user import UserResponse

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/admin-only", response_model=UserResponse)
def admin_only_route(current_user: User = Depends(require_role(UserRole.admin))):
    return current_user


@router.get("/login-history")
def get_login_history(
    current_user: User = Depends(require_role(UserRole.admin)),
    db: Session = Depends(get_db),
):
    records = (
        db.query(LoginHistory)
        .order_by(LoginHistory.logged_in_at.desc())
        .limit(100)
        .all()
    )
    return [
        {
            "username": r.username,
            "ip_address": r.ip_address,
            "logged_in_at": r.logged_in_at,
        }
        for r in records
    ]