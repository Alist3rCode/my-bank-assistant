from datetime import datetime, date
from sqlalchemy import String, Float, DateTime, Date, ForeignKey, Boolean, Text, JSON, Enum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.core.database import Base


class TransactionCategory(str, enum.Enum):
    ALIMENTATION = "alimentation"
    TRANSPORT = "transport"
    LOGEMENT = "logement"
    SANTE = "sante"
    LOISIRS = "loisirs"
    SHOPPING = "shopping"
    ABONNEMENTS = "abonnements"
    REVENUS = "revenus"
    EPARGNE = "epargne"
    IMPOTS = "impots"
    RESTAURANTS = "restaurants"
    VOYAGES = "voyages"
    EDUCATION = "education"
    AUTRE = "autre"


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    bridge_transaction_id: Mapped[int | None] = mapped_column()
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="EUR")
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    clean_description: Mapped[str | None] = mapped_column(String(500))
    merchant_name: Mapped[str | None] = mapped_column(String(255))
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    value_date: Mapped[date | None] = mapped_column(Date)
    category: Mapped[TransactionCategory] = mapped_column(Enum(TransactionCategory), default=TransactionCategory.AUTRE)
    ai_category: Mapped[str | None] = mapped_column(String(100))
    ai_tags: Mapped[list | None] = mapped_column(JSON)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    recurrence_label: Mapped[str | None] = mapped_column(String(255))
    is_anomaly: Mapped[bool] = mapped_column(Boolean, default=False)
    anomaly_reason: Mapped[str | None] = mapped_column(Text)
    note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="transactions")
    account = relationship("Account", back_populates="transactions")
