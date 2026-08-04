import os
import sys
import shutil
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Record, Item, Provider, CEExtractionDB
from parser import DocumentParser
from schemas import RecordCreate

def get_upload_dir():
    if getattr(sys, 'frozen', False):
        base = os.path.dirname(sys.executable)
    else:
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    upload_dir = os.path.join(base, "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    return upload_dir

UPLOAD_DIR = get_upload_dir()

ALLOWED_EXTENSIONS = {".pdf", ".docx"}

def save_upload(file) -> str:
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Formato no soportado: {ext}. Use PDF o DOCX.")
    filepath = os.path.join(UPLOAD_DIR, file.filename)
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return filepath

def process_document(filepath: str, filename: str, db: Session) -> Record:
    existing_file = db.query(Record).filter(Record.filename == filename).first()
    if existing_file:
        raise ValueError(f"Archivo duplicado: '{filename}' ya fue procesado anteriormente")

    parser = DocumentParser(filepath, filename)
    data = parser.get_all_data()

    numero_orden = data.get("numero_orden")
    if numero_orden:
        existing_ce = db.query(CEExtractionDB).filter(CEExtractionDB.orden_compra == numero_orden).first()
        if existing_ce:
            raise ValueError(
                f"El número de orden '{numero_orden}' ya existe en el Catálogo Electrónico "
                f"(archivo: {existing_ce.filename})"
            )

    proveedor = data.get("proveedor", "requiere revisión")
    ruc = data.get("ruc", "requiere revisión")

    provider = None
    if ruc and ruc != "requiere revisión":
        provider = db.query(Provider).filter(Provider.ruc == ruc).first()
    if not provider and proveedor and proveedor != "requiere revisión":
        provider = db.query(Provider).filter(Provider.nombre.ilike(f"%{proveedor}%")).first()
    if not provider:
        provider = Provider(
            nombre=proveedor if proveedor != "requiere revisión" else f"Proveedor {filename}",
            ruc=ruc if ruc != "requiere revisión" else "00000000-0",
            codigo_proceso=data.get("codigo_proceso", ""),
            observaciones=f"Autocreado desde {filename}",
        )
        db.add(provider)
        db.flush()

    record = Record(
        filename=filename,
        file_type="pdf" if filename.lower().endswith(".pdf") else "docx",
        proveedor=proveedor,
        ruc=ruc,
        codigo_proceso=data.get("codigo_proceso"),
        numero_orden=data.get("numero_orden"),
        fecha=data.get("fecha"),
        objeto_contratacion=data.get("objeto_contratacion"),
        administrador=data.get("administrador"),
        plazo_entrega=data.get("plazo_entrega"),
        monto_total=data.get("monto_total", 0),
        moneda="PYG",
        estado="completado",
        provider_id=provider.id,
    )
    db.add(record)
    db.flush()

    for item_data in data.get("items", []):
        item = Item(
            record_id=record.id,
            codigo_cpc=item_data.get("codigo_cpc", ""),
            descripcion=item_data.get("descripcion", ""),
            cantidad=float(item_data.get("cantidad", 1)),
            unidad=item_data.get("unidad", ""),
            precio_unitario=float(item_data.get("precio_unitario", 0)),
            subtotal=float(item_data.get("subtotal", 0)),
            requires_review=item_data.get("requires_review", False),
        )
        db.add(item)

    db.commit()
    db.refresh(record)
    return record

def upload_and_process(files, db: Session) -> List[Record]:
    results = []
    for file in files:
        filepath = None
        try:
            filepath = save_upload(file)
            record = process_document(filepath, file.filename, db)
            results.append((file.filename, record, None))
        except Exception as e:
            if filepath and os.path.exists(filepath):
                try: os.remove(filepath)
                except: pass
            results.append((file.filename, None, str(e)))
    return results

def delete_record(record_id: int, db: Session) -> bool:
    record = db.query(Record).filter(Record.id == record_id).first()
    if not record:
        return False
    try:
        filepath = os.path.join(UPLOAD_DIR, record.filename)
        if os.path.exists(filepath):
            os.remove(filepath)
    except Exception:
        pass
    db.delete(record)
    db.commit()
    return True

def get_records(db: Session, search: Optional[str] = None) -> List[Record]:
    query = db.query(Record)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            Record.proveedor.ilike(search_term) |
            Record.ruc.ilike(search_term) |
            Record.codigo_proceso.ilike(search_term) |
            Record.numero_orden.ilike(search_term) |
            Record.filename.ilike(search_term)
        )
    return query.order_by(Record.fecha_procesamiento.desc()).all()
