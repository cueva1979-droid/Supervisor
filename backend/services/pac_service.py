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

    for i in range(min(len(rows), 5)):
        row = rows[i]
        mapping = {}
        match_count = 0
        for field, keywords in header_keywords.items():
            for cell in row:
                cell_lower = str(cell).lower().strip()
                if any(kw in cell_lower for kw in keywords):
                    mapping[field] = row.index(cell)
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
    """Extract multiple PAC records from a PDF table (Consulta PAC format)."""
    try:
        import pdfplumber
    except ImportError:
        raise Exception("pdfplumber is required for PDF parsing")

    items = []
    current_desc = ""

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    if not row:
                        continue

                    nro = _clean_cell(row[1]) if len(row) > 1 else ""
                    partida = _clean_cell(row[2]) if len(row) > 2 else ""
                    cpc = _clean_cell(row[3]) if len(row) > 3 else ""
                    tipo_compra = _clean_cell(row[4]) if len(row) > 4 else ""
                    desc = _clean_cell(row[5]) if len(row) > 5 else ""
                    costo_u = _clean_cell(row[8]) if len(row) > 8 else ""
                    periodo = _clean_cell(row[10]) if len(row) > 10 else ""

                    # Skip header rows
                    if nro.lower() in ('nro.', 'nro'):
                        continue
                    if _is_blank_row(nro, partida, cpc, desc):
                        continue

                    # Detect continuation row (description continues from previous item)
                    if not nro and not partida and not cpc and desc:
                        if current_desc:
                            current_desc += " " + desc.replace('\n', ' ').strip()
                        continue

                    # Assign accumulated description to previous item
                    if current_desc and items:
                        items[-1]["descripcion"] = current_desc

                    current_desc = desc.replace('\n', ' ').strip() if desc else ""

                    if 'total' in (partida + cpc + tipo_compra + desc).lower():
                        continue

                    # Skip non-data rows (entity info, year, value rows)
                    cpc_clean = re.sub(r'\s+', ' ', cpc).strip() if cpc else ""
                    if not cpc_clean or not re.match(r'^\d{6,}', cpc_clean):
                        continue
                    if not nro.isdigit():
                        continue

                    partida_clean = re.sub(r'\s+', ' ', partida).strip() if partida else ""
                    costo_parsed = _parse_cost(costo_u)
                    periodo_clean = re.sub(r'\s+', ' ', periodo).strip() if periodo else ""

                    items.append({
                        "partida_presupuestaria": partida_clean,
                        "cpc": cpc_clean,
                        "tipo_compra": tipo_compra.replace('\n', ' ').strip() if tipo_compra else "",
                        "tipo_regimen": "",
                        "procedimiento": "",
                        "descripcion": current_desc,
                        "costo_unitario": costo_parsed,
                        "periodo": periodo_clean,
                    })

        if current_desc and items:
            items[-1]["descripcion"] = current_desc

    return items


def _clean_cell(val) -> str:
    if val is None:
        return ""
    return str(val).strip()


def _is_blank_row(*cells) -> bool:
    return all(c in ('', None) for c in cells)
