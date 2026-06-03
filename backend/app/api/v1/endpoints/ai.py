from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from app.models.ai_insight import AIInsight, InsightType, InsightSeverity
from app.schemas.ai_insight import AIInsightRead
from app.services.ai_analyst import detect_anomalies, predict_cashflow, detect_hidden_savings, simulate_life_change
from app.services.ai_categorizer import categorize_batch

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/insights", response_model=list[AIInsightRead])
def list_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(AIInsight)
        .filter(AIInsight.user_id == current_user.id, AIInsight.is_dismissed.is_(False))
        .order_by(AIInsight.created_at.desc())
        .limit(50)
        .all()
    )


@router.post("/insights/{insight_id}/read", status_code=204)
def mark_read(insight_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    insight = db.query(AIInsight).filter(AIInsight.id == insight_id, AIInsight.user_id == current_user.id).first()
    if insight:
        insight.is_read = True
        db.commit()


@router.post("/insights/{insight_id}/dismiss", status_code=204)
def dismiss_insight(insight_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    insight = db.query(AIInsight).filter(AIInsight.id == insight_id, AIInsight.user_id == current_user.id).first()
    if insight:
        insight.is_dismissed = True
        db.commit()


@router.post("/analyze/anomalies")
def analyze_anomalies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Détecte les anomalies dans les transactions récentes et crée des insights."""
    txs = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
        .order_by(Transaction.transaction_date.desc())
        .limit(200)
        .all()
    )
    tx_data = [
        {"id": t.id, "description": t.description, "amount": t.amount, "date": str(t.transaction_date)}
        for t in txs
    ]

    anomalies = detect_anomalies(tx_data)

    for anomaly in anomalies:
        tx_id = anomaly.get("transaction_id")
        if tx_id:
            tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
            if tx:
                tx.is_anomaly = True
                tx.anomaly_reason = anomaly.get("reason")

        severity_map = {"high": InsightSeverity.CRITICAL, "medium": InsightSeverity.WARNING, "low": InsightSeverity.INFO}
        insight = AIInsight(
            user_id=current_user.id,
            insight_type=InsightType.ANOMALY,
            severity=severity_map.get(anomaly.get("severity", "low"), InsightSeverity.INFO),
            title="Anomalie détectée",
            description=anomaly.get("reason", "Transaction suspecte détectée"),
            payload=anomaly,
        )
        db.add(insight)

    db.commit()
    return {"anomalies_found": len(anomalies)}


@router.post("/analyze/cashflow")
def analyze_cashflow(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Prédit la trésorerie des 30 prochains jours."""
    from sqlalchemy import func
    from app.models.account import Account

    total_balance = db.query(func.sum(Account.balance)).filter(
        Account.user_id == current_user.id,
        Account.is_active.is_(True),
    ).scalar() or 0.0

    txs = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
        .order_by(Transaction.transaction_date.desc())
        .limit(120)
        .all()
    )
    tx_data = [
        {"description": t.description, "amount": t.amount, "date": str(t.transaction_date), "category": t.category.value}
        for t in txs
    ]

    prediction = predict_cashflow(tx_data, total_balance)

    insight = AIInsight(
        user_id=current_user.id,
        insight_type=InsightType.PREDICTION,
        severity=InsightSeverity.INFO,
        title="Projection trésorerie 30 jours",
        description=f"Solde prévu dans 30 jours : {prediction.get('predicted_balance', '?')}€",
        payload=prediction,
    )
    db.add(insight)
    db.commit()
    return prediction


@router.post("/analyze/hidden-savings")
def analyze_hidden_savings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Détecte les économies potentielles sur abonnements et dépenses récurrentes."""
    txs = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id, Transaction.is_recurring.is_(True))
        .order_by(Transaction.transaction_date.desc())
        .limit(300)
        .all()
    )
    tx_data = [
        {"description": t.description, "amount": t.amount, "date": str(t.transaction_date), "label": t.recurrence_label}
        for t in txs
    ]

    opportunities = detect_hidden_savings(tx_data)

    for opp in opportunities:
        saving = opp.get("potential_saving", 0)
        insight = AIInsight(
            user_id=current_user.id,
            insight_type=InsightType.SAVINGS_OPPORTUNITY,
            severity=InsightSeverity.INFO if saving < 20 else InsightSeverity.WARNING,
            title=f"Économie possible : {opp.get('label', '')}",
            description=opp.get("suggestion", ""),
            payload=opp,
        )
        db.add(insight)

    db.commit()
    return {"opportunities_found": len(opportunities), "opportunities": opportunities}


class LifeChangeRequest(BaseModel):
    change_description: str
    purchase_goal: str | None = None


@router.post("/simulate/life-change")
def life_change_simulation(
    data: LifeChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Simule l'impact d'un changement de vie sur le budget."""
    from sqlalchemy import func, extract
    from datetime import date

    now = date.today()
    monthly_income = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == current_user.id,
        Transaction.amount > 0,
        extract("month", Transaction.transaction_date) == now.month,
        extract("year", Transaction.transaction_date) == now.year,
    ).scalar() or 0.0

    monthly_expenses = abs(db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == current_user.id,
        Transaction.amount < 0,
        extract("month", Transaction.transaction_date) == now.month,
        extract("year", Transaction.transaction_date) == now.year,
    ).scalar() or 0.0)

    current_budget = {
        "monthly_income": monthly_income,
        "monthly_expenses": monthly_expenses,
        "monthly_net": monthly_income - monthly_expenses,
    }

    result = simulate_life_change(current_budget, data.change_description, data.purchase_goal)
    return result


@router.post("/categorize/batch")
def batch_categorize(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Catégorise toutes les transactions sans catégorie IA."""
    txs = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id, Transaction.ai_category.is_(None))
        .limit(50)
        .all()
    )
    if not txs:
        return {"message": "Toutes les transactions sont déjà catégorisées", "processed": 0}

    tx_data = [{"description": t.description, "amount": t.amount} for t in txs]
    results = categorize_batch(tx_data)

    for tx, result in zip(txs, results):
        tx.ai_category = result.get("category")
        tx.clean_description = result.get("clean_description")
        tx.merchant_name = result.get("merchant_name")
        tx.ai_tags = result.get("tags")
        tx.is_recurring = result.get("is_recurring", False)
        tx.recurrence_label = result.get("recurrence_label")

    db.commit()
    return {"processed": len(txs)}
