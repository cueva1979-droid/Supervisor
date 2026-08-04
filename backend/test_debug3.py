import sys, re
sys.path.insert(0, '.')
from parser import DocumentParser

CPC_RE = re.compile(r'^\d{8,}$')

# Check PDF tables directly
import pdfplumber
print("=== PDF TABLE COLUMN ANALYSIS ===")
with pdfplumber.open(r'uploads\0002-ORDEN DE COMPRA-INFRAESTRUCTURA-INFANTIL.pdf') as pdf:
    for pi, page in enumerate(pdf.pages):
        tables = page.extract_tables()
        for ti, table in enumerate(tables):
            print(f"\nPage {pi}, Table {ti}: {len(table)} rows, {len(table[0])} cols")
            col_stats = {i: {"nums": [], "cpc_count": 0} for i in range(len(table[0]))}
            for row in table:
                for i, cell in enumerate(row):
                    val = str(cell or "").strip()
                    if not val: continue
                    if CPC_RE.match(val):
                        col_stats[i]["cpc_count"] += 1
                    try:
                        p = val.replace('.','').replace(',','')
                        if p.replace('.','').isdigit():
                            num = float(val.replace(',','.').replace(' ',''))
                            col_stats[i]["nums"].append(num)
                    except:
                        pass
            for i, st in sorted(col_stats.items()):
                small = [n for n in st["nums"] if n < 1000 and n > 0]
                print(f"  Col {i}: cpc_count={st['cpc_count']}, nums={len(st['nums'])}, small_qty={len(small)}, examples={[round(n,2) for n in st['nums'][:3]]}")

# Also test DOCX table
from docx import Document
print("\n=== DOCX TABLE COLUMN ANALYSIS ===")
doc = Document(r'..\0002.docx')
for ti, table in enumerate(doc.tables):
    rows_data = []
    for row in table.rows:
        rows_data.append([cell.text.strip() for cell in row.cells])
    ncols = len(rows_data[0])
    col_stats = {i: {"nums": [], "cpc_count": 0} for i in range(ncols)}
    for row in rows_data:
        for i, cell in enumerate(row):
            val = str(cell or "").strip()
            if not val: continue
            if CPC_RE.match(val):
                col_stats[i]["cpc_count"] += 1
            try:
                p = val.replace('.','').replace(',','')
                if p.replace('.','').isdigit():
                    num = float(val.replace(',','.').replace(' ',''))
                    col_stats[i]["nums"].append(num)
            except:
                pass
    print(f"\nTable {ti}: {len(rows_data)} rows, {ncols} cols")
    for i, st in sorted(col_stats.items()):
        small = [n for n in st["nums"] if n < 1000 and n > 0]
        print(f"  Col {i}: cpc_count={st['cpc_count']}, nums={len(st['nums'])}, small_qty={len(small)}, examples={[round(n,2) for n in st['nums'][:3]]}")
