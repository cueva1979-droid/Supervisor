import os
import re


def sanitize_filename(name: str) -> str:
    """Previene path traversal y nombres de archivo maliciosos.

    Elimina componentes de directorio, bytes nulos y caracteres de control.
    """
    if not name:
        raise ValueError("Nombre de archivo vacío")
    name = os.path.basename(name.replace("\\", "/"))
    name = "".join(ch for ch in name if ch >= " " or ch == "\t")
    name = name.replace("\x00", "")
    name = name.strip()
    if not name or name in (".", ".."):
        raise ValueError("Nombre de archivo inválido")
    return name


_FORMULA_PREFIX = ("=", "+", "-", "@", "\t", "\r")


def sanitize_excel(value):
    """Previene inyección de fórmulas (CSV/Formula injection) en Excel.

    Si un valor de texto comienza con caracteres que Excel interpreta como
    fórmula, se antepone un apóstrofo para que se trate como texto plano.
    """
    if value is None:
        return value
    if not isinstance(value, str):
        return value
    if value.startswith(_FORMULA_PREFIX):
        return "'" + value
    return value
