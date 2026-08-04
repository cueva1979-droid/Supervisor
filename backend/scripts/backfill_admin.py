import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from database import SessionLocal, init_db
from models import Record
from parser import DocumentParser

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")

def backfill():
    init_db()
    db = SessionLocal()
    records = db.query(Record).all()
    count = 0
    for record in records:
        if record.administrador:
            continue
        filepath = os.path.join(UPLOAD_DIR, record.filename)
        if not os.path.exists(filepath):
            continue
        try:
            parser = DocumentParser(filepath, record.filename)
            admin = parser.extract_administrador()
            if admin:
                record.administrador = admin
                db.commit()
                count += 1
        except:
            pass
    db.close()
    print(f"Backfilled {count} records")

if __name__ == "__main__":
    backfill()
