from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.budget import Budget
from app.models.transaction import Transaction
from app.schemas.budget import BudgetCreate, BudgetUpdate, BudgetRead, BudgetWithSpent

router = APIRouter(prefix="/budgets", tags=["budgets"])


def _enrich_budget(budget: Budget, db: Session) -> BudgetWithSpent:
    spent = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == budget.user_id,
        Transaction.category == budget.category,
        Transaction.amount < 0,
        extract("month", Transaction.transaction_date) == budget.month,
        extract("year", Transaction.transaction_date) == budget.year,
    ).scalar() or 0.0
    spent_abs = abs(spent)
    return BudgetWithSpent(
        **BudgetRead.model_validate(budget).model_dump(),
        spent_amount=spent_abs,
        remaining=max(0.0, budget.monthly_limit - spent_abs),
        percent_used=min(100.0, (spent_abs / budget.monthly_limit * 100) if budget.monthly_limit else 0),
    )


@router.get("/", response_model=list[BudgetWithSpent])
def list_budgets(
    month: int = Query(...),
    year: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budgets = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.month == month,
        Budget.year == year,
    ).all()
    return [_enrich_budget(b, db) for b in budgets]


@router.post("/", response_model=BudgetWithSpent, status_code=201)
def create_budget(data: BudgetCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.category == data.category,
        Budget.month == data.month,
        Budget.year == data.year,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Budget déjà défini pour cette catégorie/mois")
    budget = Budget(user_id=current_user.id, **data.model_dump())
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return _enrich_budget(budget, db)


@router.patch("/{budget_id}", response_model=BudgetWithSpent)
def update_budget(
    budget_id: int,
    data: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budget = db.query(Budget).filter(Budget.id == budget_id, Budget.user_id == current_user.id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget introuvable")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(budget, field, value)
    db.commit()
    db.refresh(budget)
    return _enrich_budget(budget, db)


@router.delete("/{budget_id}", status_code=204)
def delete_budget(budget_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    budget = db.query(Budget).filter(Budget.id == budget_id, Budget.user_id == current_user.id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget introuvable")
    db.delete(budget)
    db.commit()
