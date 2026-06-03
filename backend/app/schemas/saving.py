from datetime import datetime, date
from pydantic import BaseModel
from app.models.saving import SavingType


class SavingCreate(BaseModel):
    name: str
    saving_type: SavingType = SavingType.CASH
    current_amount: float = 0.0
    target_amount: float | None = None
    interest_rate: float = 0.0
    deadline: date | None = None
    description: str | None = None


class SavingUpdate(BaseModel):
    name: str | None = None
    current_amount: float | None = None
    target_amount: float | None = None
    interest_rate: float | None = None
    deadline: date | None = None
    description: str | None = None


class SavingRead(BaseModel):
    id: int
    name: str
    saving_type: SavingType
    current_amount: float
    target_amount: float | None
    interest_rate: float
    deadline: date | None
    description: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
