from datetime import datetime
from pydantic import BaseModel


class AlertNote(BaseModel):
    text: str
    author: str
    at: datetime


class FlowDetails(BaseModel):
    source_ip: str | None = None
    dest_ip: str | None = None
    src_port: int | None = None
    dst_port: int | None = None
    protocol: str | None = None
    actual_label: str | None = None


class AlertResponse(BaseModel):
    id: str
    created_at: datetime
    last_seen: datetime
    source: str
    risk_score: float
    risk_level: str
    attack_type: str | None
    attack_type_confidence: float | None
    status: str
    assigned_to: str | None
    occurrence_count: int
    notes: list[AlertNote]
    flow_details: FlowDetails


class AlertStatusUpdate(BaseModel):
    status: str
    note: str | None = None


class AlertAssign(BaseModel):
    assigned_to: str