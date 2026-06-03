import json
from app.services.groq_service import chat_fast
from app.models.transaction import TransactionCategory

CATEGORIES = [c.value for c in TransactionCategory]

SYSTEM_PROMPT = f"""Tu es un assistant financier expert en catégorisation de transactions bancaires françaises.
Pour chaque transaction fournie, retourne un objet JSON avec :
- "category": une des valeurs suivantes UNIQUEMENT : {CATEGORIES}
- "clean_description": un libellé lisible (ex: "McDonald's" au lieu de "PAIEMENT CB MCDONALD'S 04921")
- "merchant_name": le nom du marchand si identifiable, sinon null
- "tags": liste de 1-3 tags descriptifs (ex: ["fast-food", "déjeuner"])
- "is_recurring": true si la transaction semble récurrente (abonnement, loyer, salaire)
- "recurrence_label": si récurrente, un label court (ex: "Netflix", "Loyer")

Réponds UNIQUEMENT avec le JSON, sans texte autour."""


def categorize_transaction(description: str, amount: float) -> dict:
    """Catégorise une transaction via Groq (modèle rapide)."""
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Transaction: '{description}', montant: {amount}€"},
    ]
    raw = chat_fast(messages, max_tokens=256)
    try:
        result = json.loads(raw.strip())
        if result.get("category") not in CATEGORIES:
            result["category"] = TransactionCategory.AUTRE.value
        return result
    except (json.JSONDecodeError, KeyError):
        return {
            "category": TransactionCategory.AUTRE.value,
            "clean_description": description,
            "merchant_name": None,
            "tags": [],
            "is_recurring": False,
            "recurrence_label": None,
        }


def categorize_batch(transactions: list[dict]) -> list[dict]:
    """Catégorise plusieurs transactions en un seul appel Groq."""
    if not transactions:
        return []

    lines = "\n".join(
        f"{i+1}. '{t['description']}', {t['amount']}€"
        for i, t in enumerate(transactions)
    )
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT.replace(
            "Pour chaque transaction fournie",
            "Pour CHAQUE transaction de la liste fournie",
        ) + "\nRetourne un tableau JSON d'objets, un par transaction, dans le même ordre."},
        {"role": "user", "content": f"Liste de transactions :\n{lines}"},
    ]
    raw = chat_fast(messages, max_tokens=min(512 * len(transactions), 4096))
    try:
        results = json.loads(raw.strip())
        if isinstance(results, list) and len(results) == len(transactions):
            return results
    except json.JSONDecodeError:
        pass
    return [categorize_transaction(t["description"], t["amount"]) for t in transactions]
