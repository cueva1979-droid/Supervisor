import sys, re
sys.path.insert(0, '.')
from parser import DocumentParser

# Monkey-patch BEFORE creating instances
original = DocumentParser._parse_item_table_v2
def debug_parse(self, table):
    CPC_RE = re.compile(r'^\d{8,}$')
    ncols = len(table[0])
    cpc_col = desc_col = qty_col = price_col = None
    col_stats = {i: {"nums": [], "decimals": 0, "texts": [], "cpc_count": 0, "unique_texts": set()} for i in range(ncols)}
    for row in table:
        for i in range(min(len(row), ncols)):
            val = str(row[i] or "").strip()
            if not val: continue
            if CPC_RE.match(val):
                col_stats[i]["cpc_count"] += 1
            try:
                num = float(val.replace(',','').replace(' ',''))
                if num > 0:
                    col_stats[i]["nums"].append(num)
                    if num != int(num):
                        col_stats[i]["decimals"] += 1
            except:
                pass
            col_stats[i]["unique_texts"].add(val)
            if len(val) > 5:
                col_stats[i]["texts"].append(val)

    best_cpc = 0
    for i, st in col_stats.items():
        if st["cpc_count"] > best_cpc:
            best_cpc = st["cpc_count"]
            cpc_col = i
    if best_cpc < 3: cpc_col = None

    def is_dup(i):
        if i == 0: return False
        common = len(col_stats[i]["unique_texts"] & col_stats[i-1]["unique_texts"])
        total = len(col_stats[i]["unique_texts"]) + len(col_stats[i-1]["unique_texts"])
        if total == 0: return False
        return common / max(total, 1) > 0.6

    if cpc_col is not None:
        for i in range(cpc_col + 1, ncols):
            st = col_stats[i]
            if len(st["texts"]) >= 3 and not is_dup(i):
                desc_col = i
                break
        if desc_col is None:
            for i in range(cpc_col + 1, ncols):
                if len(col_stats[i]["texts"]) >= 3:
                    desc_col = i
                    break

    if desc_col is not None:
        for i in range(desc_col + 1, ncols):
            if is_dup(i): continue
            st = col_stats[i]
            small = [n for n in st["nums"] if n < 1000 and n > 0]
            if len(small) >= 3 and i != cpc_col:
                qty_col = i
                break

    if qty_col is not None:
        for i in range(qty_col + 1, ncols):
            if is_dup(i): continue
            st = col_stats[i]
            nums = [n for n in st["nums"] if n >= 0.01]
            if len(nums) >= 3 and i != cpc_col:
                price_col = i
                break

    print("DEBUG COLUMNS:", f"cpc={cpc_col} desc={desc_col} qty={qty_col} price={price_col}")
    for i in range(ncols):
        st = col_stats[i]
        small = [n for n in st["nums"] if n < 1000 and n > 0]
        print(f"  col[{i}]: cpc={st['cpc_count']} texts={len(st['texts'])} nums={len(st['nums'])} dec={st['decimals']} small={len(small)} unique={len(st['unique_texts'])} dup_prev={is_dup(i)}")
    
    # Debug: which rows pass the filter?
    print("DEBUG ROWS:")
    for ri, row in enumerate(table):
        first = str(row[0] or "").strip()
        if not first:
            print(f"  row[{ri}]: SKIP (empty first)")
            continue
        if first.upper() in ["SUBTOTAL", "TOTAL", "NOTAS:", "NRO.", "NRO", "ITEM"]:
            print(f"  row[{ri}]: SKIP (keyword: {first})")
            continue
        if not first.isdigit():
            print(f"  row[{ri}]: SKIP (not digit: {first})")
            continue
        cpc_val = str(row[cpc_col] or "").strip() if cpc_col is not None and cpc_col < len(row) else ""
        if cpc_val and not CPC_RE.match(cpc_val):
            print(f"  row[{ri}]: SKIP (cpc mismatch: {cpc_val})")
            continue
        desc_val = str(row[desc_col] or "").strip() if desc_col is not None and desc_col < len(row) else ""
        if not desc_val or len(desc_val) < 5:
            print(f"  row[{ri}]: SKIP (short desc: '{desc_val[:30]}')")
            continue
        qty_str = str(row[qty_col] or "").strip() if qty_col is not None and qty_col < len(row) else ""
        price_str = str(row[price_col] or "").strip() if price_col is not None and price_col < len(row) else ""
        print(f"  row[{ri}]: PASS first={first} cpc={cpc_val} desc='{desc_val[:30]}' qty={qty_str} price={price_str}")
    
    result = original(self, table)
    print(f"  => {len(result)} items returned")
    return result

DocumentParser._parse_item_table_v2 = debug_parse

# Now test
parser = DocumentParser(r'..\0002.docx', '0002.docx')
print("=== DOCX PARSING ===")
data = parser.get_all_data()
print(f"Total items: {len(data['items'])}")
