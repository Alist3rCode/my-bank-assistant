from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.account import Account, AccountType, BankConnection, BankConnectionStatus
from app.models.transaction import Transaction
from app.schemas.account import (
    AccountRead, BankConnectionRead,
    ConnectStartRequest, ConnectStartResponse,
    ConnectCallbackRequest, ConnectCallbackResponse,
)
from app.services.bridge_service import bridge_service
from app.core.config import settings
from datetime import datetime, timezone
import httpx

router = APIRouter(prefix="/accounts", tags=["accounts"])

_BRIDGE_ACCOUNT_TYPE_MAP = {
    1: AccountType.CHECKING,
    2: AccountType.SAVINGS,
    3: AccountType.CREDIT,
    4: AccountType.INVESTMENT,
}


@router.post("/connect/start", response_model=ConnectStartResponse)
def connect_start(
    body: ConnectStartRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Démarre le flux Bridge Connect : crée l'utilisateur Bridge si besoin et retourne l'URL de connexion."""
    if not settings.BRIDGE_CLIENT_ID or not settings.BRIDGE_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="Bridge API non configurée")

    try:
        if not current_user.bridge_user_uuid:
            bridge_data = bridge_service.create_bridge_user(str(current_user.id))
            current_user.bridge_user_uuid = bridge_data["uuid"]
            db.commit()

        connect_url = bridge_service.get_connect_url(
            user_uuid=current_user.bridge_user_uuid,
            redirect_url=body.redirect_url,
        )
        return ConnectStartResponse(connect_url=connect_url)
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Erreur Bridge API : {e.response.text}")


@router.post("/connect/callback", response_model=ConnectCallbackResponse)
def connect_callback(
    body: ConnectCallbackRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Finalise la connexion bancaire après le retour Bridge Connect."""
    if not current_user.bridge_user_uuid:
        raise HTTPException(status_code=400, detail="Aucun utilisateur Bridge associé")

    try:
        access_token = bridge_service.get_user_access_token(current_user.bridge_user_uuid)
        current_user.bridge_access_token = access_token
        db.flush()

        item = bridge_service.get_item_by_uuid(current_user.bridge_user_uuid, body.item_uuid)
        item_id = item.get("id")
        bank_name = item.get("bank", {}).get("name", "Banque")

        connection = db.query(BankConnection).filter(
            BankConnection.user_id == current_user.id,
            BankConnection.bridge_item_uuid == body.item_uuid,
        ).first()

        if not connection:
            connection = BankConnection(
                user_id=current_user.id,
                bridge_item_id=item_id,
                bridge_item_uuid=body.item_uuid,
                bank_name=bank_name,
                status=BankConnectionStatus.ACTIVE,
                last_sync_at=datetime.now(timezone.utc),
            )
            db.add(connection)
            db.flush()
        else:
            connection.status = BankConnectionStatus.ACTIVE
            connection.last_sync_at = datetime.now(timezone.utc)

        bridge_accounts = bridge_service.list_accounts(access_token)
        accounts_synced = 0

        for ba in bridge_accounts:
            if ba.get("item", {}).get("uuid") != body.item_uuid:
                continue

            bridge_account_id = ba["id"]
            existing = db.query(Account).filter(
                Account.user_id == current_user.id,
                Account.bridge_account_id == bridge_account_id,
            ).first()

            account_type = _BRIDGE_ACCOUNT_TYPE_MAP.get(
                ba.get("type", {}).get("id", 1), AccountType.CHECKING
            )

            if existing:
                existing.balance = ba.get("balance", existing.balance)
                existing.last_sync_at = datetime.now(timezone.utc)
            else:
                db.add(Account(
                    user_id=current_user.id,
                    connection_id=connection.id,
                    bridge_account_id=bridge_account_id,
                    name=ba.get("name", "Compte"),
                    account_type=account_type,
                    balance=ba.get("balance", 0.0),
                    currency=ba.get("currency_code", "EUR"),
                    iban=ba.get("iban"),
                ))
                accounts_synced += 1

        db.commit()
        return ConnectCallbackResponse(
            connection_id=connection.id,
            bank_name=bank_name,
            accounts_count=accounts_synced,
        )
    except httpx.HTTPStatusError as e:
        db.rollback()
        raise HTTPException(status_code=502, detail=f"Erreur Bridge API : {e.response.text}")


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

    if not current_user.bridge_access_token:
        raise HTTPException(status_code=400, detail="Aucun accès Bridge configuré pour cet utilisateur")

    try:
        from app.models.transaction import Transaction as TxModel

        since = account.last_sync_at
        bridge_txs = bridge_service.list_transactions(
            user_access_token=current_user.bridge_access_token,
            account_id=account.bridge_account_id,
            since=since,
            limit=500,
        )

        new_count = 0
        for bt in bridge_txs:
            bridge_tx_id = bt.get("id")
            if not bridge_tx_id:
                continue
            if db.query(TxModel).filter(TxModel.bridge_transaction_id == bridge_tx_id).first():
                continue

            from datetime import date
            tx_date_str = bt.get("date") or bt.get("transaction_date")
            try:
                tx_date = date.fromisoformat(tx_date_str) if tx_date_str else date.today()
            except ValueError:
                tx_date = date.today()

            db.add(TxModel(
                user_id=current_user.id,
                account_id=account.id,
                bridge_transaction_id=bridge_tx_id,
                amount=bt.get("amount", 0.0),
                currency=bt.get("currency_code", "EUR"),
                description=bt.get("description") or bt.get("label") or "",
                clean_description=bt.get("clean_description"),
                merchant_name=bt.get("merchant_name"),
                transaction_date=tx_date,
                category="autre",
            ))
            new_count += 1

        account.last_sync_at = datetime.now(timezone.utc)
        db.commit()
        return {"message": "Synchronisation terminée", "account_id": account_id, "new_transactions": new_count}
    except httpx.HTTPStatusError as e:
        db.rollback()
        raise HTTPException(status_code=502, detail=f"Erreur Bridge API : {e.response.text}")


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
