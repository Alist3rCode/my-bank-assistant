from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.account import Account, BankConnection, BankConnectionStatus
from app.models.transaction import Transaction
from app.schemas.account import AccountRead, BankConnectionRead
from app.services.bridge_service import bridge_service
from datetime import datetime, timezone

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("/", response_model=list[AccountRead])
def list_accounts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Account).filter(Account.user_id == current_user.id, Account.is_active.is_(True)).all()


@router.get("/{account_id}", response_model=AccountRead)
def get_account(account_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Compte introuvable")
    return account


@router.get("/connections/", response_model=list[BankConnectionRead])
def list_connections(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(BankConnection).filter(BankConnection.user_id == current_user.id).all()


@router.post("/sync/{account_id}")
def sync_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Synchronise les transactions d'un compte via Bridge API."""
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Compte introuvable")

    # TODO: récupérer l'access_token Bridge de l'utilisateur (stocké de façon sécurisée)
    # Pour l'instant, retourne un message de placeholder
    account.last_sync_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Synchronisation en cours", "account_id": account_id}


@router.get("/{account_id}/summary")
def account_summary(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Compte introuvable")

    from sqlalchemy import func, extract
    from datetime import date
    now = date.today()

    monthly_income = db.query(func.sum(Transaction.amount)).filter(
        Transaction.account_id == account_id,
        Transaction.amount > 0,
        extract("month", Transaction.transaction_date) == now.month,
        extract("year", Transaction.transaction_date) == now.year,
    ).scalar() or 0.0

    monthly_expenses = db.query(func.sum(Transaction.amount)).filter(
        Transaction.account_id == account_id,
        Transaction.amount < 0,
        extract("month", Transaction.transaction_date) == now.month,
        extract("year", Transaction.transaction_date) == now.year,
    ).scalar() or 0.0

    return {
        "account_id": account_id,
        "balance": account.balance,
        "monthly_income": monthly_income,
        "monthly_expenses": abs(monthly_expenses),
        "monthly_net": monthly_income + monthly_expenses,
    }
