from fastapi import APIRouter, Depends, HTTPException
from app.api.deps import get_current_user
from app.models.user import User
from app.services.threat_intel import lookup_ip

router = APIRouter(prefix="/threat-intel", tags=["Threat Intelligence"])


@router.get("/ip/{ip_address}")
async def get_ip_lookup(ip_address: str, current_user: User = Depends(get_current_user)):
    parts = ip_address.split(".")
    if len(parts) != 4 or not all(p.isdigit() and 0 <= int(p) <= 255 for p in parts):
        raise HTTPException(status_code=400, detail="Invalid IPv4 address format")

    return await lookup_ip(ip_address)