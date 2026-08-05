"""Migra data/supervisor.db (SQLite) a Neon PostgreSQL.

Uso:
    python backend/scripts/migrate_to_neon.py --dst "postgresql://user:pass@host/db"
    python backend/scripts/migrate_to_neon.py --src data/supervisor.db --dst "postgresql://..."

Opcional: --create-only para crear el esquema sin copiar datos.
"""

import os
import sys
import argparse

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from sqlalchemy import create_engine, text, MetaData, Table

from models import Base

TABLES_IN_ORDER = [
    "users",
    "providers",
    "pac_documents",
    "pac_certificates",
    "cpc_catalog",
    "cpc_loaded_data",
    "ce_extractions",
    "cam_extractions",
    "records",
    "items",
    "ce_items",
    "audit_logs",
    "login_attempts",
]

SEQUENCE_TABLES = [
    "users", "providers", "records", "items",
    "ce_items", "cpc_loaded_data", "audit_logs", "login_attempts",
]


def main():
    parser = argparse.ArgumentParser(description="Migrar SQLite -> Neon PostgreSQL")
    parser.add_argument("--src", default=os.path.join(BASE_DIR, "data", "supervisor.db"))
    parser.add_argument("--dst", required=True, help="Cadena de conexión PostgreSQL de Neon")
    parser.add_argument("--create-only", action="store_true")
    args = parser.parse_args()

    if not os.path.exists(args.src):
        print(f"[ERROR] No existe el origen: {args.src}")
        sys.exit(1)

    dst_url = args.dst
    if dst_url.startswith("postgres://"):
        dst_url = dst_url.replace("postgres://", "postgresql://", 1)

    src_engine = create_engine(f"sqlite:///{os.path.abspath(args.src)}", echo=False)
    dst_engine = create_engine(dst_url, echo=False, pool_pre_ping=True)

    print(f"[1/5] Creando esquema en Neon ({TABLES_IN_ORDER.__len__()} tablas)...")
    Base.metadata.create_all(bind=dst_engine)

    if args.create_only:
        print("Esquema creado. (--create-only)")
        return

    src_meta = MetaData()
    src_meta.reflect(bind=src_engine)
    dst_meta = MetaData()
    dst_meta.reflect(bind=dst_engine)

    src_tables = set(src_meta.tables.keys())
    total_rows = 0

    with dst_engine.begin() as dst_conn:
        for table_name in TABLES_IN_ORDER:
            if table_name not in src_tables or table_name not in dst_meta.tables:
                print(f"  - {table_name}: omitida (no existe en origen o destino)")
                continue
            src_table = src_meta.tables[table_name]
            dst_table = dst_meta.tables[table_name]

            src_rows = src_engine.connect().execute(src_table.select()).mappings().all()
            if not src_rows:
                print(f"  - {table_name}: 0 filas")
                continue

            rows = [dict(r) for r in src_rows]
            columns = list(rows[0].keys())

            insert = dst_table.insert()
            for i in range(0, len(rows), 500):
                chunk = rows[i:i + 500]
                dst_conn.execute(insert, [{c: row[c] for c in columns} for row in chunk])

            total_rows += len(rows)
            print(f"  - {table_name}: {len(rows)} filas copiadas")

    if not args.create_only:
        print("[2/5] Sincronizando secuencias (id autoincrementales)...")
        with dst_engine.begin() as dst_conn:
            for table_name in SEQUENCE_TABLES:
                if table_name not in dst_meta.tables:
                    continue
                try:
                    seq = dst_conn.execute(
                        text("SELECT pg_get_serial_sequence(:t, 'id')"),
                        {"t": table_name},
                    ).scalar()
                    if seq:
                        dst_conn.execute(
                            text(f"SELECT setval('{seq}', COALESCE((SELECT MAX(id) FROM {table_name}), 1))")
                        )
                except Exception as e:
                    print(f"  - {table_name}: secuencia no actualizada ({e})")

    print(f"[DONE] {total_rows} filas migradas a Neon.")

    with src_engine.connect() as c:
        for t in TABLES_IN_ORDER:
            if t in src_tables:
                n = c.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
                print(f"  origen {t}: {n}")
    with dst_engine.connect() as c:
        for t in TABLES_IN_ORDER:
            if t in dst_meta.tables:
                n = c.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
                print(f"  neon  {t}: {n}")


if __name__ == "__main__":
    main()
