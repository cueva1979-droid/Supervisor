import os
import sys
import shutil
import json
import threading
import time
from datetime import datetime

SCHEDULER_FILE = None
_scheduler_thread = None
_scheduler_running = False

def _is_sqlite_db():
    return not bool(os.getenv("DATABASE_URL"))

def get_backup_dir():
    if getattr(sys, 'frozen', False):
        base = os.path.dirname(sys.executable)
    else:
        base = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..")
    backup_dir = os.path.join(base, "backup")
    os.makedirs(backup_dir, exist_ok=True)
    return backup_dir

def get_db_path():
    if getattr(sys, 'frozen', False):
        base = os.path.dirname(sys.executable)
    else:
        base = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..")
    return os.path.join(base, "data", "supervisor.db")

def create_backup():
    backup_dir = get_backup_dir()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    if not _is_sqlite_db():
        # Postgres/Neon: backup lógico en JSON (todos los modelos)
        try:
            from database import SessionLocal
            import models as m
            db = SessionLocal()
            try:
                dump = {}
                # Helper to serialize
                def serialize_rows(rows):
                    out = []
                    for r in rows:
                        d = {}
                        for c in r.__table__.columns:
                            v = getattr(r, c.name)
                            # datetime -> isoformat
                            if hasattr(v, 'isoformat'):
                                try:
                                    v = v.isoformat()
                                except Exception:
                                    v = str(v)
                            d[c.name] = v
                        out.append(d)
                    return out
                dump["pac_documents"] = serialize_rows(db.query(m.PACDocument).all())
                dump["pac_certificates"] = serialize_rows(db.query(m.PACCertificate).all())
                dump["cpc_catalog"] = serialize_rows(db.query(m.CPCCatalog).all())
                dump["cpc_loaded_data"] = serialize_rows(db.query(m.CPCLoadedData).all())
                dump["ce_extractions"] = serialize_rows(db.query(m.CEExtractionDB).all())
                dump["ce_items"] = serialize_rows(db.query(m.CEItemDB).all())
                dump["cam_extractions"] = serialize_rows(db.query(m.CAMExtraction).all())
                dump["providers"] = serialize_rows(db.query(m.Provider).all())
                dump["records"] = serialize_rows(db.query(m.Record).all())
                dump["items"] = serialize_rows(db.query(m.Item).all())
                dump["users"] = serialize_rows(db.query(m.User).all())
                dump["audit_logs"] = serialize_rows(db.query(m.AuditLog).all())
                filename = f"backup_{timestamp}.json"
                dest = os.path.join(backup_dir, filename)
                with open(dest, "w", encoding="utf-8") as f:
                    json.dump(dump, f, ensure_ascii=False, indent=2, default=str)
                metadata = {
                    "filename": filename,
                    "timestamp": datetime.now().isoformat(),
                    "size_bytes": os.path.getsize(dest),
                }
                _save_last_backup_info(metadata)
                return metadata
            finally:
                db.close()
        except Exception as e:
            raise
    # SQLite path
    db_path = get_db_path()
    if not os.path.exists(db_path):
        raise FileNotFoundError("No se encontró la base de datos")
    filename = f"backup_{timestamp}.db"
    dest = os.path.join(backup_dir, filename)
    shutil.copy2(db_path, dest)
    metadata = {
        "filename": filename,
        "timestamp": datetime.now().isoformat(),
        "size_bytes": os.path.getsize(dest),
    }
    _save_last_backup_info(metadata)
    return metadata

