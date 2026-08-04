import os
import sys
import secrets
from datetime import timedelta

class Settings:
    APP_NAME: str = "SupervisorPDF"
    VERSION: str = "1.0.0"
    DEBUG: bool = False

    JWT_SECRET: str = os.getenv("JWT_SECRET", secrets.token_hex(32))
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
    ]

    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_LOGIN_PER_MINUTE: int = 5

    AUDIT_LOG_ENABLED: bool = True

    SENSITIVE_FIELDS: list = ["password", "password_hash", "token", "secret", "jwt"]

settings = Settings()
