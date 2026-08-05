import os
import sys
import secrets
from datetime import timedelta


def _load_or_create_secret(env_name: str) -> str:
    env_val = os.getenv(env_name)
    if env_val:
        return env_val
    secret_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", ".jwt_secret")
    if os.path.exists(secret_file):
        with open(secret_file, "r", encoding="utf-8") as f:
            stored = f.read().strip()
            if stored:
                return stored
    generated = secrets.token_hex(32)
    try:
        os.makedirs(os.path.dirname(secret_file), exist_ok=True)
        with open(secret_file, "w", encoding="utf-8") as f:
            f.write(generated)
    except Exception:
        pass
    return generated


class Settings:
    APP_NAME: str = "SupervisorPDF"
    VERSION: str = "1.0.0"
    DEBUG: bool = False

    JWT_SECRET: str = _load_or_create_secret("JWT_SECRET")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION: timedelta = timedelta(hours=8)
    JWT_REFRESH_EXPIRATION: timedelta = timedelta(days=7)

    BCRYPT_ROUNDS: int = 12

    MAX_LOGIN_ATTEMPTS: int = 5
    LOGIN_LOCKOUT_MINUTES: int = 15

    ROLES: dict = {
        "admin": "Administrador completo",
        "operator": "Operador (procesar documentos)",
        "viewer": "Solo lectura",
    }

    MODULE_PERMISSIONS: dict = {
        "dashboard": ["admin", "operator", "viewer"],
        "infima-cuantia": ["admin", "operator", "viewer"],
        "process": ["admin", "operator", "viewer"],
        "providers": ["admin", "operator", "viewer"],
        "administradores": ["admin", "operator", "viewer"],
        "productos": ["admin", "operator", "viewer"],
        "reports": ["admin", "operator", "viewer"],
        "history": ["admin", "operator", "viewer"],
        "pac": ["admin", "operator", "viewer"],
        "ce": ["admin", "operator", "viewer"],
        "cam": ["admin", "operator", "viewer"],
        "config": ["admin"],
    }

    CSRF_ENABLED: bool = False

    ALLOWED_ORIGINS: list = [
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "https://supervisor-utj8.onrender.com",
    ]

    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_LOGIN_PER_MINUTE: int = 5

    AUDIT_LOG_ENABLED: bool = True

    SENSITIVE_FIELDS: list = ["password", "password_hash", "token", "secret", "jwt"]

settings = Settings()