def restore_backup(filename: str):
    backup_dir = get_backup_dir()
    src = os.path.join(backup_dir, filename)
    if not os.path.exists(src):
        raise FileNotFoundError(f"No se encontró el archivo de backup: {filename}")
    if not os.path.isfile(src):
        raise ValueError(f"La ruta no es un archivo válido: {filename}")
    if not _is_sqlite_db():
        # Postgres: restore desde JSON
        if not filename.endswith(".json"):
            raise ValueError("En servidor solo se restauran backups .json")
        try:
            from database import SessionLocal
            import models as m
            with open(src, "r", encoding="utf-8") as f:
                dump = json.load(f)
            db = SessionLocal()
            try:
                # Limpia en orden inverso por FK
                db.query(m.CEItemDB).delete()
                db.query(m.Item).delete()
                db.query(m.CEExtractionDB).delete()
                db.query(m.CAMExtraction).delete()
                db.query(m.Record).delete()
                db.query(m.Provider).delete()
                db.query(m.PACCertificate).delete()
                db.query(m.PACDocument).delete()
                db.query(m.CPCLoadedData).delete()
                db.query(m.CPCCatalog).delete()
                # No se restauran users/audit para evitar bloqueo; opcional
                # Helper para insertar
                def bulk_insert(model, rows):
                    for r in rows:
                        # Convierte isoformat datetime si aplica
                        obj = model(**r)
                        db.add(obj)
                bulk_insert(m.CPCCatalog, dump.get("cpc_catalog", []))
                bulk_insert(m.CPCLoadedData, dump.get("cpc_loaded_data", []))
                bulk_insert(m.PACDocument, dump.get("pac_documents", []))
                bulk_insert(m.PACCertificate, dump.get("pac_certificates", []))
                bulk_insert(m.Provider, dump.get("providers", []))
                bulk_insert(m.Record, dump.get("records", []))
                bulk_insert(m.Item, dump.get("items", []))
                bulk_insert(m.CEExtractionDB, dump.get("ce_extractions", []))
                bulk_insert(m.CEItemDB, dump.get("ce_items", []))
                bulk_insert(m.CAMExtraction, dump.get("cam_extractions", []))
                db.commit()
            finally:
                db.close()
            return {"status": "ok", "restored_from": filename}
        except Exception as e:
            raise
    db_path = get_db_path()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_before = os.path.join(backup_dir, f"pre_restore_{timestamp}.db")
    shutil.copy2(db_path, backup_before)
    shutil.copy2(src, db_path)
    return {
        "status": "ok",
        "restored_from": filename,
        "backup_previo": os.path.basename(backup_before),
    }

def get_backup_info():
    backup_dir = get_backup_dir()
    files = []
    for f in sorted(os.listdir(backup_dir), reverse=True):
        if f.endswith(".db") or f.endswith(".json"):
            fp = os.path.join(backup_dir, f)
            try:
                files.append({
                    "filename": f,
                    "timestamp": datetime.fromtimestamp(os.path.getmtime(fp)).isoformat(),
                    "size_bytes": os.path.getsize(fp),
                })
            except Exception:
                continue
    if not _is_sqlite_db():
        last = _load_last_backup_info()
        return {
            "backup_dir": backup_dir,
            "total_backups": len(files),
            "last_backup": last,
            "files": files,
            "auto_backup_enabled": _is_auto_backup_enabled(),
            "message": None,
        }
    last = _load_last_backup_info()
    return {
        "backup_dir": backup_dir,
        "total_backups": len(files),
        "last_backup": last,
        "files": files,
        "auto_backup_enabled": _is_auto_backup_enabled(),
    }

def _get_meta_path():
    return os.path.join(get_backup_dir(), "_last_backup.json")

def _save_last_backup_info(metadata):
    try:
        with open(_get_meta_path(), "w") as f:
            json.dump(metadata, f)
    except Exception:
        pass

def _load_last_backup_info():
    try:
        with open(_get_meta_path(), "r") as f:
            return json.load(f)
    except Exception:
        return None

def _get_scheduler_flag_path():
    return os.path.join(get_backup_dir(), "_auto_backup_enabled.json")

def _is_auto_backup_enabled():
    try:
        with open(_get_scheduler_flag_path(), "r") as f:
            return json.load(f).get("enabled", False)
    except Exception:
        return False

def _set_auto_backup_enabled(enabled: bool):
    with open(_get_scheduler_flag_path(), "w") as f:
        json.dump({"enabled": enabled}, f)

def set_auto_backup(enabled: bool):
    _set_auto_backup_enabled(enabled)
    if enabled:
        start_scheduler()
    else:
        stop_scheduler()
    return {"auto_backup_enabled": enabled}

def start_scheduler():
    global _scheduler_thread, _scheduler_running
    if _scheduler_running:
        return
    _scheduler_running = True
    _scheduler_thread = threading.Thread(target=_scheduler_loop, daemon=True)
    _scheduler_thread.start()

def stop_scheduler():
    global _scheduler_running
    _scheduler_running = False

def _scheduler_loop():
    global _scheduler_running
    while _scheduler_running:
        try:
            if _is_auto_backup_enabled():
                last = _load_last_backup_info()
                now = datetime.now()
                should_run = False
                if last is None:
                    should_run = True
                else:
                    last_time = datetime.fromisoformat(last["timestamp"])
                    if (now - last_time).total_seconds() >= 86400:
                        should_run = True
                if should_run:
                    try:
                        create_backup()
                    except Exception:
                        pass
        except Exception:
            pass
        for _ in range(3600):
            if not _scheduler_running:
                return
            time.sleep(1)
