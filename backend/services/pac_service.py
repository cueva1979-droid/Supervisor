import uuid
import re
import io
from typing import List, Optional
from sqlalchemy.orm import Session

# Period classification
PERIOD_DEFINITIONS = {
    "C1": {"code": "C1", "label": "Cuatrimestre 1", "months": "Enero - Abril", "monthNumbers": [1, 2, 3, 4]},
    "C2": {"code": "C2", "label": "Cuatrimestre 2", "months": "Mayo - Agosto", "monthNumbers": [5, 6, 7, 8]},
    "C3": {"code": "C3", "label": "Cuatrimestre 3", "months": "Septiembre - Diciembre", "monthNumbers": [9, 10, 11, 12]},
}

MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
             'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']


def quarterly_from_month(month: int) -> str:
    if 1 <= month <= 4:
        return "C1"
    if 5 <= month <= 8:
        return "C2"
    return "C3"


def compute_status(code: str, current_month: int) -> str:
    definition = PERIOD_DEFINITIONS.get(code)
    if not definition:
        return "unknown"
    month_numbers = definition["monthNumbers"]
    start, end = month_numbers[0], month_numbers[-1]
    if start <= current_month <= end:
        return "current"
    if current_month > end:
        return "past"
    return "future"


def classify_period(periodo: Optional[str], current_month: int):
    if not periodo:
        return {"periodCategory": None, "status": "unknown"}

    value = str(periodo).lower().strip()

    match = re.match(r'^c\s*([123])$', value)
    if match:
        code = f"C{match.group(1)}"
        return {"periodCategory": code, "status": compute_status(code, current_month)}

    for i, month_name in enumerate(MONTHS_ES):
        if month_name in value:
            month = i + 1
            code = quarterly_from_month(month)
            return {"periodCategory": code, "status": compute_status(code, current_month)}

    match = re.search(r'c\s*([123])', value)
    if match:
        code = f"C{match.group(1)}"
        return {"periodCategory": code, "status": compute_status(code, current_month)}

    return {"periodCategory": None, "status": "unknown"}


def extract_excel_data(file_bytes: bytes) -> List[dict]:
    """Extract PAC data from Excel file."""
    try:
        import openpyxl
    except ImportError:
        raise Exception("openpyxl is required for Excel parsing")

    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
    ws = wb.active
    if ws is None:
        return []

    rows = []
    for row in ws.iter_rows(values_only=True):
        rows.append([str(c) if c is not None else "" for c in row])

    if not rows:
        return []

    # Find header row and map columns
    header_keywords = {
        "partida_presupuestaria": ["nro. partida presupuestaria", "nro partida presupuestaria",
                                    "partida presupuestaria", "partida", "presupuestaria"],
        "cpc": ["cpc"],
        "tipo_compra": ["tipo de compra", "tipo compra", "t. compra"],
        "tipo_regimen": ["tipo de regimen", "tipo regimen", "t. regimen"],
        "procedimiento": ["procedimiento"],
        "descripcion": ["descripcion", "descripción"],
        "costo_unitario": ["costo unitario", "costo", "costo u."],
        "periodo": ["periodo", "período"],
    }

    header_row_idx = -1
    column_mapping = {}

    for i in range(min(len(rows), 10)):
        row = rows[i]
        mapping = {}
        match_count = 0
        for field, keywords in header_keywords.items():
            for idx, cell in enumerate(row):
                cell_lower = str(cell).lower().strip()
                if any(kw in cell_lower for kw in keywords):
                    mapping[field] = idx
                    match_count += 1
                    break
        if match_count >= 2 and match_count > len(column_mapping):
            column_mapping = mapping
            header_row_idx = i

    if header_row_idx == -1:
        # Default mapping by position
        keys_list = list(header_keywords.keys())[:len(rows[0])]
        column_mapping = {k: i for i, k in enumerate(keys_list)}
        header_row_idx = 0

    # Extract data
    documents = []
    seen = set()
    start_idx = header_row_idx + 1

    for i in range(start_idx, len(rows)):
        row = rows[i]
        if not any(row):
            continue

        raw_cost = str(column_mapping.get("costo_unitario", "") if column_mapping.get("costo_unitario", 0) < len(row) else "")
        if column_mapping.get("costo_unitario", 0) < len(row):
            raw_cost = row[column_mapping["costo_unitario"]]
            cost_val = _parse_cost(raw_cost)
        else:
            cost_val = None

        def _get(key):
            idx = column_mapping.get(key)
            if idx is not None and idx < len(row):
                return str(row[idx]).strip()
            return ""

        doc = {
            "partida_presupuestaria": _get("partida_presupuestaria"),
            "cpc": _get("cpc"),
            "tipo_compra": _get("tipo_compra"),
            "tipo_regimen": _get("tipo_regimen"),
            "procedimiento": _get("procedimiento"),
            "descripcion": _get("descripcion"),
            "costo_unitario": cost_val,
            "periodo": _get("periodo"),
        }

        dedup_key = f"{doc['partida_presupuestaria']}|{doc['cpc']}|{doc['periodo']}".lower()
        if dedup_key in seen:
            continue
        seen.add(dedup_key)
        documents.append(doc)

    return documents


