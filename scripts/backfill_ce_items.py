import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "backend"))

from sqlalchemy.orm import Session
from database import SessionLocal
from models import CEExtractionDB, CEItemDB
from extractor_oc.parser import PDFExtractor


def backfill(db: Session, uploads_dir: str) -> None:
    orders = db.query(CEExtractionDB).all()
    fixed = 0
    for ext in orders:
        if ext.items:
            continue
        if not ext.orden_compra:
            continue
        candidates = [
            f for f in os.listdir(uploads_dir)
            if f.lower().startswith("ce_") and f.lower().endswith(".pdf")
            and ext.orden_compra.lower() in f.lower()
        ]
        if not candidates:
            print("SKIP (sin pdf local):", ext.orden_compra, "| filename:", ext.filename)
            continue
        path = os.path.join(uploads_dir, candidates[0])
        result = PDFExtractor(path).extract()
        if not result.items:
            print("SKIP (0 items extraidos):", ext.orden_compra, "|", candidates[0])
            continue
        for it in result.items:
            db.add(CEItemDB(
                extraction_id=ext.id,
                cpc=it.cpc,
                descripcion=it.descripcion,
                cantidad=it.cantidad,
                v_unitario=it.v_unitario,
                subtotal=it.subtotal,
                partida_presupuestaria=it.partida_presupuestaria,
            ))
        ext.v_total = result.v_total
        db.flush()
        fixed += 1
        print("OK:", ext.orden_compra, "|", len(result.items), "items |", candidates[0])
    db.commit()
    print("Total corregidas:", fixed)


if __name__ == "__main__":
    db = SessionLocal()
    try:
        backfill(db, os.path.join(os.path.dirname(__file__), "..", "uploads"))
    finally:
        db.close()