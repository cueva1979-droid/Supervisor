#!/usr/bin/env python3
"""Punto de entrada para SupervisorPRO - Inicia backend y abre navegador."""
import os
import sys
import getpass
import webbrowser
import socket
import threading
import time
import uvicorn

def get_base_dir():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

def get_resource_path(relative_path):
    if getattr(sys, 'frozen', False):
        base = sys._MEIPASS
    else:
        base = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base, relative_path)

BASE_DIR = get_base_dir()
sys.path.insert(0, get_resource_path("backend"))

def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("", 0))
        return s.getsockname()[1]

def open_browser(port, delay=2):
    def _open():
        time.sleep(delay)
        webbrowser.open(f"http://127.0.0.1:{port}")
    threading.Thread(target=_open, daemon=True).start()

def reset_password():
    """Restablece la contraseña del usuario admin desde la consola."""
    base = get_resource_path("backend")
    sys.path.insert(0, base)

    data_dir = os.path.join(BASE_DIR, "data")
    db_path = os.path.join(data_dir, "supervisor.db")
    if not os.path.exists(db_path):
        print("ERROR: No se encontro la base de datos. Ejecute la aplicacion primero.")
        sys.exit(1)

    os.chdir(BASE_DIR)
    os.makedirs(data_dir, exist_ok=True)

    from database import SessionLocal, init_db
    from models import User
    from auth import hash_password

    init_db()
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.role == "admin").first()
        if not admin:
            print("ERROR: No se encontro usuario admin. Cree uno desde la aplicacion.")
            sys.exit(1)

        print(f"Usuario: {admin.username}")
        new_pass = getpass.getpass("Nueva contraseña: ")
        if len(new_pass) < 8:
            print("ERROR: La contraseña debe tener al menos 8 caracteres.")
            sys.exit(1)
        confirm = getpass.getpass("Confirmar contraseña: ")
        if new_pass != confirm:
            print("ERROR: Las contraseñas no coinciden.")
            sys.exit(1)

        admin.password_hash = hash_password(new_pass)
        db.commit()
        print(f"Contraseña del usuario '{admin.username}' actualizada exitosamente.")
    finally:
        db.close()


def main():
    if "--reset-password" in sys.argv:
        reset_password()
        return

    port_env = os.getenv("PORT")
    if port_env:
        port = int(port_env)
        host = "0.0.0.0"
    else:
        host = "127.0.0.1"
        port = 8000
        try:
            test_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            test_sock.bind(("127.0.0.1", port))
            test_sock.close()
        except OSError:
            port = find_free_port()

    print(f"Iniciando SupervisorPRO en http://127.0.0.1:{port}")
    open_browser(port)

    # Change to base dir for data persistence
    os.chdir(BASE_DIR)
    data_dir = os.path.join(BASE_DIR, "data")
    os.makedirs(data_dir, exist_ok=True)
    exports_dir = os.path.join(BASE_DIR, "exports")
    os.makedirs(exports_dir, exist_ok=True)
    uploads_dir = os.path.join(BASE_DIR, "uploads")
    os.makedirs(uploads_dir, exist_ok=True)

    from backend.main import app
    uvicorn.run(app, host=host, port=port, reload=False)

if __name__ == "__main__":
    main()
