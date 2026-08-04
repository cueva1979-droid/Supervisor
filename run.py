#!/usr/bin/env python3
"""Punto de entrada para SupervisorPDF - Inicia backend y abre navegador."""
import os
import sys
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

def main():
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

    print(f"Iniciando SupervisorPDF en http://127.0.0.1:{port}")
    open_browser(port)

    # Change to base dir for data persistence
    os.chdir(BASE_DIR)
    data_dir = os.path.join(BASE_DIR, "data")
    os.makedirs(data_dir, exist_ok=True)
    exports_dir = os.path.join(BASE_DIR, "exports")
    os.makedirs(exports_dir, exist_ok=True)
    uploads_dir = os.path.join(BASE_DIR, "uploads")
    os.makedirs(uploads_dir, exist_ok=True)

    # Serve static frontend if dist exists
    dist_path = get_resource_path("frontend/dist")
    if os.path.exists(dist_path):
        from fastapi.staticfiles import StaticFiles
        from backend.main import app
        app.mount("/", StaticFiles(directory=dist_path, html=True), name="static")
        uvicorn.run(app, host=host, port=port, reload=False)
    else:
        os.chdir(get_resource_path("backend"))
        uvicorn.run("main:app", host=host, port=port, reload=False)

if __name__ == "__main__":
    main()
