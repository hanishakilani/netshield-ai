from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_current_user, require_role
from app.db.postgres import get_db
from app.models.user import User, UserRole
from app.models.login_history import LoginHistory
from app.schemas.user import UserResponse, UserRoleUpdate, UserActiveUpdate

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/assignable", response_model=list[UserResponse])
def list_assignable_users(
    current_user: User = Depends(require_role(UserRole.soc_analyst, UserRole.admin)),
    db: Session = Depends(get_db),
):
    return (
        db.query(User)
        .filter(User.role.in_([UserRole.soc_analyst, UserRole.admin]), User.is_active == True)
        .order_by(User.username)
        .all()
    )

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


@router.get("", response_model=list[UserResponse])
def list_all_users(
    current_user: User = Depends(require_role(UserRole.admin)),
    db: Session = Depends(get_db),
):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.patch("/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: str,
    update: UserRoleUpdate,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = update.role
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}/active", response_model=UserResponse)
def update_user_active(
    user_id: str,
    update: UserActiveUpdate,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: Session = Depends(get_db),
):
    if str(current_user.id) == user_id and not update.is_active:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = update.is_active
    db.commit()
    db.refresh(user)
    return user