import os
import sys
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

DB_DIR = get_data_dir()
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
    admin = User(
        username="admin",
        email="admin@supervisor.local",
        password_hash=bcrypt.hashpw(b"Admin123!", bcrypt.gensalt(rounds=12)).decode("utf-8"),
        role="admin",
        is_active=True,
    )
    db.add(admin)
    db.commit()
