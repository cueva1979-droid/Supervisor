import sys
sys.path.insert(0, '.')
import pdfplumber
import json

# PDF table debug
print("=== PDF TABLES ===")
with pdfplumber.open(r'uploads\0002-ORDEN DE COMPRA-INFRAESTRUCTURA-INFANTIL.pdf') as pdf:
    for pi, page in enumerate(pdf.pages):
        tables = page.extract_tables()
        print(f"Page {pi}: {len(tables)} tables")
        for ti, table in enumerate(tables):
            print(f"\n  Table {ti} ({len(table)} rows):")
            for ri, row in enumerate(table):
                clean = [str(c or "")[:50] for c in row]
                print(f"    [{ri}] {clean}")
                if ri > 25:
                    print("    ... truncated")
                    break
