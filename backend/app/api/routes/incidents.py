from fastapi import APIRouter, Depends, HTTPException, Query
from app.api.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.schemas.incident import IncidentCreate, IncidentStatusUpdate, IncidentAssign
from app.services.incidents import (
    create_incident, list_incidents, get_incident,
    update_incident_status, assign_incident,
)

router = APIRouter(prefix="/incidents", tags=["Incidents"])


@router.post("/")
async def new_incident(
    payload: IncidentCreate,
    current_user: User = Depends(require_role(UserRole.soc_analyst, UserRole.admin)),
):
    try:
        return await create_incident(payload.alert_ids, payload.title, current_user.username)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/")
async def get_incidents(
    status: str | None = Query(None),
    current_user: User = Depends(get_current_user),
):
    return {"incidents": await list_incidents(status=status)}


@router.get("/{incident_id}")
async def get_single_incident(incident_id: str, current_user: User = Depends(get_current_user)):
    incident = await get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.patch("/{incident_id}/status")
async def change_incident_status(
    incident_id: str,
    update: IncidentStatusUpdate,
    current_user: User = Depends(require_role(UserRole.soc_analyst, UserRole.admin)),
):
    try:
        incident = await update_incident_status(incident_id, update.status, update.note, current_user.username)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.patch("/{incident_id}/assign")
async def assign_to_analyst(
    incident_id: str,
    assign: IncidentAssign,
    current_user: User = Depends(require_role(UserRole.soc_analyst, UserRole.admin)),
):
    incident = await assign_incident(incident_id, assign.assigned_to, current_user.username)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident