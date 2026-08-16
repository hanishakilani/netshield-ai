from fastapi import APIRouter, Depends
from app.api.deps import require_role
from app.models.user import User, UserRole
from app.schemas.slack import SlackConfigUpdate, SlackConfigResponse
from app.services.slack import get_slack_config_public, update_slack_config

router = APIRouter(prefix="/admin/settings", tags=["Admin Settings"])


@router.get("/slack", response_model=SlackConfigResponse)
async def read_slack_config(current_user: User = Depends(require_role(UserRole.admin))):
    return await get_slack_config_public()


@router.put("/slack", response_model=SlackConfigResponse)
async def write_slack_config(
    update: SlackConfigUpdate,
    current_user: User = Depends(require_role(UserRole.admin)),
):
    return await update_slack_config(update.webhook_url, update.enabled, update.min_severity)