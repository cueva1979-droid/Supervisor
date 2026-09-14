import os
import re
import uuid
import pdfplumber
from datetime import datetime
from typing import Optional, Dict
from sqlalchemy.orm import Session
from models import ProcesoContratacion


def _fix_encoding(text: str) -> str:
    if not text:
        return text
    return text.replace('\ufffd', '')


def extract_proceso_data(filepath: str) -> Dict:
    full_text = ""
    tables = []

    with pdfplumber.open(filepath) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                full_text += t + "\n"
            pt = page.extract_tables()
            if pt:
                tables.extend(pt)

    result = {
        "codigo": None,
        "objeto_proceso": None,
        "estado_proceso": None,
        "presupuesto_referencial": None,
        "fecha_publicacion": None,
    }

    # Extract código
    result["codigo"] = _extract_codigo(full_text, tables)

    # Extract objeto del proceso
    result["objeto_proceso"] = _extract_objeto(full_text, tables)

    # Extract estado del proceso
    result["estado_proceso"] = _extract_estado(full_text, tables)

    # Extract presupuesto referencial
    result["presupuesto_referencial"] = _extract_presupuesto(full_text, tables)

    # Extract fecha de publicación
    result["fecha_publicacion"] = _extract_fecha(full_text, tables)

    return result


