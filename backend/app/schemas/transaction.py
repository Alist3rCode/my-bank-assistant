from datetime import datetime, date
from pydantic import BaseModel
from app.models.transaction import TransactionCategory


class TransactionCreate(BaseModel):
    account_id: int
    amount: float
    description: str
    transaction_date: date
    category: TransactionCategory = TransactionCategory.AUTRE
    note: str | None = None


class TransactionUpdate(BaseModel):
    category: TransactionCategory | None = None
    note: str | None = None
    merchant_name: str | None = None


class TransactionRead(BaseModel):
    id: int
    account_id: int
    amount: float
    currency: str
    description: str
    clean_description: str | None
    merchant_name: str | None
    transaction_date: date
    category: TransactionCategory
    ai_category: str | None
    ai_tags: list | None
    is_recurring: bool
    recurrence_label: str | None
    is_anomaly: bool
    note: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
