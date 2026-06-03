from datetime import datetime
from pydantic import BaseModel
from app.models.ai_insight import InsightType, InsightSeverity


class AIInsightRead(BaseModel):
    id: int
    insight_type: InsightType
    severity: InsightSeverity
    title: str
    description: str
    payload: dict | None
    is_read: bool
    is_dismissed: bool
    created_at: datetime

    model_config = {"from_attributes": True}
