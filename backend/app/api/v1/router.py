from fastapi import APIRouter
from app.api.v1.endpoints import auth, accounts, transactions, budgets, savings, projects, ai

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(accounts.router)
api_router.include_router(transactions.router)
api_router.include_router(budgets.router)
api_router.include_router(savings.router)
api_router.include_router(projects.router)
api_router.include_router(ai.router)
