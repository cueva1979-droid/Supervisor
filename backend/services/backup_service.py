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
    if not _is_sqlite_db():
        raise ValueError("El respaldo por archivo solo está disponible con SQLite (uso local). En el servidor, la persistencia está a cargo de la base de datos externa.")
    backup_dir = get_backup_dir()
    db_path = get_db_path()
    if not os.path.exists(db_path):
        raise FileNotFoundError("No se encontró la base de datos")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
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
    if not _is_sqlite_db():
        raise ValueError("El respaldo por archivo solo está disponible con SQLite (uso local).")
    backup_dir = get_backup_dir()
    db_path = get_db_path()
    src = os.path.join(backup_dir, filename)
    if not os.path.exists(src):
        raise FileNotFoundError(f"No se encontró el archivo de backup: {filename}")
    if not os.path.isfile(src):
        raise ValueError(f"La ruta no es un archivo válido: {filename}")
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
    if not _is_sqlite_db():
        return {
            "backup_dir": backup_dir,
            "total_backups": 0,
            "last_backup": None,
            "files": [],
            "auto_backup_enabled": False,
            "message": "Respaldo por archivo deshabilitado en servidor; la persistencia usa base de datos externa.",
        }
    files = []
    for f in sorted(os.listdir(backup_dir), reverse=True):
        if f.endswith(".db"):
            fp = os.path.join(backup_dir, f)
            files.append({
                "filename": f,
                "timestamp": datetime.fromtimestamp(os.path.getmtime(fp)).isoformat(),
                "size_bytes": os.path.getsize(fp),
            })
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
