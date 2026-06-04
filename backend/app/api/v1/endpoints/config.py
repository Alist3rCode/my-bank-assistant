from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Any
from app.core.config import settings
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/config", tags=["config"])

# Resolved at import time: backend/app/api/v1/endpoints/ -> 4 parents up -> backend/
_ENV_FILE = Path(__file__).resolve().parents[4] / ".env"

_ALLOWED_KEYS: set[str] = {
    "APP_NAME", "DEBUG", "VERSION",
    "DATABASE_URL",
    "SECRET_KEY", "ALGORITHM", "ACCESS_TOKEN_EXPIRE_MINUTES",
    "GROQ_API_KEY", "GROQ_MODEL_FAST", "GROQ_MODEL_SMART",
    "BRIDGE_CLIENT_ID", "BRIDGE_CLIENT_SECRET", "BRIDGE_API_URL",
    "REDIS_URL",
    "FIRST_USER_EMAIL", "FIRST_USER_PASSWORD", "FIRST_USER_NAME",
    "CORS_ORIGINS",
}


def _parse_env_file() -> dict[str, str]:
    if not _ENV_FILE.exists():
        return {}
    result: dict[str, str] = {}
    for line in _ENV_FILE.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, _, value = stripped.partition("=")
        result[key.strip()] = value.strip()
    return result


def _write_env_file(updates: dict[str, str]) -> None:
    """Merge updates into .env, preserving comments and original order."""
    existing_lines: list[str] = []
    if _ENV_FILE.exists():
        existing_lines = _ENV_FILE.read_text(encoding="utf-8").splitlines()

    written: set[str] = set()
    new_lines: list[str] = []

    for line in existing_lines:
        stripped = line.strip()
        if stripped and not stripped.startswith("#") and "=" in stripped:
            key = stripped.partition("=")[0].strip()
            if key in updates:
                new_lines.append(f"{key}={updates[key]}")
                written.add(key)
                continue
        new_lines.append(line)

    for key, value in updates.items():
        if key not in written:
            new_lines.append(f"{key}={value}")

    _ENV_FILE.write_text("\n".join(new_lines) + "\n", encoding="utf-8")


@router.get("/")
def read_config(current_user: User = Depends(get_current_user)) -> dict[str, Any]:
    return {
        "APP_NAME": settings.APP_NAME,
        "DEBUG": settings.DEBUG,
        "VERSION": settings.VERSION,
        "DATABASE_URL": settings.DATABASE_URL,
        "SECRET_KEY": settings.SECRET_KEY,
        "ALGORITHM": settings.ALGORITHM,
        "ACCESS_TOKEN_EXPIRE_MINUTES": settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        "GROQ_API_KEY": settings.GROQ_API_KEY,
        "GROQ_MODEL_FAST": settings.GROQ_MODEL_FAST,
        "GROQ_MODEL_SMART": settings.GROQ_MODEL_SMART,
        "BRIDGE_CLIENT_ID": settings.BRIDGE_CLIENT_ID,
        "BRIDGE_CLIENT_SECRET": settings.BRIDGE_CLIENT_SECRET,
        "BRIDGE_API_URL": settings.BRIDGE_API_URL,
        "REDIS_URL": settings.REDIS_URL,
        "FIRST_USER_EMAIL": settings.FIRST_USER_EMAIL,
        "FIRST_USER_PASSWORD": settings.FIRST_USER_PASSWORD,
        "FIRST_USER_NAME": settings.FIRST_USER_NAME,
        "CORS_ORIGINS": ",".join(settings.CORS_ORIGINS),
    }


@router.patch("/")
def update_config(
    updates: dict[str, str],
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    invalid = set(updates.keys()) - _ALLOWED_KEYS
    if invalid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Clés non reconnues : {sorted(invalid)}",
        )
    _write_env_file(updates)
    return {"written": sorted(updates.keys()), "restart_required": True}
