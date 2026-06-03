from datetime import datetime
from pydantic import BaseModel
from app.models.account import AccountType, BankConnectionStatus


class BankConnectionCreate(BaseModel):
    bank_name: str = "Crédit Agricole"


class BankConnectionRead(BaseModel):
    id: int
    bank_name: str
    status: BankConnectionStatus
    last_sync_at: datetime | None

    model_config = {"from_attributes": True}


class AccountRead(BaseModel):
    id: int
    name: str
    account_type: AccountType
    balance: float
    currency: str
    iban: str | None
    is_active: bool
    last_sync_at: datetime | None

    model_config = {"from_attributes": True}
