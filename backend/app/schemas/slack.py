from pydantic import BaseModel


class SlackConfigUpdate(BaseModel):
    webhook_url: str | None = None
    enabled: bool
    min_severity: str


class SlackConfigResponse(BaseModel):
    enabled: bool
    min_severity: str
    webhook_configured: bool