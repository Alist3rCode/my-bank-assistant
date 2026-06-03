from datetime import datetime, date
from pydantic import BaseModel
from app.models.project import ProjectStatus, ProjectPriority


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    emoji: str | None = None
    target_amount: float
    monthly_contribution: float | None = None
    deadline: date | None = None
    priority: ProjectPriority = ProjectPriority.MEDIUM


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    emoji: str | None = None
    target_amount: float | None = None
    monthly_contribution: float | None = None
    deadline: date | None = None
    status: ProjectStatus | None = None
    priority: ProjectPriority | None = None


class ProjectSavingAllocationCreate(BaseModel):
    saving_id: int
    amount: float
    note: str | None = None


class ProjectRead(BaseModel):
    id: int
    name: str
    description: str | None
    emoji: str | None
    target_amount: float
    saved_amount: float
    monthly_contribution: float | None
    deadline: date | None
    status: ProjectStatus
    priority: ProjectPriority
    progress_percent: float
    ai_simulation: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}
