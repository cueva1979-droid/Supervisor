import uuid
import os
import secrets
import string
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt as pyjwt
from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from models import User, LoginAttempt, AuditLog
from config import settings

security = HTTPBearer(auto_error=False)

def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    response.set_cookie(
        key=settings.COOKIE_ACCESS_NAME,
        value=access_token,
        httponly=settings.COOKIE_HTTPONLY,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path=settings.COOKIE_PATH,
        max_age=int(settings.JWT_EXPIRATION.total_seconds()),
    )
    response.set_cookie(
        key=settings.COOKIE_REFRESH_NAME,
        value=refresh_token,
        httponly=settings.COOKIE_HTTPONLY,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path=settings.COOKIE_PATH,
        max_age=int(settings.JWT_REFRESH_EXPIRATION.total_seconds()),
    )

def set_csrf_cookie(response: Response, csrf_token: str) -> None:
    response.set_cookie(
        key=settings.COOKIE_CSRF_NAME,
        value=csrf_token,
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path=settings.COOKIE_PATH,
    )

def clear_auth_cookies(response: Response) -> None:
    for name in (settings.COOKIE_ACCESS_NAME, settings.COOKIE_REFRESH_NAME, settings.COOKIE_CSRF_NAME):
        response.delete_cookie(name, path=settings.COOKIE_PATH)

def get_token_from_request(request: Request) -> Optional[str]:
    credentials = request.headers.get("authorization")
    if credentials and credentials.lower().startswith("bearer "):
        return credentials[7:].strip()
    return request.cookies.get(settings.COOKIE_ACCESS_NAME)

def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(rounds=settings.BCRYPT_ROUNDS)
    ).decode("utf-8")

def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(
            password.encode("utf-8"),
            password_hash.encode("utf-8")
        )
    except Exception:
        return False

def create_access_token(user_id: int, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": now,
        "exp": now + settings.JWT_EXPIRATION,
        "jti": secrets.token_hex(16),
    }
    return pyjwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def create_refresh_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "iat": now,
        "exp": now + settings.JWT_REFRESH_EXPIRATION,
        "jti": secrets.token_hex(16),
    }
    return pyjwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def decode_token(token: str) -> Optional[dict]:
    try:
        return pyjwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
    except pyjwt.ExpiredSignatureError:
        return None
    except pyjwt.InvalidTokenError:
        return None
    except Exception:
        return None

def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> Optional[User]:
    token = get_token_from_request(request)
    if not token:
        return None
    payload = decode_token(token)
    if payload is None:
        return None
    user_id = payload.get("sub")
    if user_id is None:
        return None
    try:
        return db.query(User).filter(User.id == int(user_id)).first()
    except Exception:
        return None

def require_auth(user: Optional[User] = Depends(get_current_user)) -> User:
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticación requerida",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta desactivada",
        )
    return user

def require_role(*roles: str):
    def role_checker(user: User = Depends(require_auth)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Se requiere rol: {', '.join(roles)}",
            )
        return user
    return role_checker

def require_module(module: str):
    def module_checker(user: User = Depends(require_auth)) -> User:
        allowed = settings.MODULE_PERMISSIONS.get(module, [])
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado al módulo: {module}",
            )
        return user
    return module_checker

def check_login_rate_limit(username: str, ip: str, db: Session) -> None:
    since = datetime.utcnow() - timedelta(minutes=settings.LOGIN_LOCKOUT_MINUTES)
    attempts = db.query(LoginAttempt).filter(
        LoginAttempt.username == username,
        LoginAttempt.ip_address == ip,
        LoginAttempt.timestamp >= since,
        LoginAttempt.success == False,
    ).count()
    if attempts >= settings.MAX_LOGIN_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Demasiados intentos. Espere {settings.LOGIN_LOCKOUT_MINUTES} minutos.",
        )

def record_login_attempt(username: str, ip: str, success: bool, db: Session) -> None:
    attempt = LoginAttempt(
        username=username,
        ip_address=ip,
        success=success,
        timestamp=datetime.utcnow(),
    )
    db.add(attempt)
    db.commit()

def log_audit(
    user_id: int,
    action: str,
    resource: str,
    resource_id: Optional[str] = None,
    details: Optional[str] = None,
    ip_address: Optional[str] = None,
    db: Session = None,
) -> None:
    if not settings.AUDIT_LOG_ENABLED:
        return
    log = AuditLog(
        user_id=user_id,
        action=action,
        resource=resource,
        resource_id=resource_id,
        details=details,
        ip_address=ip_address,
        timestamp=datetime.utcnow(),
    )
    if db:
        db.add(log)
        db.commit()

def sanitize_input(value: str) -> str:
    if not value:
        return value
    value = value.replace("<", "&lt;").replace(">", "&gt;")
    value = value.replace('"', "&quot;").replace("'", "&#x27;")
    value = value.replace("&", "&amp;")
    return value

def generate_csrf_token() -> str:
    return secrets.token_hex(32)

def validate_csrf(token: str, stored_token: str) -> bool:
    if not settings.CSRF_ENABLED:
        return True
    return hmac.compare_digest(token, stored_token)

def create_default_admin(db: Session) -> User:
    existing = db.query(User).filter(User.role == "admin").first()
    if existing:
        return existing
    password = os.getenv("DEFAULT_ADMIN_PASSWORD") or "".join(
        secrets.choice(string.ascii_letters + string.digits + "!@#$%") for _ in range(16)
    )
    admin = User(
        username="admin",
        email="admin@supervisor.local",
        password_hash=hash_password(password),
        role="admin",
        is_active=True,
        created_at=datetime.utcnow(),
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    if os.getenv("DEFAULT_ADMIN_PASSWORD"):
        print("[security] Administrador 'admin' creado con DEFAULT_ADMIN_PASSWORD.")
    else:
        print("[security] ATENCIÓN: administrador 'admin' creado con contraseña temporal:", password)
        print("[security] Cámbiela lo antes posible desde Configuración -> Usuarios.")
    return admin