def _parse_cost(raw_cost: str) -> Optional[float]:
    """Parse cost string handling both 1.234,56 and 1234.56 formats."""
    try:
        raw = str(raw_cost).strip()
        if not raw:
            return None
        # Remove currency symbols
        raw = raw.replace('$', '').replace('€', '').strip()
        if '.' in raw and ',' in raw:
            if raw.index('.') < raw.index(','):
                raw = raw.replace('.', '').replace(',', '.')
            else:
                raw = raw.replace(',', '')
        elif ',' in raw:
            raw = raw.replace(',', '.')
        return float(raw)
    except (ValueError, TypeError):
        return None


def extract_pdf_data(file_bytes: bytes) -> Optional[dict]:
    """Extract PAC data from PDF file (single-document format)."""
    try:
        import pdfplumber
    except ImportError:
        raise Exception("pdfplumber is required for PDF parsing")

    text = ""
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            text += page.extract_text() or ""

    if not text:
        return None

    fields = {
        "partida_presupuestaria": None,
        "cpc": None,
        "tipo_compra": None,
        "tipo_regimen": None,
        "procedimiento": None,
        "descripcion": None,
        "costo_unitario": None,
        "periodo": None,
    }

    full_text = re.sub(r'\s+', ' ', text)

    patterns = {
        "partida_presupuestaria": r'(?:partida\s*(?:presupuestaria)?[\s:]+)([\d\.\-\s]+)',
        "cpc": r'(?:cpc[\s:]+)([\w\-\.]+)',
        "tipo_compra": r'(?:tipo\s*de\s*compra[\s:]+)([\w\s]+?)(?=\s*(?:tipo|regimen|procedimiento|descripción|costo|periodo)|$)',
        "tipo_regimen": r'(?:tipo\s*de\s*(?:regimen|régimen)[\s:]+)([\w\s]+?)(?=\s*(?:procedimiento|descripción|costo|periodo)|$)',
        "procedimiento": r'(?:procedimiento[\s:]+)([\w\s]+?)(?=\s*(?:descripción|costo|periodo)|$)',
        "descripcion": r'(?:descripci[oó]n[\s:]+)([\w\s]+?)(?=\s*(?:costo|periodo|unitario)|$)',
        "costo_unitario": r'(?:costo\s*unitario|precio|valor[\s:]+)([\d\.,\s]+?)(?=\s*(?:periodo|enero|febrero)|$)',
        "periodo": r'(?:periodo[\s:]+)([\w\d\-\/]+?)(?=\s*$)',
    }

    for field, pattern in patterns.items():
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            val = match.group(1).strip()
            if field == "costo_unitario":
                parsed = _parse_cost(val)
                if parsed is not None:
                    fields[field] = parsed
            else:
                fields[field] = val

    lines = text.split('\n')
    if not fields["partida_presupuestaria"] or not fields["cpc"] or not fields["descripcion"]:
        for i, line in enumerate(lines):
            line = line.strip()
            next_line = lines[i + 1].strip() if i + 1 < len(lines) else ""
            if re.search(r'partida', line, re.IGNORECASE) and not fields["partida_presupuestaria"]:
                fields["partida_presupuestaria"] = next_line or line.split(':')[-1].strip()
            if re.search(r'cpc', line, re.IGNORECASE) and not fields["cpc"]:
                fields["cpc"] = next_line or line.split(':')[-1].strip()
            if re.search(r'descripci[oó]n', line, re.IGNORECASE) and not fields["descripcion"]:
                fields["descripcion"] = next_line or line.split(':')[-1].strip()
            if re.search(r'costo|precio|valor', line, re.IGNORECASE) and not fields["costo_unitario"]:
                val = (next_line or line.split(':')[-1]).strip()
                parsed = _parse_cost(val)
                if parsed is not None:
                    fields["costo_unitario"] = parsed
            if re.search(r'periodo', line, re.IGNORECASE) and not fields["periodo"]:
                fields["periodo"] = next_line or line.split(':')[-1].strip()
            if re.search(r'procedimiento', line, re.IGNORECASE) and not fields["procedimiento"]:
                fields["procedimiento"] = next_line or line.split(':')[-1].strip()

    return fields


