from datetime import datetime, date
from sqlalchemy import String, Float, DateTime, Date, ForeignKey, Text, Enum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.core.database import Base


class SavingType(str, enum.Enum):
    LIVRET_A = "livret_a"
    LIVRET_JEUNE = "livret_jeune"
    PEL = "pel"
    CEL = "cel"
    ASSURANCE_VIE = "assurance_vie"
    PEA = "pea"
    CASH = "cash"
    OTHER = "other"


class Saving(Base):
    __tablename__ = "savings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    saving_type: Mapped[SavingType] = mapped_column(Enum(SavingType), default=SavingType.CASH)
    current_amount: Mapped[float] = mapped_column(Float, default=0.0)
    target_amount: Mapped[float | None] = mapped_column(Float)
    interest_rate: Mapped[float] = mapped_column(Float, default=0.0)
    deadline: Mapped[date | None] = mapped_column(Date)
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="savings")
    project_allocations = relationship("ProjectSavingAllocation", back_populates="saving")