def _extract_codigo(text: str, tables: list) -> Optional[str]:
    # Search in tables first
    for table in tables:
        for row in table:
            for i, cell in enumerate(row):
                cell_text = str(cell or '').strip()
                if 'Código' in cell_text or 'Codigo' in cell_text or 'CÓDIGO' in cell_text:
                    if i + 1 < len(row):
                        next_cell = str(row[i + 1] or '').strip()
                        if next_cell and re.search(r'[A-Z]+-\d{4}-\d+', next_cell):
                            return _fix_encoding(next_cell)
    
    # Search in text with patterns
    patterns = [
        r'(?:C[ÓO]DIGO\s*(?:DEL)?\s*PROCESO|CDP)\s*[:#]?\s*([A-Z0-9\-/]{4,})',
        r'\b([A-Z]{2,5}-\d{4}-\d+)\b',
        r'NIC\s*[:#\-]?\s*(NIC-\d[\d\-]+)',
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            return _fix_encoding(m.group(1).strip())
    return None


def _extract_objeto(text: str, tables: list) -> Optional[str]:
    # Search in tables
    for table in tables:
        for row in table:
            for i, cell in enumerate(row):
                cell_text = str(cell or '').strip()
                if 'Objeto' in cell_text and 'Proceso' in cell_text:
                    if i + 1 < len(row):
                        next_cell = str(row[i + 1] or '').strip()
                        if next_cell and len(next_cell) > 5:
                            return _fix_encoding(next_cell[:500])
    
    # Search in text
    patterns = [
        r'(?:OBJETO\s*(?:DEL)?\s*PROCESO)\s*[:#]?\s*(.+?)(?:\n|ESTADO|FECHA|PRESUPUESTO)',
        r'(?:Descripci[óo]n|Objeto)\s*[:#]?\s*(.+?)(?:\n|$)',
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE | re.MULTILINE)
        if m:
            val = m.group(1).strip()
            if len(val) > 5:
                return _fix_encoding(val[:500])
    return None


def _extract_estado(text: str, tables: list) -> Optional[str]:
    ESTADOS = ['Ejecución de Contrato', 'Ejecucion de Contrato', 'Adjudicado', 
               'Finalizado', 'Publicado', 'Suspendido', 'Adjudicación', 'En curso',
               'Desierto', 'Cancelado', 'En evaluación', 'Evaluación']
    
    # Search in tables
    for table in tables:
        for row in table:
            for i, cell in enumerate(row):
                cell_text = str(cell or '').strip()
                if 'Estado' in cell_text and 'Proceso' in cell_text:
                    if i + 1 < len(row):
                        next_cell = str(row[i + 1] or '').strip()
                        if next_cell:
                            for est in ESTADOS:
                                if est.lower() in next_cell.lower():
                                    return _fix_encoding(est)
                            return _fix_encoding(next_cell[:100])
    
    # Search in text
    for est in ESTADOS:
        if est.lower() in text.lower():
            return _fix_encoding(est)
    return None


def _extract_presupuesto(text: str, tables: list) -> Optional[float]:
    # Search in tables
    for table in tables:
        for row in table:
            for i, cell in enumerate(row):
                cell_text = str(cell or '').strip()
                if 'Presupuesto' in cell_text or 'Referencial' in cell_text:
                    if i + 1 < len(row):
                        next_cell = str(row[i + 1] or '').strip()
                        if next_cell:
                            # Clean and parse number
                            num_str = re.sub(r'[^\d.,]', '', next_cell)
                            num_str = num_str.replace(',', '').replace('.', '', 1)
                            try:
                                return float(num_str)
                            except:
                                pass
    
    # Search in text
    patterns = [
        r'(?:PRESUPUESTO\s*REFERENCIAL|Presupuesto\s+Referencial)\s*[:#]?\s*\$?\s*([\d.,]+)',
        r'(?:MONTO|IMPORTE)\s*(?:TOTAL|REFERENCIAL)?\s*[:#]?\s*\$?\s*([\d.,]+)',
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            num_str = m.group(1).replace(',', '').replace('.', '', 1)
            try:
                return float(num_str)
            except:
                pass
    return None


def _extract_fecha(text: str, tables: list) -> Optional[str]:
    # Search in tables
    for table in tables:
        for row in table:
            for i, cell in enumerate(row):
                cell_text = str(cell or '').strip()
                if ('Fecha' in cell_text and ('Publicación' in cell_text or 'Publicacion' in cell_text)) or 'Fecha de Publicación' in cell_text:
                    if i + 1 < len(row):
                        next_cell = str(row[i + 1] or '').strip()
                        if next_cell and re.search(r'\d{2}[/-]\d{2}[/-]\d{2,4}', next_cell):
                            return _fix_encoding(next_cell)
    
    # Search in text
    patterns = [
        r'(?:FECHA\s*(?:DE\s*)?PUBLICACI[ÓO]N)\s*[:#]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
        r'(?:Fecha\s*de\s*Publicación)\s*[:#]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            return _fix_encoding(m.group(1).strip())
    return None


def process_proceso_pdf(filepath: str, filename: str, db: Session) -> dict:
    data = extract_proceso_data(filepath)
    
    if not data.get("codigo"):
        raise ValueError("No se pudo extraer el código del proceso del documento")
    
    now = datetime.utcnow().isoformat()
    
    # Check if process already exists
    existing = db.query(ProcesoContratacion).filter(ProcesoContratacion.codigo == data["codigo"]).first()
    
    if existing:
        # Update existing
        existing.filename = filename
        existing.objeto_proceso = data.get("objeto_proceso") or existing.objeto_proceso
        existing.estado_proceso = data.get("estado_proceso") or existing.estado_proceso
        existing.presupuesto_referencial = data.get("presupuesto_referencial") or existing.presupuesto_referencial
        existing.fecha_publicacion = data.get("fecha_publicacion") or existing.fecha_publicacion
        existing.fecha_procesamiento = now
        db.flush()
        db.refresh(existing)
        return _proceso_to_dict(existing, updated=True)
    else:
        # Create new
        proc = ProcesoContratacion(
            id=str(uuid.uuid4()),
            filename=filename,
            codigo=data["codigo"],
            objeto_proceso=data.get("objeto_proceso"),
            estado_proceso=data.get("estado_proceso"),
            presupuesto_referencial=data.get("presupuesto_referencial"),
            fecha_publicacion=data.get("fecha_publicacion"),
            fecha_procesamiento=now,
        )
        db.add(proc)
        db.flush()
        db.refresh(proc)
        return _proceso_to_dict(proc, created=True)


def _proceso_to_dict(proc, created=False, updated=False) -> dict:
    result = {
        "id": proc.id,
        "filename": proc.filename or "",
        "codigo": proc.codigo,
        "objeto_proceso": proc.objeto_proceso or "",
        "estado_proceso": proc.estado_proceso or "",
        "presupuesto_referencial": proc.presupuesto_referencial,
        "fecha_publicacion": proc.fecha_publicacion or "",
        "fecha_procesamiento": proc.fecha_procesamiento or "",
    }
    if created:
        result["mensaje"] = "Proceso creado exitosamente"
    elif updated:
        result["mensaje"] = "Proceso actualizado exitosamente"
    return result


def list_procesos(db: Session) -> list:
    return [
        _proceso_to_dict(p)
        for p in db.query(ProcesoContratacion).order_by(ProcesoContratacion.fecha_procesamiento.desc()).all()
    ]


def get_proceso(proceso_id: str, db: Session) -> Optional[dict]:
    proc = db.query(ProcesoContratacion).filter(ProcesoContratacion.id == proceso_id).first()
    return _proceso_to_dict(proc) if proc else None


def delete_proceso(proceso_id: str, db: Session) -> bool:
    proc = db.query(ProcesoContratacion).filter(ProcesoContratacion.id == proceso_id).first()
    if not proc:
        return False
    db.delete(proc)
    db.commit()
    return True


def delete_all_procesos(db: Session) -> int:
    count = db.query(ProcesoContratacion).count()
    db.query(ProcesoContratacion).delete()
    db.commit()
    return count