def extract_pdf_tabular_data(file_bytes: bytes) -> List[dict]:
    """Extract multiple PAC records from a PDF table (Consulta PAC format).

    Robust heuristic: handles variable column counts (27 cols on page 0, 21 cols on
    middle pages, 31 cols on last page), merged cells and page-break artifacts.
    Pattern-based detection replaces fixed column indices which caused 0 records
    to be extracted from the real SERCOP PDF (94 records).
    """
    try:
        import pdfplumber
    except ImportError:
        raise Exception("pdfplumber is required for PDF parsing")

    items = []
    seen_keys = set()
    in_consolidated = False

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            if not tables:
                continue
            for table in tables:
                for row in table:
                    if not row:
                        continue
                    # Detect start of "Partidas Consolidadas" section – skip its 3 aggregated rows
                    # Only trigger when a cell is exactly the header, not when huge merged cell (4800 chars) contains it
                    is_consolidated_header = any(
                        str(c).strip().lower() == "partidas consolidadas" or
                        (len(str(c).strip()) < 80 and "partidas consolidadas" in str(c).lower())
                        for c in row if c
                    )
                    if is_consolidated_header:
                        in_consolidated = True
                        continue
                    if in_consolidated:
                        joined_lower = " ".join([str(c or "") for c in row]).lower()
                        # Skip the aggregated header row (Nro. / Partida ...) after the flag
                        if "nro" in joined_lower and "cpc" in joined_lower:
                            continue
                        temp_nro = None
                        for c in row:
                            if c and re.match(r"^\d{1,3}$", str(c).strip()):
                                try:
                                    v = int(str(c).strip())
                                    if 1 <= v <= 3:
                                        temp_nro = str(v)
                                        break
                                except:
                                    pass
                        if temp_nro:
                            continue
                        # After consolidated rows, keep skipping – but only for true consolidated rows
                        # If no nro 1-3, break out (should not happen, but reset flag to avoid skipping valid rows)
                        if not temp_nro:
                            in_consolidated = False

                    # --- Heuristic field extraction (position-independent) ---
                    # nro: first small integer 1..200
                    nro = None
                    for c in row:
                        if c is None:
                            continue
                        cc = str(c).strip()
                        if re.match(r"^\d{1,3}$", cc):
                            try:
                                v = int(cc)
                                if 1 <= v <= 200:
                                    nro = cc
                                    break
                            except:
                                pass
                    if not nro:
                        continue

                    # partida: pattern d+.d+ (e.g. 351.8.4.01.05, 3.5.1.7.3.06.04.05)
                    partida = None
                    for c in row:
                        if c is None:
                            continue
                        cc = re.sub(r"\s+", "", str(c)).rstrip(".")
                        if re.match(r"^\d+(\.\d+)+$", cc) and "." in cc and len(cc) >= 5:
                            partida = str(c).strip()
                            break
                    if not partida:
                        continue

                    # cpc: 9-10 digits
                    cpc = None
                    for c in row:
                        if c is None:
                            continue
                        cc = re.sub(r"\s+", "", str(c))
                        if re.match(r"^\d{9,10}$", cc):
                            cpc = cc
                            break
                    if not cpc:
                        continue

                    # periodo: C1 / C2 / C3 / C1 C2 etc., search from end
                    periodo = None
                    for c in reversed(row):
                        if c and re.search(r"C\s*[123]", str(c)):
                            cc = str(c).strip()
                            if len(cc) < 15 and re.search(r"C[123]", cc) and re.match(r"^[C123\s]+$", cc):
                                periodo = cc
                                break
                    # tipo_compra
                    tipo_compra = ""
                    for c in row:
                        if c and str(c).strip().lower() in ("bien", "servicio", "obra", "consultoria"):
                            tipo_compra = str(c).strip()
                            break
                    # tipo_regimen and procedimiento: best effort near middle
                    tipo_regimen = ""
                    procedimiento = ""
                    for c in row:
                        if c:
                            cc = str(c).strip().lower()
                            if cc in ("com\u00fan", "com\u00fan", "especial"):
                                # The next cell after tipo_compra often is regimen, but we approximate
                                if not tipo_regimen:
                                    tipo_regimen = str(c).strip()
                            if cc in ("licitación", "licitaci\u00f3n", "subasta\ninversa\nelectr\u00f3nica", "catalogo\nelectr\u00f3nico", "concurso\npublico", "ferias\ninclusivas", "infima cuant\u00eda", "bienes y\nservicios\n\u00fanicos", "contratos\nentre\nentidades\np\u00fablicas o sus\nsubsidiarias"):
                                if not procedimiento:
                                    procedimiento = str(c).strip()
                    # clean procedimiento better: look for those keywords, skip huge merged cell
                    for c in row:
                        if c:
                            cc = str(c).strip()
                            if len(cc) > 800:
                                continue
                            low = cc.lower()
                            if any(k in low for k in ["subasta", "licitaci", "catalogo", "concurso", "ferias", "infima", "bienes y", "contratos", "comunicaci"]):
                                procedimiento = cc.replace("\n", " ").strip()
                                break

                    # costo: monetary pattern 1,000.0000
                    monetary = []
                    for c in row:
                        if c and re.match(r"^\d{1,3}(,\d{3})*\.\d+$", str(c).strip()):
                            monetary.append(str(c).strip())
                    costo_u = None
                    if monetary:
                        # last two are Costo U and V.Total – take Costo U
                        costo_u = monetary[-2] if len(monetary) >= 2 else monetary[-1]

                    # descripcion: longest text >20 chars, ignore huge merged cell (>800) and generic headers
                    desc = ""
                    maxlen = 0
                    for c in row:
                        if c:
                            cc = str(c).strip()
                            if len(cc) > 800:
                                continue
                            if cc == nro or cc == partida or cc == cpc or cc == (periodo or "") or cc == (costo_u or ""):
                                continue
                            low = cc.lower()
                            if low in ("proyecto de\ninversi\u00f3n", "gasto\ncorriente", "normalizado", "no aplica", "no", "si", "bien", "servicio", "obra", "consultoria"):
                                continue
                            if len(cc) > maxlen and len(cc) > 20 and " " in cc:
                                maxlen = len(cc)
                                desc = cc
                    desc_clean = re.sub(r"\s+", " ", desc).strip() if desc else ""
                    partida_clean = re.sub(r"\s+", "", partida).rstrip(".") if partida else ""
                    cpc_clean = re.sub(r"\s+", "", cpc) if cpc else ""
                    costo_parsed = _parse_cost(costo_u) if costo_u else None
                    periodo_clean = re.sub(r"\s+", " ", periodo).strip() if periodo else ""

                    # Deduplicate within file (same partida|cpc|periodo)
                    dedup_key = f"{partida_clean}|{cpc_clean}|{periodo_clean}".lower()
                    if dedup_key in seen_keys:
                        continue
                    seen_keys.add(dedup_key)

                    items.append({
                        "partida_presupuestaria": partida_clean,
                        "cpc": cpc_clean,
                        "tipo_compra": tipo_compra.replace("\n", " ").strip() if tipo_compra else "",
                        "tipo_regimen": tipo_regimen.replace("\n", " ").strip() if tipo_regimen else "",
                        "procedimiento": procedimiento,
                        "descripcion": desc_clean,
                        "costo_unitario": costo_parsed,
                        "periodo": periodo_clean,
                    })

    return items


def _clean_cell(val) -> str:
    if val is None:
        return ""
    return str(val).strip()


def _is_blank_row(*cells) -> bool:
    return all(c in ('', None) for c in cells)
