from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    APP_NAME: str = "My Bank Assistant"
    DEBUG: bool = False
    VERSION: str = "1.0.0"

    DATABASE_URL: str = "postgresql://bankuser:bankpass@db:5432/bankdb"

    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h

    GROQ_API_KEY: str = ""
    GROQ_MODEL_FAST: str = "llama-3.1-8b-instant"
    GROQ_MODEL_SMART: str = "llama-3.3-70b-versatile"

    BRIDGE_CLIENT_ID: str = ""
    BRIDGE_CLIENT_SECRET: str = ""
    BRIDGE_API_URL: str = "https://api.bridgeapi.io/v3"

    REDIS_URL: str = "redis://redis:6379/0"

    FIRST_USER_EMAIL: str = ""
    FIRST_USER_PASSWORD: str = ""
    FIRST_USER_NAME: str = "Admin"

    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:80"]

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
