"""
Regroupe toutes les analyses IA : anomalies, projections, simulation de projets,
détecteur d'économies cachées, simulateur de vie.
"""
import json
from datetime import date, timedelta
from app.services.groq_service import chat


# ── Anomaly detection ──────────────────────────────────────────────────────────

def detect_anomalies(transactions: list[dict]) -> list[dict]:
    """
    Analyse un historique de transactions pour détecter des anomalies :
    montants inhabituels, hausses de prix récurrentes, doublons suspects.
    Retourne une liste d'anomalies avec explication.
    """
    if not transactions:
        return []

    sample = transactions[-90:] if len(transactions) > 90 else transactions
    payload = json.dumps(sample, default=str, ensure_ascii=False)

    messages = [
        {
            "role": "system",
            "content": (
                "Tu es un expert en détection de fraudes et anomalies bancaires. "
                "Analyse les transactions et retourne un tableau JSON d'anomalies. "
                "Chaque anomalie : {transaction_id, reason, severity: 'low'|'medium'|'high'}. "
                "Ne retourne QUE le JSON, aucun texte autour."
            ),
        },
        {"role": "user", "content": f"Transactions (JSON) :\n{payload}"},
    ]
    raw = chat(messages, max_tokens=1024)
    try:
        return json.loads(raw.strip())
    except json.JSONDecodeError:
        return []


# ── Cash flow prediction ───────────────────────────────────────────────────────

def predict_cashflow(transactions: list[dict], current_balance: float, horizon_days: int = 30) -> dict:
    """
    Prédit le solde futur sur `horizon_days` jours basé sur l'historique.
    Retourne : {predicted_balance, low_risk_date, negative_risk_date, recurring_expenses, insights}
    """
    payload = json.dumps(transactions[-60:], default=str, ensure_ascii=False)
    today = date.today().isoformat()
    end_date = (date.today() + timedelta(days=horizon_days)).isoformat()

    messages = [
        {
            "role": "system",
            "content": (
                "Tu es un expert en trésorerie personnelle. "
                f"Aujourd'hui : {today}. Solde actuel : {current_balance}€. "
                f"Prévision sur {horizon_days} jours (jusqu'au {end_date}). "
                "Analyse les transactions récurrentes et ponctuelles. "
                "Retourne un JSON : {predicted_balance, confidence_pct, "
                "recurring_total_monthly, top_risks: [{label, amount, date}], "
                "insights: [string]}. JSON uniquement."
            ),
        },
        {"role": "user", "content": f"Historique transactions :\n{payload}"},
    ]
    raw = chat(messages, max_tokens=1024)
    try:
        return json.loads(raw.strip())
    except json.JSONDecodeError:
        return {"predicted_balance": current_balance, "insights": [], "top_risks": []}


# ── Project simulation ─────────────────────────────────────────────────────────

def simulate_project(
    project_name: str,
    target_amount: float,
    saved_amount: float,
    monthly_income: float,
    monthly_expenses: float,
    monthly_contribution: float | None,
) -> dict:
    """
    Simule un projet d'épargne (ex: moto, voiture) avec ajustements dynamiques.
    Retourne : {months_to_goal, reach_date, suggested_monthly, scenarios, tips}
    """
    today = date.today().isoformat()
    available = monthly_income - monthly_expenses

    messages = [
        {
            "role": "system",
            "content": (
                "Tu es un planificateur financier personnel. "
                f"Aujourd'hui : {today}. "
                "Génère une simulation complète pour atteindre un objectif d'épargne. "
                "Retourne un JSON : {months_to_goal, reach_date, suggested_monthly, "
                "scenarios: [{label, monthly_saving, months, reach_date}], "
                "tips: [string], feasibility: 'easy'|'moderate'|'hard'}. JSON uniquement."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Projet : {project_name}\n"
                f"Objectif : {target_amount}€\n"
                f"Déjà épargné : {saved_amount}€\n"
                f"Revenus mensuels : {monthly_income}€\n"
                f"Dépenses mensuelles : {monthly_expenses}€\n"
                f"Disponible par mois : {available:.2f}€\n"
                f"Contribution prévue par mois : {monthly_contribution or 'non définie'}€"
            ),
        },
    ]
    raw = chat(messages, max_tokens=1024)
    try:
        return json.loads(raw.strip())
    except json.JSONDecodeError:
        return {"months_to_goal": None, "scenarios": [], "tips": []}


# ── Hidden savings detector ────────────────────────────────────────────────────

def detect_hidden_savings(transactions: list[dict]) -> list[dict]:
    """
    Analyse les abonnements et dépenses récurrentes pour trouver des économies.
    Retourne : [{label, current_amount, potential_saving, suggestion, priority}]
    """
    payload = json.dumps(transactions[-180:], default=str, ensure_ascii=False)

    messages = [
        {
            "role": "system",
            "content": (
                "Tu es un conseiller en optimisation budgétaire. "
                "Analyse les abonnements et dépenses récurrentes. "
                "Identifie : doublons, services inutilisés, prix trop élevés, alternatives moins chères. "
                "Retourne un tableau JSON : [{label, current_monthly_cost, potential_saving, "
                "suggestion, priority: 'high'|'medium'|'low'}]. JSON uniquement."
            ),
        },
        {"role": "user", "content": f"Transactions :\n{payload}"},
    ]
    raw = chat(messages, max_tokens=1024)
    try:
        return json.loads(raw.strip())
    except json.JSONDecodeError:
        return []


# ── Life change simulator ──────────────────────────────────────────────────────

def simulate_life_change(
    current_budget: dict,
    change_description: str,
    purchase_goal: str | None = None,
) -> dict:
    """
    Simule l'impact d'un changement de vie (bébé, déménagement, augmentation)
    sur le budget et la faisabilité d'un achat.
    Retourne : {new_monthly_balance, impact_analysis, feasibility, advice}
    """
    messages = [
        {
            "role": "system",
            "content": (
                "Tu es un conseiller financier familial expert. "
                "Analyse l'impact d'un changement de vie sur le budget. "
                "Retourne un JSON : {new_monthly_balance, impact_breakdown: [{label, amount_change}], "
                "feasibility_of_purchase: 'yes'|'maybe'|'no', months_delay_for_purchase, "
                "advice: [string], risk_level: 'low'|'medium'|'high'}. JSON uniquement."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Budget actuel : {json.dumps(current_budget, ensure_ascii=False)}\n"
                f"Changement de vie : {change_description}\n"
                f"Achat envisagé : {purchase_goal or 'aucun'}"
            ),
        },
    ]
    raw = chat(messages, max_tokens=1024)
    try:
        return json.loads(raw.strip())
    except json.JSONDecodeError:
        return {"advice": [], "impact_breakdown": []}
