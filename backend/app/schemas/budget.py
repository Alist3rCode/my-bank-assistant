from datetime import datetime
from pydantic import BaseModel
from app.models.transaction import TransactionCategory


class BudgetCreate(BaseModel):
    category: TransactionCategory
    monthly_limit: float
    month: int
    year: int
    alert_threshold: float = 0.8


class BudgetUpdate(BaseModel):
    monthly_limit: float | None = None
    alert_threshold: float | None = None


class BudgetRead(BaseModel):
    id: int
    category: TransactionCategory
    monthly_limit: float
    month: int
    year: int
    alert_threshold: float
    created_at: datetime

    model_config = {"from_attributes": True}


class BudgetWithSpent(BudgetRead):
    spent_amount: float
    remaining: float
    percent_used: float
