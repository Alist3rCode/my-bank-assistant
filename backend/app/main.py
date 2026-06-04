from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_router
import logging

logging.basicConfig(level=logging.INFO)


def _seed_first_user() -> None:
    if not settings.FIRST_USER_EMAIL or not settings.FIRST_USER_PASSWORD:
        return
    from app.core.database import SessionLocal
    from app.core.security import hash_password
    from app.models.user import User
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.email == settings.FIRST_USER_EMAIL).first():
            db.add(User(
                email=settings.FIRST_USER_EMAIL,
                hashed_password=hash_password(settings.FIRST_USER_PASSWORD),
                full_name=settings.FIRST_USER_NAME,
                is_superuser=True,
            ))
            db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _seed_first_user()
    yield


app = FastAPI(
    lifespan=lifespan,
    title=settings.APP_NAME,
    version=settings.VERSION,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health")
def health():
    return {"status": "ok", "version": settings.VERSION}
