from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text, Enum, JSON, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.core.database import Base


class InsightType(str, enum.Enum):
    ANOMALY = "anomaly"
    PREDICTION = "prediction"
    CATEGORIZATION = "categorization"
    SAVINGS_OPPORTUNITY = "savings_opportunity"
    BUDGET_ALERT = "budget_alert"
    RECURRING_DETECTED = "recurring_detected"
    PRICE_INCREASE = "price_increase"
    GOAL_UPDATE = "goal_update"
    SCENARIO = "scenario"


class InsightSeverity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AIInsight(Base):
    __tablename__ = "ai_insights"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    insight_type: Mapped[InsightType] = mapped_column(Enum(InsightType), nullable=False)
    severity: Mapped[InsightSeverity] = mapped_column(Enum(InsightSeverity), default=InsightSeverity.INFO)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    payload: Mapped[dict | None] = mapped_column(JSON)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    is_dismissed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="ai_insights")
