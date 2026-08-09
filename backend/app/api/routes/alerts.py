from fastapi import APIRouter, Depends, HTTPException, Query
from app.api.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.schemas.alert import AlertStatusUpdate, AlertAssign
from app.services.alerts import (
    list_alerts, get_alert, update_alert_status, assign_alert,
    alert_counts, threat_intelligence_report,
)

router = APIRouter(prefix="/alerts", tags=["Alerts"])

VALID_STATUSES = {"open", "acknowledged", "resolved", "false_positive"}


@router.get("/")
async def get_alerts(
    status: str | None = Query(None),
    risk_level: str | None = Query(None),
    limit: int = Query(100, le=500),
    current_user: User = Depends(get_current_user),
):
    alerts = await list_alerts(status=status, risk_level=risk_level, limit=limit)
    return {"alerts": alerts, "count": len(alerts)}


@router.get("/counts")
async def get_alert_counts(current_user: User = Depends(get_current_user)):
    return await alert_counts()


@router.get("/reports/threat-intelligence")
async def get_threat_intelligence_report(current_user: User = Depends(get_current_user)):
    return await threat_intelligence_report()


@router.get("/{alert_id}")
async def get_single_alert(alert_id: str, current_user: User = Depends(get_current_user)):
    alert = await get_alert(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.patch("/{alert_id}/status")
async def change_alert_status(
    alert_id: str,
    update: AlertStatusUpdate,
    current_user: User = Depends(require_role(UserRole.soc_analyst, UserRole.admin)),
):
    if update.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Status must be one of {VALID_STATUSES}")

    alert = await update_alert_status(alert_id, update.status, update.note, current_user.username)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.patch("/{alert_id}/assign")
async def assign_to_analyst(
    alert_id: str,
    assign: AlertAssign,
    current_user: User = Depends(require_role(UserRole.soc_analyst, UserRole.admin)),
):
    alert = await assign_alert(alert_id, assign.assigned_to)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert