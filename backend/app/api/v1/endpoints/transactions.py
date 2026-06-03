from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import date
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.transaction import Transaction, TransactionCategory
from app.schemas.transaction import TransactionRead, TransactionCreate, TransactionUpdate
from app.services.ai_categorizer import categorize_transaction

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("/", response_model=list[TransactionRead])
def list_transactions(
    account_id: int | None = Query(None),
    category: TransactionCategory | None = Query(None),
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    search: str | None = Query(None),
    limit: int = Query(50, le=500),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    if account_id:
        q = q.filter(Transaction.account_id == account_id)
    if category:
        q = q.filter(Transaction.category == category)
    if from_date:
        q = q.filter(Transaction.transaction_date >= from_date)
    if to_date:
        q = q.filter(Transaction.transaction_date <= to_date)
    if search:
        q = q.filter(Transaction.description.ilike(f"%{search}%"))
    return q.order_by(desc(Transaction.transaction_date)).offset(offset).limit(limit).all()


@router.post("/", response_model=TransactionRead, status_code=201)
def create_transaction(
    data: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tx = Transaction(user_id=current_user.id, **data.model_dump())
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


@router.patch("/{transaction_id}", response_model=TransactionRead)
def update_transaction(
    transaction_id: int,
    data: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tx = db.query(Transaction).filter(Transaction.id == transaction_id, Transaction.user_id == current_user.id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction introuvable")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(tx, field, value)
    db.commit()
    db.refresh(tx)
    return tx


@router.post("/{transaction_id}/categorize")
def ai_categorize(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Re-catégorise une transaction via l'IA."""
    tx = db.query(Transaction).filter(Transaction.id == transaction_id, Transaction.user_id == current_user.id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction introuvable")

    result = categorize_transaction(tx.description, tx.amount)
    tx.ai_category = result.get("category")
    tx.clean_description = result.get("clean_description")
    tx.merchant_name = result.get("merchant_name")
    tx.ai_tags = result.get("tags")
    tx.is_recurring = result.get("is_recurring", False)
    tx.recurrence_label = result.get("recurrence_label")
    db.commit()
    db.refresh(tx)
    return tx


@router.get("/stats/monthly")
def monthly_stats(
    year: int = Query(...),
    month: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy import func, extract
    rows = (
        db.query(Transaction.category, func.sum(Transaction.amount).label("total"))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.amount < 0,
            extract("year", Transaction.transaction_date) == year,
            extract("month", Transaction.transaction_date) == month,
        )
        .group_by(Transaction.category)
        .all()
    )
    return [{"category": r.category, "total": abs(r.total)} for r in rows]
