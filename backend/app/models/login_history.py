import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db.postgres import Base


class LoginHistory(Base):
    __tablename__ = "login_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    username = Column(String(50), nullable=False)
    ip_address = Column(String(45), nullable=True)
    logged_in_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))