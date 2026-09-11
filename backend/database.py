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

def _fallback_sqlite():
    global DATABASE_URL, engine, DB_IS_SQLITE
    DB_IS_SQLITE = True
    DATABASE_URL = f"sqlite:///{os.path.join(DB_DIR, 'supervisor.db')}"
    engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})

if DATABASE_URL:
    DATABASE_URL = DATABASE_URL.strip()
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    if not DATABASE_URL.startswith("postgresql://"):
        print("[db] DATABASE_URL no comienza con postgresql://")
        _fallback_sqlite()
    else:
        try:
            engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            DB_IS_SQLITE = False
            print("[db] Conectado a PostgreSQL")
        except Exception as e:
            print("[db] ERROR: No se pudo conectar a PostgreSQL")
            _fallback_sqlite()
else:
    _fallback_sqlite()

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
    # Migración: plazo_entrega de VARCHAR(100) -> TEXT (fix StringDataRightTruncation)
    with engine.connect() as conn:
        try:
            if not DB_IS_SQLITE:
                conn.execute(text("ALTER TABLE records ALTER COLUMN plazo_entrega TYPE TEXT USING plazo_entrega::TEXT"))
                conn.commit()
            else:
                # SQLite: ignora tipo, pero asegurar columna existe si falta
                conn.execute(text("ALTER TABLE records ADD COLUMN plazo_entrega TEXT"))
                conn.commit()
        except Exception:
            pass
    # Ensure new PAC estado_ejecucion column exists (Postgres & SQLite)
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE pac_documents ADD COLUMN estado_ejecucion VARCHAR(50) DEFAULT 'Pendiente'"))
            conn.commit()
        except Exception:
            pass
    # Migrar moneda PYG -> USD
    with engine.connect() as conn:
        try:
            conn.execute(text("UPDATE records SET moneda='USD' WHERE moneda='PYG'"))
            conn.commit()
        except Exception:
            pass
    # Migración fecha dd/mm/yyyy -> dd/mm/aa y textual "16 junio del 2026" -> 16/06/26
    try:
        import re as _re
        from models import Record as _Record
        _MONTHS = {'enero':'01','febrero':'02','marzo':'03','abril':'04','mayo':'05','junio':'06','julio':'07','agosto':'08','septiembre':'09','octubre':'10','noviembre':'11','diciembre':'12'}
        _db = SessionLocal()
        try:
            _pat = _re.compile(r'^\d{2}/\d{2}/\d{4}$')
            _pat_text = _re.compile(r'^(\d{1,2})\s*(?:de\s+)?([a-záéíóúñ]+)\s*(?:del|de)\s*(\d{4})$', _re.IGNORECASE)
            _records = _db.query(_Record).filter(_Record.fecha.isnot(None)).all()
            _changed = 0
            for _r in _records:
                if not _r.fecha: continue
                s=_r.fecha.strip()
                if _pat.match(s):
                    _r.fecha = s[:6] + s[-2:]
                    _changed += 1
                else:
                    _m=_pat_text.match(s)
                    if _m:
                        _r.fecha = f"{_m.group(1).zfill(2)}/{_MONTHS.get(_m.group(2).lower(),'01')}/{_m.group(3)[-2:]}"
                        _changed += 1
            if _changed:
                _db.commit()
                print(f"[db] Migradas {_changed} fechas a formato dd/mm/aa")
            # también migrar CE si existe (consistencia)
            try:
                from models import CEExtractionDB as _CE
                _ces = _db.query(_CE).filter(_CE.fecha_aceptacion.isnot(None)).all()
                _c_changed = 0
                for _c in _ces:
                    if not _c.fecha_aceptacion: continue
                    s=_c.fecha_aceptacion.strip()
                    if _pat.match(s):
                        _c.fecha_aceptacion = s[:6] + s[-2:]
                        _c_changed += 1
                    else:
                        _m=_pat_text.match(s)
                        if _m:
                            _c.fecha_aceptacion = f"{_m.group(1).zfill(2)}/{_MONTHS.get(_m.group(2).lower(),'01')}/{_m.group(3)[-2:]}"
                            _c_changed += 1
                if _c_changed:
                    _db.commit()
                    print(f"[db] Migradas {_c_changed} fechas CE a formato dd/mm/aa")
            except Exception:
                pass
        finally:
            _db.close()
    except Exception:
        pass
    if not DB_IS_SQLITE:
        return
    with engine.connect() as conn:
        for col in [
            "ALTER TABLE records ADD COLUMN plazo_entrega TEXT",
            "ALTER TABLE ce_items ADD COLUMN partida_presupuestaria VARCHAR(255)",
        "ALTER TABLE cam_extractions ADD COLUMN fecha_publicacion VARCHAR(20)",
        "ALTER TABLE ce_extractions ADD COLUMN estado VARCHAR(50) DEFAULT 'En Ejecucion'",
        "ALTER TABLE cam_extractions ADD COLUMN soli_compra_token VARCHAR(255)",
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
        print("[security] ATENCIÓN: administrador 'admin' creado con contraseña temporal (no mostrada en logs).")
        print("[security] Cámbiela lo antes posible desde Configuración -> Usuarios.")
