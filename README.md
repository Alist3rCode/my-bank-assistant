# My Bank Assistant

Application de gestion de budget bancaire avec IA (Crédit Agricole via Bridge API).

## Stack

| Couche | Tech |
|--------|------|
| Backend | FastAPI + SQLAlchemy + Alembic |
| Base de données | PostgreSQL 16 |
| Cache | Redis 7 |
| Frontend | React 18 + Vite + TailwindCSS |
| IA | Groq (llama-3.3-70b / llama-3.1-8b) |
| Open Banking | Bridge API (DSP2) |
| Déploiement | Docker Compose + GitHub Actions |

## Démarrage rapide

```bash
cp .env.example .env
# Éditer .env avec vos clés GROQ_API_KEY, BRIDGE_CLIENT_ID, etc.
docker compose up -d
# Frontend : http://localhost:3000
# API docs : http://localhost:8000/docs (DEBUG=true)
```

## Migrations Alembic

```bash
# Créer une migration
docker compose exec backend alembic revision --autogenerate -m "description"
# Appliquer
docker compose exec backend alembic upgrade head
# Rollback
docker compose exec backend alembic downgrade -1
```

## Fonctionnalités IA

| Feature | Endpoint |
|---------|----------|
| Catégorisation batch | `POST /api/v1/ai/categorize/batch` |
| Détection anomalies | `POST /api/v1/ai/analyze/anomalies` |
| Projection trésorerie | `POST /api/v1/ai/analyze/cashflow` |
| Économies cachées | `POST /api/v1/ai/analyze/hidden-savings` |
| Simulation de projet | `POST /api/v1/projects/{id}/simulate` |
| Simulateur de vie | `POST /api/v1/ai/simulate/life-change` |

## CI/CD

- **CI** : lint + type-check + build Docker sur chaque push
- **CD** : deploy automatique sur VPS via SSH sur `main`

### Secrets GitHub requis

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | IP ou hostname du VPS |
| `VPS_USER` | Utilisateur SSH |
| `VPS_SSH_KEY` | Clé privée SSH |