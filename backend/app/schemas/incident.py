from pydantic import BaseModel


class IncidentCreate(BaseModel):
    title: str
    alert_ids: list[str]


class IncidentStatusUpdate(BaseModel):
    status: str
    note: str | None = None


class IncidentAssign(BaseModel):
    assigned_to: str