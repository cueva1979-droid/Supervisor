# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['C:\\Users\\Analista\\Desktop\\aplicaciones\\PROVEEDORES\\Supervisor\\run.py'],
    pathex=[],
    binaries=[],
    datas=[('C:\\Users\\Analista\\Desktop\\aplicaciones\\PROVEEDORES\\Supervisor\\backend', 'backend'), ('C:\\Users\\Analista\\Desktop\\aplicaciones\\PROVEEDORES\\Supervisor\\frontend\\dist', 'frontend/dist')],
    hiddenimports=['sqlalchemy', 'sqlalchemy.orm', 'sqlalchemy.sql.default_comparator', 'pdfplumber', 'docx', 'openpyxl', 'uvicorn', 'pydantic', 'pydantic._internal', 'pdfminer', 'pdfminer.high_level', 'pdfminer.pdfinterp', 'pdfminer.converter', 'pdfminer.layout', 'pypdfium2', 'cffi', 'lxml', 'et_xmlfile'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'matplotlib', 'PIL', 'cv2', 'numpy', 'scipy', 'pandas', 'notebook', 'jupyter'],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='SupervisorPDF',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
