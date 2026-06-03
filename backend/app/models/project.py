from datetime import datetime, date
from sqlalchemy import String, Float, DateTime, Date, ForeignKey, Text, Enum, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.core.database import Base


class ProjectStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"


class ProjectPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    emoji: Mapped[str | None] = mapped_column(String(10))
    target_amount: Mapped[float] = mapped_column(Float, nullable=False)
    saved_amount: Mapped[float] = mapped_column(Float, default=0.0)
    monthly_contribution: Mapped[float | None] = mapped_column(Float)
    deadline: Mapped[date | None] = mapped_column(Date)
    status: Mapped[ProjectStatus] = mapped_column(Enum(ProjectStatus), default=ProjectStatus.ACTIVE)
    priority: Mapped[ProjectPriority] = mapped_column(Enum(ProjectPriority), default=ProjectPriority.MEDIUM)
    ai_simulation: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="projects")
    saving_allocations = relationship("ProjectSavingAllocation", back_populates="project", cascade="all, delete-orphan")

    @property
    def progress_percent(self) -> float:
        if self.target_amount == 0:
            return 0.0
        return min(100.0, (self.saved_amount / self.target_amount) * 100)


class ProjectSavingAllocation(Base):
    __tablename__ = "project_saving_allocations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False)
    saving_id: Mapped[int] = mapped_column(ForeignKey("savings.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    allocated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    note: Mapped[str | None] = mapped_column(Text)

    project = relationship("Project", back_populates="saving_allocations")
    saving = relationship("Saving", back_populates="project_allocations")
