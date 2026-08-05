import os
import sys
import secrets
import string
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

def get_data_dir():
    if getattr(sys, 'frozen', False):
        base = os.path.dirname(sys.executable)
    else:
        base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
    data_dir = os.path.join(base, "data")
    os.makedirs(data_dir, exist_ok=True)
    return data_dir

DB_IS_SQLITE = True
DB_DIR = get_data_dir()
DATABASE_URL = os.getenv("DATABASE_URL", "")

if DATABASE_URL:
    DB_IS_SQLITE = False
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
else:
    DATABASE_URL = f"sqlite:///{os.path.join(DB_DIR, 'supervisor.db')}"
    engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
    if not DB_IS_SQLITE:
        return
    with engine.connect() as conn:
        for col in [
            "ALTER TABLE records ADD COLUMN plazo_entrega VARCHAR(100)",
            "ALTER TABLE ce_items ADD COLUMN partida_presupuestaria VARCHAR(255)",
            "ALTER TABLE cam_extractions ADD COLUMN fecha_publicacion VARCHAR(20)",
            "ALTER TABLE ce_extractions ADD COLUMN estado VARCHAR(50) DEFAULT 'En Ejecucion'",
        ]:
            try:
                conn.execute(text(col))
                conn.commit()
            except Exception:
                pass

def create_default_admin(db: Session):
    from models import User
    import bcrypt
    existing = db.query(User).filter(User.role == "admin").first()
    if existing:
        return
    password = os.getenv("DEFAULT_ADMIN_PASSWORD") or "".join(
        secrets.choice(string.ascii_letters + string.digits + "!@#$%") for _ in range(16)
    )
    admin = User(
        username="admin",
        email="admin@supervisor.local",
        password_hash=bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8"),
        role="admin",
        is_active=True,
    )
    db.add(admin)
    db.commit()
    if os.getenv("DEFAULT_ADMIN_PASSWORD"):
        print("[security] Administrador 'admin' creado con DEFAULT_ADMIN_PASSWORD.")
    else:
        print("[security] ATENCIÓN: administrador 'admin' creado con contraseña temporal:", password)
        print("[security] Cámbiela lo antes posible desde Configuración -> Usuarios.")
