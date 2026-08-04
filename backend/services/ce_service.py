import os
import sys
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from extractor_oc.parser import PDFExtractor, OrdenCompra, ItemOC
from extractor_oc.excel_export import exportar_orden, exportar_multiples
from models import CEExtractionDB, CEItemDB


EXTRACTIONS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "exports"
)
os.makedirs(EXTRACTIONS_DIR, exist_ok=True)


def _extraction_to_dict(ext: CEExtractionDB) -> dict:
    return {
        "id": ext.id,
        "orden_compra": ext.orden_compra or "",
        "fecha_aceptacion": ext.fecha_aceptacion or "",
        "nombre_comercial": ext.nombre_comercial or "",
        "razon_social": ext.razon_social or "",
        "ruc": ext.ruc or "",
        "administrador": ext.administrador or "",
        "objeto_contratacion": ext.objeto_contratacion or "",
        "items": [
            {
                "cpc": it.cpc or "",
                "descripcion": it.descripcion or "",
                "cantidad": it.cantidad or 0,
                "unidad": it.unidad or "",
                "v_unitario": it.v_unitario or 0.0,
                "subtotal": it.subtotal or 0.0,
                "partida_presupuestaria": it.partida_presupuestaria or "",
            }
            for it in (ext.items or [])
        ],
        "v_total": ext.v_total or 0.0,
        "estado": ext.estado or "En Ejecucion",
        "filename": ext.filename or "",
        "fecha_procesamiento": ext.fecha_procesamiento or "",
    }


def process_pdf(filepath: str, filename: str, db: Session) -> dict:
    extractor = PDFExtractor(filepath)
    oc = extractor.extract()

    if oc.orden_compra:
        existing = db.query(CEExtractionDB).filter(
            CEExtractionDB.orden_compra == oc.orden_compra
        ).first()
        if existing:
            raise ValueError(
                f"La orden de compra '{oc.orden_compra}' ya fue procesada "
                f"(archivo: {existing.filename}, fecha: {existing.fecha_procesamiento})"
            )

    ext_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    ext = CEExtractionDB(
        id=ext_id,
        orden_compra=oc.orden_compra,
        fecha_aceptacion=oc.fecha_aceptacion,
        nombre_comercial=oc.nombre_comercial,
        razon_social=oc.razon_social,
        ruc=oc.ruc,
        administrador=oc.administrador,
        objeto_contratacion=oc.objeto_contratacion,
        v_total=oc.v_total,
        filename=filename,
        fecha_procesamiento=now,
    )

    for item_oc in (oc.items or []):
        item_db = CEItemDB(
            extraction_id=ext_id,
            cpc=item_oc.cpc,
            descripcion=item_oc.descripcion,
            cantidad=item_oc.cantidad,
            unidad=item_oc.unidad,
            v_unitario=item_oc.v_unitario,
            subtotal=item_oc.subtotal,
            partida_presupuestaria=item_oc.partida_presupuestaria,
        )
        ext.items.append(item_db)

    db.add(ext)
    db.commit()
    db.refresh(ext)
    return _extraction_to_dict(ext)


def list_extractions(db: Session) -> List[dict]:
    return [_extraction_to_dict(e) for e in db.query(CEExtractionDB).order_by(CEExtractionDB.fecha_procesamiento.desc()).all()]


def get_extraction(extraction_id: str, db: Session) -> Optional[dict]:
    ext = db.query(CEExtractionDB).filter(CEExtractionDB.id == extraction_id).first()
    return _extraction_to_dict(ext) if ext else None


def update_extraction(extraction_id: str, data: dict, db: Session) -> Optional[dict]:
    ext = db.query(CEExtractionDB).filter(CEExtractionDB.id == extraction_id).first()
    if not ext:
        return None
    for key in ("nombre_comercial", "razon_social", "administrador", "estado"):
        if key in data:
            setattr(ext, key, data[key])
    db.commit()
    db.refresh(ext)
    return _extraction_to_dict(ext)

def delete_extraction(extraction_id: str, db: Session) -> bool:
    ext = db.query(CEExtractionDB).filter(CEExtractionDB.id == extraction_id).first()
    if not ext:
        return False
    db.delete(ext)
    db.commit()
    return True


def clear_all(db: Session) -> None:
    db.query(CEItemDB).delete()
    db.query(CEExtractionDB).delete()
    db.commit()


def export_excel_by_admin(admin_name: str, db: Session) -> str:
    extractions = db.query(CEExtractionDB).filter(
        CEExtractionDB.administrador == admin_name
    ).all()
    if not extractions:
        raise ValueError(f"No hay órdenes para el administrador '{admin_name}'")
    extraction_ids = [e.id for e in extractions]
    return export_excel(extraction_ids, db)

def export_excel(extraction_ids: Optional[List[str]] = None, db: Session = None) -> str:
    if db is None:
        from database import SessionLocal
        db = SessionLocal()

    query = db.query(CEExtractionDB)
    if extraction_ids:
        query = query.filter(CEExtractionDB.id.in_(extraction_ids))
    extractions = query.all()

    if not extractions:
        raise ValueError("No hay extracciones para exportar")

    ordenes = []
    for ext in extractions:
        oc = OrdenCompra(
            orden_compra=ext.orden_compra or "",
            fecha_aceptacion=ext.fecha_aceptacion or "",
            nombre_comercial=ext.nombre_comercial or "",
            razon_social=ext.razon_social or "",
            ruc=ext.ruc or "",
            administrador=ext.administrador or "",
            objeto_contratacion=ext.objeto_contratacion or "",
            v_total=ext.v_total or 0.0,
        )
        for it in (ext.items or []):
            oc.items.append(ItemOC(
                cpc=it.cpc or "",
                descripcion=it.descripcion or "",
                cantidad=it.cantidad or 0,
                unidad=it.unidad or "",
                v_unitario=it.v_unitario or 0.0,
                subtotal=it.subtotal or 0.0,
                partida_presupuestaria=it.partida_presupuestaria or "",
            ))
        ordenes.append(oc)

    if len(ordenes) == 1:
        filename = f"CE_{ordenes[0].orden_compra.replace('/', '-')}.xlsx"
        filepath = os.path.join(EXTRACTIONS_DIR, filename)
        exportar_orden(ordenes[0], filepath)
    else:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"CE_Multiples_{timestamp}.xlsx"
        filepath = os.path.join(EXTRACTIONS_DIR, filename)
        exportar_multiples(ordenes, filepath)

    return filepath
