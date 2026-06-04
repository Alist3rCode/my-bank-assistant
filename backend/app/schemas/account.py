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


class BridgeConfigStatus(BaseModel):
    configured: bool
    missing_fields: list[str]


class ConnectStartRequest(BaseModel):
    redirect_url: str


class ConnectStartResponse(BaseModel):
    connect_url: str


class ConnectCallbackRequest(BaseModel):
    item_id: str


class ConnectCallbackResponse(BaseModel):
    connection_id: int
    bank_name: str
    accounts_count: int
