import sys
sys.path.insert(0, '.')
from parser import DocumentParser
import re

CPC_RE = re.compile(r'^\d{8,}$')

def debug_table_parsing(table):
    if not table or len(table) < 3:
        return
    ncols = len(table[0])
    print(f"  Table: {len(table)} rows x {ncols} cols")
    col_stats = {i: {"nums": [], "decimals": 0, "texts": [], "cpc_count": 0} for i in range(ncols)}
    for row in table:
        for i in range(min(len(row), ncols)):
            val = str(row[i] or "").strip()
            if not val: continue
            if CPC_RE.match(val):
                col_stats[i]["cpc_count"] += 1
            try:
                num = float(val.replace(',', '').replace(' ', '')) if val else 0
                if num > 0:
                    col_stats[i]["nums"].append(num)
                    if num != int(num):
                        col_stats[i]["decimals"] += 1
            except:
                pass
            if len(val) > 5:
                col_stats[i]["texts"].append(val)

    # Detect as in parser
    best_cpc = 0
    cpc_col = None
    for i, st in col_stats.items():
        if st["cpc_count"] > best_cpc:
            best_cpc = st["cpc_count"]
            cpc_col = i
    if best_cpc < 3:
        cpc_col = None
    print(f"  cpc_col={cpc_col} (count={best_cpc})")

    desc_col = None
    if cpc_col is not None:
        best_len = 0
        for i in range(cpc_col + 1, ncols):
            st = col_stats[i]
            if len(st["texts"]) >= 3:
                total_len = sum(len(t) for t in st["texts"])
                if total_len > best_len:
                    best_len = total_len
                    desc_col = i
    if desc_col is None and cpc_col is not None:
        best_len = 0
        for i, st in col_stats.items():
            if i != cpc_col and len(st["texts"]) >= 3:
                total_len = sum(len(t) for t in st["texts"])
                if total_len > best_len:
                    best_len = total_len
                    desc_col = i
    print(f"  desc_col={desc_col}")

    qty_col = None
    candidates_qty = []
    for i in range(desc_col + 1, ncols) if desc_col else range(ncols):
        st = col_stats[i]
        small = [n for n in st["nums"] if n < 1000 and n > 0]
        if len(small) >= 3:
            decimal_ratio = st["decimals"] / max(len(st["nums"]), 1)
            candidates_qty.append((i, len(small), decimal_ratio))
    if candidates_qty:
        candidates_qty.sort(key=lambda x: (-x[1], -x[2]))
        qty_col = candidates_qty[0][0]
    print(f"  qty_col={qty_col} (candidates={candidates_qty})")

    price_col = None
    for i in range(qty_col + 1 if qty_col else (desc_col + 1 if desc_col else 0), ncols):
        st = col_stats[i]
        nums = [n for n in st["nums"] if n >= 0.01]
        if len(nums) >= 3:
            avg = sum(nums) / len(nums)
            if price_col is None or avg > (sum(col_stats[price_col]["nums"]) / len(col_stats[price_col]["nums"])):
                price_col = i
    print(f"  price_col={price_col}")

# Run on the actual tables
parser = DocumentParser(r'..\0002.docx', '0002.docx')
parser.extract_text()
print("=== DOCX Table Analysis ===")
for i, t in enumerate(parser.tables):
    debug_table_parsing(t)

import pdfplumber
print("\n=== PDF Table Analysis ===")
with pdfplumber.open(r'uploads\0002-ORDEN DE COMPRA-INFRAESTRUCTURA-INFANTIL.pdf') as pdf:
    for pi, page in enumerate(pdf.pages):
        for ti, table in enumerate(page.extract_tables()):
            print(f"\nPage {pi}, Table {ti}:")
            debug_table_parsing(table)
