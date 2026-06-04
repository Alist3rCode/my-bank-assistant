from datetime import datetime
from sqlalchemy import String, Float, DateTime, ForeignKey, Enum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.core.database import Base


class BankConnectionStatus(str, enum.Enum):
    ACTIVE = "active"
    ERROR = "error"
    PENDING = "pending"
    REVOKED = "revoked"


class AccountType(str, enum.Enum):
    CHECKING = "checking"
    SAVINGS = "savings"
    CREDIT = "credit"
    INVESTMENT = "investment"


class BankConnection(Base):
    __tablename__ = "bank_connections"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    bridge_item_id: Mapped[int | None] = mapped_column()
    bridge_item_uuid: Mapped[str | None] = mapped_column(String(255))
    bank_name: Mapped[str] = mapped_column(String(255), default="Crédit Agricole")
    status: Mapped[BankConnectionStatus] = mapped_column(Enum(BankConnectionStatus, native_enum=False), default=BankConnectionStatus.PENDING)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="bank_connections")
    accounts = relationship("Account", back_populates="connection", cascade="all, delete-orphan")


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    connection_id: Mapped[int | None] = mapped_column(ForeignKey("bank_connections.id"))
    bridge_account_id: Mapped[int | None] = mapped_column()
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    account_type: Mapped[AccountType] = mapped_column(Enum(AccountType, native_enum=False), default=AccountType.CHECKING)
    balance: Mapped[float] = mapped_column(Float, default=0.0)
    currency: Mapped[str] = mapped_column(String(3), default="EUR")
    iban: Mapped[str | None] = mapped_column(String(34))
    is_active: Mapped[bool] = mapped_column(default=True)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="accounts")
    connection = relationship("BankConnection", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")
