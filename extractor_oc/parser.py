import re
import pdfplumber
from typing import List, Optional
from dataclasses import dataclass, field, asdict


MONTHS_ES = {
    "enero": "01", "febrero": "02", "marzo": "03", "abril": "04",
    "mayo": "05", "junio": "06", "julio": "07", "agosto": "08",
    "septiembre": "09", "octubre": "10", "noviembre": "11", "diciembre": "12",
}


@dataclass
class ItemOC:
    cpc: str = ""
    descripcion: str = ""
    cantidad: float = 0.0
    unidad: str = ""
    v_unitario: float = 0.0
    subtotal: float = 0.0
    partida_presupuestaria: str = ""


@dataclass
class OrdenCompra:
    orden_compra: str = ""
    fecha_aceptacion: str = ""
    nombre_comercial: str = ""
    razon_social: str = ""
    ruc: str = ""
    administrador: str = ""
    objeto_contratacion: str = ""
    items: List[ItemOC] = field(default_factory=list)
    v_total: float = 0.0

    def to_dict(self):
        d = asdict(self)
        d["items"] = [asdict(it) for it in self.items]
        return d


class PDFExtractor:
    def __init__(self, filepath: str):
        self.filepath = filepath
        self.text = ""
        self.tables = []
        self._is_ce_format = False

    def extract(self) -> OrdenCompra:
        self._load_pdf()
        self._is_ce_format = "ORDEN DE COMPRA POR CATÁLOGO ELECTRÓNICO" in self.text.upper()
        oc = OrdenCompra()
        if self._is_ce_format:
            self._extract_ce(oc)
        else:
            self._extract_infima(oc)
        return oc

    def _load_pdf(self):
        with pdfplumber.open(self.filepath) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    self.text += page_text + "\n"
                tables = page.extract_tables()
                if tables:
                    self.tables.extend(tables)

    def _normalize_date(self, date_str: str) -> str:
        date_str = date_str.strip()
        m = re.match(
            r"(\d{1,2})\s*de\s*([a-záéíóúñ]+)\s*de\s*(\d{4})",
            date_str, re.IGNORECASE
        )
        if m:
            day = m.group(1).zfill(2)
            month = MONTHS_ES.get(m.group(2).lower(), "01")
            return f"{day}/{month}/{m.group(3)}"
        m = re.match(r"(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})", date_str)
        if m:
            y = m.group(3)
            if len(y) == 2:
                y = "20" + y if int(y) < 50 else "19" + y
            return f"{m.group(1).zfill(2)}/{m.group(2).zfill(2)}/{y}"
        return date_str

    # ==================== FORMATO INFIMA CUANTIA ====================

    def _extract_infima(self, oc: OrdenCompra):
        oc.orden_compra = self._extract_orden_compra_infima()
        oc.fecha_aceptacion = self._extract_fecha_infima()
        oc.nombre_comercial = self._extract_proveedor_infima()
        oc.razon_social = self._extract_razon_social_infima()
        oc.ruc = self._extract_ruc_infima()
        oc.administrador = self._extract_administrador_infima()
        oc.objeto_contratacion = self._extract_objeto_infima()
        oc.items = self._extract_items_infima()
        oc.v_total = self._extract_total_infima(oc.items)

    def _extract_orden_compra_infima(self) -> str:
        for table in self.tables:
            for row in table:
                joined = " ".join(c for c in row if c).upper()
                m = re.search(r"(IC-GADCCC-\d{4}-\d+)", joined)
                if m:
                    return m.group(1)
        patterns = [
            r"No\.?\s*DE\s*ORDEN\s*DE\s*COMPRA\s*(?:\|[^|]+\|)?\s*([A-Z]{2,5}-[A-Z0-9]+-\d{4}-\d+)",
            r"(IC-[A-Z0-9]+-\d{4}-\d+)",
            r"(?:ORDEN\s*(?:DE\s*)?(?:COMPRA)?\s*[:#]?\s*|OC\s*[:#]?\s*)([\w\-/]{5,})",
        ]
        for p in patterns:
            m = re.search(p, self.text, re.IGNORECASE)
            if m:
                val = m.group(1).strip()
                if "DE ORDEN DE COMPRA" not in val.upper():
                    return val
        return ""

    def _extract_fecha_infima(self) -> str:
        m = re.search(r"FECHA:\s*(.+?)(?:\n|$)", self.text, re.IGNORECASE)
        if m:
            try:
                return self._normalize_date(m.group(1).strip().rstrip("."))
            except Exception:
                pass
        m = re.search(r"(\d{1,2})\s*de\s*([a-záéíóúñ]+)\s*de\s*(\d{4})", self.text, re.IGNORECASE)
        if m:
            return f"{m.group(1).zfill(2)}/{MONTHS_ES.get(m.group(2).lower(), '01')}/{m.group(3)}"
        m = re.search(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b", self.text)
        if m:
            return self._normalize_date(m.group(1))
        return ""

    def _extract_proveedor_infima(self) -> str:
        for table in self.tables:
            for row in table:
                for cell in row:
                    if cell and "PROVEEDOR:" in cell:
                        val = cell.split("PROVEEDOR:")[1].strip()
                        parts = re.split(r"\nPROFORMA|\nRUC", val)
                        if parts:
                            val = parts[0].strip().replace("\n", " ")
                            val = re.sub(r"\s+", " ", val)
                            if val and "RUC" not in val.upper() and "PROFORMA" not in val.upper():
                                return val
        idx = self.text.find("PROVEEDOR:")
        if idx >= 0:
            after = self.text[idx + len("PROVEEDOR:"):]
            end_idx = after.find("RUC:")
            if end_idx < 0:
                end_idx = after.find("\n\n")
            block = after[:end_idx].strip() if end_idx > 0 else after.strip()
            cleaned = re.sub(
                r"(?:PROFORMA|FECHA|CONTACTO|VIGENCIA|TELÉFONO|DIRECCIÓN|CORREO|PLAZO|NIC)[^A-ZÁÉÍÓÚÑ\n]*",
                "", block, flags=re.IGNORECASE
            )
            cleaned = re.sub(r"\s+", " ", cleaned).strip()
            if cleaned and len(cleaned) > 3 and len(cleaned) < 200:
                return cleaned
        return ""

    def _extract_razon_social_infima(self) -> str:
        for table in self.tables:
            for row in table:
                for cell in row:
                    if cell and "RAZÓN SOCIAL:" in cell.upper():
                        val = re.split(r"RAZ[ÓO]N\s*SOCIAL:", cell, flags=re.IGNORECASE)[1].strip()
                        val = val.split("\n")[0].strip()
                        if val and len(val) > 3:
                            return val
        m = re.search(r"RAZ[ÓO]N\s*SOCIAL:\s*(.+?)(?:\n\n|\n[A-Z]{3,}|$)", self.text, re.IGNORECASE)
        if m:
            val = m.group(1).strip().replace("\n", " ")
            val = re.sub(r"\s+", " ", val)
            if val and len(val) > 3:
                return val
        return ""

    def _extract_ruc_infima(self) -> str:
        m = re.search(r"RUC:\s*(\d{10,20})", self.text, re.IGNORECASE)
        if m:
            return m.group(1)
        m = re.search(r"RUC\s*[:#]?\s*(\d{6,20})", self.text, re.IGNORECASE)
        if m:
            return m.group(1)
        m = re.search(r"\b(\d{13})\b", self.text)
        if m:
            return m.group(1)
        for table in self.tables:
            for row in table:
                for cell in row:
                    rm = re.search(r"RUC:\s*(\d{10,20})", cell or "")
                    if rm:
                        return rm.group(1)
        return ""

    def _extract_administrador_infima(self) -> str:
        title = (
            r"(?:Ing\.|Arq\.|Arqa\.|Lic\.|Lcda\.|Lcdo\.|Abg\.|"
            r"Blga\.|Blg\.|Tnlgo\.|Tnlg\.|Tnlga\.|Dr\.|Dra\.|"
            r"Psic[óo]logo\.|Psic\.|Econ\.|Mgs\.|Msc\.|Mgtr\.|Mtr\.)"
        )
        for table in self.tables:
            for row in table:
                for cell in row:
                    if cell:
                        m = re.search(
                            r"ADMINISTRADOR(?:A)?:\s*(" + title + r"\s*[A-ZÁÉÍÓÚÑ][a-záéíóúñ]*(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]*)+)",
                            cell, re.IGNORECASE
                        )
                        if m:
                            return re.split(r"\s*(?:FISCALIZADOR|N[UÚ]MERO|PARTIDA|OBJETO)", m.group(1).strip())[0].strip()
        patterns = [
            r"ADMINISTRADOR(?:A)?:\s*(" + title + r"\s*[A-ZÁÉÍÓÚÑ][a-záéíóúñ]*(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]*)+)",
            r"designa\s+como\s+administrador\s+(?:al|a\s+la)\s+(" + title + r"\s*[A-ZÁÉÍÓÚÑ][a-záéíóúñ]*(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]*)+)",
            r"La\s+administraci[óo]n\s+de\s+la\s+orden\s+de\s+compra[,\s]*est[áa]r[aá]\s+a\s+cargo\s+(?:del|de\s+la)\s+(" + title + r"\s*[A-ZÁÉÍÓÚÑ][a-záéíóúñ]*(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]*)+)",
            r"ADMINISTRADOR\s+DE\s+LA\s+ORDEN\s+DE\s+COMPRA\s*\n\s*(" + title + r"\s*[A-ZÁÉÍÓÚÑ][a-záéíóúñ]*(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]*)+)",
        ]
        for p in patterns:
            m = re.search(p, self.text, re.IGNORECASE | re.MULTILINE)
            if m:
                return re.split(r"\s*(?:FISCALIZADOR|N[UÚ]MERO|PARTIDA|OBJETO)", m.group(1).strip())[0].strip()
        return ""

    def _extract_objeto_infima(self) -> str:
        patterns = [
            r'OBJETO\s*DE\s*CONTRATACI[OÓ]N\s*[:#]?\s*["""\u201c\u201d]*(.+?)["""\u201c\u201d]*(?:\n[A-Z\s]{2,}|\Z)',
            r"OBJETO\s*DE\s*CONTRATACI[OÓ]N\s*[:#]?\s*(.+)$",
        ]
        for p in patterns:
            m = re.search(p, self.text, re.IGNORECASE | re.DOTALL | re.MULTILINE)
            if m:
                r = m.group(1).strip().strip('"').strip("\u201c\u201d")
                if len(r) > 10:
                    return r[:300]
        return ""

    def _extract_items_infima(self) -> List[ItemOC]:
        items = []
        if self.tables:
            for table in self.tables:
                parsed = self._parse_item_table_infima(table)
                if parsed:
                    items.extend(parsed)
        if not items:
            items = self._parse_items_from_text_infima()
        return items

    def _parse_item_table_infima(self, table: List[List[str]]) -> List[ItemOC]:
        if not table or len(table) < 3:
            return []
        CPC_RE = re.compile(r"^\d{6,}$")
        ncols = max(len(r) for r in table)
        if ncols == 0:
            return []

        cpc_col = desc_col = qty_col = price_col = unit_col = None
        header_row_idx = None

        header_kw = {
            "cpc": ["CPC", "CODIGO", "CÓDIGO"],
            "desc": ["DESCRIPCION", "DESCRIPCIÓN", "DETALLE", "RUBRO", "CONCEPTO"],
            "qty": ["CANT.", "CANTIDAD", "CANT"],
            "price": ["V. UNITARIO", "V.UNIT", "V.UNITARIO", "PRECIO", "VALOR UNITARIO", "UNITARIO"],
        }

        for idx, row in enumerate(table):
            row_text = " ".join(str(c or "").strip() for c in row).upper()
            found = set()
            for cat in ["cpc", "desc", "qty", "price"]:
                for kw in header_kw[cat]:
                    if kw in row_text:
                        found.add(cat)
                        break
            if len(found) >= 3:
                header_row_idx = idx
                break

        if header_row_idx is not None:
            hdr = table[header_row_idx]
            for i in range(min(len(hdr), ncols)):
                cell = str(hdr[i] or "").strip().upper()
                cell_norm = (
                    cell.replace(".", "").replace(",", "")
                    .replace("Ó", "O").replace("Í", "I")
                    .replace("É", "E").replace("Á", "A")
                )
                if "CPC" in cell_norm and cell_norm not in ("NRO", "ITEM", "#"):
                    cpc_col = i
                if any(kw in cell_norm for kw in ["DESCRIPCION", "DESCRIP", "DETALLE", "RUBRO", "CONCEPTO"]):
                    desc_col = i
                if any(kw in cell_norm for kw in ["CANTIDAD", "CANT"]):
                    qty_col = i
                if any(kw in cell_norm for kw in ["UNITARIO", "PRECIO", "VUNIT"]):
                    price_col = i

        col_stats = {}
        for i in range(ncols):
            col_stats[i] = {"nums": [], "cpc_count": 0, "texts": []}
        for row in table:
            for i in range(min(len(row), ncols)):
                val = str(row[i] or "").strip()
                if not val:
                    continue
                if CPC_RE.match(val):
                    col_stats[i]["cpc_count"] += 1
                num = self._parse_number(val)
                if num > 0:
                    col_stats[i]["nums"].append(num)
                if len(val) > 5:
                    col_stats[i]["texts"].append(val)

        if cpc_col is None:
            best = 0
            for i, st in col_stats.items():
                if st["cpc_count"] > best:
                    best = st["cpc_count"]
                    cpc_col = i
            if best == 0:
                cpc_col = None
        if cpc_col is None:
            return []

        data_row_count = sum(1 for r in table if r and str(r[0] or "").strip().isdigit())
        min_thresh = min(3, max(1, data_row_count))

        if desc_col is None:
            for i in range(cpc_col + 1, ncols):
                if len(col_stats[i]["texts"]) >= min_thresh:
                    desc_col = i
                    break
        if desc_col is None:
            return []

        if qty_col is None:
            for i in range(desc_col + 1, ncols):
                small = [n for n in col_stats[i]["nums"] if 0 < n < 100000]
                if len(small) >= min_thresh:
                    qty_col = i
                    break
            if qty_col is None:
                for i in range(ncols - 1, desc_col, -1):
                    small = [n for n in col_stats[i]["nums"] if 0 < n < 100000]
                    if len(small) >= min_thresh:
                        qty_col = i
                        break

        if price_col is None and qty_col is not None:
            for i in range(qty_col + 1, ncols):
                if len([n for n in col_stats[i]["nums"] if n >= 0.01]) >= min_thresh:
                    price_col = i
                    break
            if price_col is None:
                for i in range(ncols - 1, qty_col, -1):
                    if len([n for n in col_stats[i]["nums"] if n >= 0.01]) >= min_thresh:
                        price_col = i
                        break

        if qty_col and price_col:
            data_rows = [r for r in table if len(r) > max(qty_col, price_col, desc_col, cpc_col) and str(r[0] or "").strip().isdigit()]
            if len(data_rows) >= 2:
                qty_vals = [self._parse_number(str(r[qty_col] or "")) for r in data_rows[:5] if qty_col < len(r)]
                price_vals = [self._parse_number(str(r[price_col] or "")) for r in data_rows[:5] if price_col < len(r)]
                valid = [(q, p) for q, p in zip(qty_vals, price_vals) if q > 0 and p > 0]
                if len(valid) >= 2:
                    large_qty = sum(1 for q, _ in valid if q > 100)
                    small_price = sum(1 for _, p in valid if p < 100)
                    if large_qty >= min_thresh and small_price >= min_thresh:
                        qty_col, price_col = price_col, qty_col

        items = []
        for row in table:
            first_val = str(row[0] or "").strip()
            if not first_val:
                continue
            if first_val.upper() in ("SUBTOTAL", "TOTAL", "NOTAS:", "NRO.", "NRO", "ITEM", "SUB TOTAL"):
                continue
            if not first_val.isdigit():
                continue
            cpc_val = str(row[cpc_col] or "").strip() if cpc_col < len(row) else ""
            if cpc_val and not CPC_RE.match(cpc_val):
                continue
            desc_val = str(row[desc_col] or "").strip() if desc_col < len(row) else ""
            if not desc_val or len(desc_val) < 5:
                continue
            qty = self._parse_number(str(row[qty_col] or "")) if qty_col is not None and qty_col < len(row) else 1.0
            price = self._parse_number(str(row[price_col] or "")) if price_col is not None and price_col < len(row) else 0.0
            if qty == 0:
                qty = 1.0
            items.append(ItemOC(
                cpc=cpc_val,
                descripcion=desc_val,
                cantidad=qty,
                v_unitario=price,
                subtotal=round(qty * price, 2),
            ))
        return items

    def _parse_items_from_text_infima(self) -> List[ItemOC]:
        items = []
        lines = self.text.split("\n")
        in_items = False
        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue
            if re.search(r"(?:item|ítem|cantidad|código\s*cpc|descripcion|rubro)", stripped, re.IGNORECASE):
                in_items = True
                continue
            if in_items and re.search(r"(?:subtotal|total\s*general|observacion|nota|forma\s*de\s*pago|plazo|garant)", stripped, re.IGNORECASE):
                break
            if not in_items:
                continue
            parts = re.split(r"\s{2,}|\t", stripped)
            parts = [p.strip() for p in parts if p.strip()]
            if len(parts) >= 3:
                qty = self._parse_number(parts[0])
                desc = parts[1]
                precio = self._parse_number(parts[-1])
                if qty > 0 and len(desc) > 3:
                    items.append(ItemOC(cpc="", descripcion=desc, cantidad=qty, v_unitario=precio, subtotal=round(qty * precio, 2)))
        return items

    def _extract_total_infima(self, items: List[ItemOC]) -> float:
        total = sum(it.subtotal for it in items)
        if total > 0:
            return round(total, 2)
        m = re.search(r"SUBTOTAL[^0-9]*(\d[\d,.]*\d)", self.text, re.IGNORECASE)
        if m:
            return self._parse_number(m.group(1))
        for p in [r"(?:TOTAL|MONTO\s*TOTAL|IMPORTE\s*TOTAL)\s*[:#]?\s*[\s$]*(\d[\d,.]*\d)", r"SUBTOTAL\s+(?:\w+\s+){0,5}(\d[\d,.]*\d)"]:
            m = re.search(p, self.text, re.IGNORECASE)
            if m:
                return self._parse_number(m.group(1))
        for row in self.text.split("\n"):
            if "subtotal" in row.lower():
                nums = re.findall(r"(\d[\d,.]*\d)", row)
                if nums:
                    return self._parse_number(nums[-1])
        return 0.0

    # ==================== FORMATO CATALOGO ELECTRONICO ====================

    def _extract_ce(self, oc: OrdenCompra):
        oc.orden_compra = self._extract_orden_compra_ce()
        oc.fecha_aceptacion = self._extract_fecha_aceptacion_ce()
        oc.nombre_comercial = self._extract_nombre_comercial_ce()
        oc.razon_social = self._extract_razon_social_ce()
        oc.ruc = self._extract_ruc_ce()
        oc.administrador = self._extract_administrador_ce()
        oc.objeto_contratacion = ""
        oc.items = self._extract_items_ce()
        oc.v_total = self._extract_total_ce()

    def _extract_cell_value(self, cell: str) -> Optional[str]:
        lines = [l.strip() for l in cell.split("\n") if l.strip()]
        if len(lines) == 3 and lines[0].endswith(":") == False and lines[2].endswith(":"):
            return lines[1]
        if len(lines) == 3 and lines[0].endswith(":") == False and lines[2].endswith(":") == False:
            return lines[1]
        return None

    def _extract_orden_compra_ce(self) -> str:
        for table in self.tables:
            for row in table:
                for cell in row:
                    if cell and "Orden de" in cell and "compra:" in cell:
                        val = self._extract_cell_value(cell)
                        if val:
                            return val
        m = re.search(r"CE-\d{14}", self.text)
        return m.group(0) if m else ""

    def _extract_fecha_aceptacion_ce(self) -> str:
        for table in self.tables:
            for row in table:
                for cell in row:
                    if cell and "Fecha de" in cell and "aceptación" in cell:
                        val = self._extract_cell_value(cell)
                        if val:
                            return self._normalize_date(val)
        return ""

    def _extract_nombre_comercial_ce(self) -> str:
        for table in self.tables:
            for row in table:
                for cell in row:
                    if cell and "Nombre" in cell and "comercial:" in cell:
                        lines = [l.strip() for l in cell.split("\n") if l.strip()]
                        if len(lines) >= 3:
                            return lines[1]
                        after = re.split(r"Nombre\s*\n*\s*comercial:", cell, flags=re.IGNORECASE)
                        if len(after) > 1:
                            name = after[1].strip().split("\n")[0].strip()
                            if name:
                                return name
        return ""

    def _extract_razon_social_ce(self) -> str:
        for table in self.tables:
            for row in table:
                for cell in row:
                    if cell and "social:" in cell:
                        after = cell.split("social:")[-1].strip()
                        lines = [l.strip() for l in after.split("\n") if l.strip()]
                        name_parts = []
                        for line in lines:
                            if line.endswith(":") or line in ("RUC", "TELÉFONO", "DIRECCIÓN", "CORREO", "CONTACTO"):
                                break
                            name_parts.append(line)
                        name = " ".join(name_parts).strip()
                        if name:
                            return name
                        before = cell.split("social:")[0].strip()
                        lines_before = [l.strip() for l in before.split("\n") if l.strip()]
                        label_parts = {"Razón", "social:", "COMERCIO", "COMPAÑIA", "GENERAL", "DE"}
                        before_parts = [l for l in lines_before if l not in label_parts and not l.endswith(":")]
                        if before_parts:
                            name = " ".join(before_parts).strip()
                            if name:
                                return name
        return ""

    def _extract_ruc_ce(self) -> str:
        m = re.search(r"RUC:\s*(\d{10,20})", self.text, re.IGNORECASE)
        if m:
            return m.group(1)
        for table in self.tables:
            for row in table:
                for cell in row:
                    m = re.search(r"RUC:\s*(\d{10,20})", cell or "")
                    if m:
                        return m.group(1)
        return ""

    def _extract_administrador_ce(self) -> str:
        title_pattern = r"(?:Ing\.|Arq\.|Arqa\.|Lic\.|Lcda\.|Lcdo\.|Abg\.|Tnlgo\.|Tnlg\.|Tnlga\.|Dr\.|Dra\.|Econ\.|Mgs\.|Msc\.|Mgtr\.|Mtr\.)"
        name_pattern = r"([A-ZÁÉÍÓÚÑ][a-záéíóúñ]*(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]*)+)"

        # Pattern 1: "Administrador(a) de (ordenes de compra|contrato) [Title]. [Name]"
        # Matches "Administradora de contrato Ing. Valeria Narváez" across lines
        pat_admin_first = (
            rf"administrador(?:a)?\s+de\s+(?:las\s+)?(?:ordenes?\s+de\s+compra|contrato)\s+"
            rf"{title_pattern}\s*{name_pattern}"
        )

        # Pattern 2: "[Title]. [Name], ... como administrador(a) de (ordenes de compra|contrato)"
        # Limited scope: only within same 3-line window to avoid false matches
        pat_name_first = (
            rf"{title_pattern}\s*{name_pattern}[^.]*?"
            rf"administrador(?:a)?\s+de\s+(?:las\s+)?(?:ordenes?\s+de\s+compra|contrato)"
        )

        def _clean(name: str) -> str:
            return ' '.join(name.strip().split())

        # Search in tables first
        for table in self.tables:
            for row in table:
                for cell in row:
                    if not cell:
                        continue
                    m = re.search(pat_admin_first, cell, re.IGNORECASE)
                    if m:
                        return _clean(m.group(1))
                    m = re.search(pat_name_first, cell, re.IGNORECASE)
                    if m:
                        return _clean(m.group(1))

        # Search in full text (with DOTALL for multi-line names)
        m = re.search(pat_admin_first, self.text, re.IGNORECASE | re.DOTALL)
        if m:
            return _clean(m.group(1))

        m = re.search(pat_name_first, self.text, re.IGNORECASE | re.DOTALL)
        if m:
            return _clean(m.group(1))

        return ""

    def _extract_items_ce(self) -> List[ItemOC]:
        items = []
        for table in self.tables:
            parsed = self._parse_item_table_ce(table)
            if parsed:
                items.extend(parsed)
        return items

    def _parse_item_table_ce(self, table: List[List[str]]) -> List[ItemOC]:
        if not table or len(table) < 3:
            return []
        CPC_RE = re.compile(r"^\d{8,}$")
        ncols = max(len(r) for r in table)
        if ncols == 0:
            return []

        header_row_idx = None
        for idx, row in enumerate(table):
            row_text = " ".join(str(c or "").strip() for c in row).upper()
            if "CPC" in row_text and "DESCRIPCIÓN" in row_text.upper():
                header_row_idx = idx
                break

        if header_row_idx is None:
            return []

        hdr = table[header_row_idx]
        cpc_col = desc_col = qty_col = price_col = pp_col = None
        for i in range(min(len(hdr), ncols)):
            cell = str(hdr[i] or "").strip().upper()
            if cell == "CPC":
                cpc_col = i
            elif cell == "DESCRIPCIÓN" or "DESCRIPCION" in cell:
                desc_col = i
            elif cell == "CANT":
                qty_col = i
            elif "V.\nUNITARIO" in cell or cell == "V. UNITARIO":
                price_col = i
            elif cell == "V.\nunitario":
                price_col = i
            elif "PARTIDA" in cell and ("PRESUP" in cell or "PRESUP." in cell):
                pp_col = i

        if cpc_col is None or desc_col is None:
            return []

        if qty_col is None:
            for i in range(desc_col + 1, ncols):
                cell = str(hdr[i] or "").strip().upper()
                if cell in ("CANT", "CANT.", "CANTIDAD"):
                    qty_col = i
                    break
        if price_col is None:
            for i in range(ncols - 1, desc_col, -1):
                cell = str(hdr[i] or "").strip().upper()
                if "UNITARIO" in cell or "UNIT" in cell:
                    price_col = i
                    break

        items = []
        for row in table[header_row_idx + 1:]:
            if len(row) <= max(cpc_col, desc_col, (qty_col or 0), (price_col or 0)):
                continue
            first = str(row[0] or "").strip()
            if not first:
                continue
            if first.upper() in ("SUBTOTAL", "TOTAL", "DETALLE"):
                continue
            cpc_val = str(row[cpc_col] or "").strip() if cpc_col < len(row) else ""
            if not CPC_RE.match(cpc_val):
                continue
            desc_val = str(row[desc_col] or "").strip().split("\n")[0].strip() if desc_col < len(row) else ""
            if not desc_val or len(desc_val) < 5:
                continue
            qty_str = str(row[qty_col] or "").strip() if qty_col is not None and qty_col < len(row) else "0"
            qty = self._parse_number_ce(qty_str)
            price_str = str(row[price_col] or "").strip() if price_col is not None and price_col < len(row) else "0"
            price = self._parse_number_ce(price_str)
            if qty == 0:
                qty = 1.0
            pp_val = str(row[pp_col] or "").strip() if pp_col is not None and pp_col < len(row) else ""
            pp_val = pp_val.replace("\n", " ").strip()
            items.append(ItemOC(
                cpc=cpc_val,
                descripcion=desc_val,
                cantidad=qty,
                v_unitario=price,
                subtotal=round(qty * price, 2),
                partida_presupuestaria=pp_val,
            ))
        return items

    def _extract_total_ce(self) -> float:
        m = re.search(r"Total\s+de\s+la\s+Orden\s+([\d,.]+)", self.text, re.IGNORECASE)
        if m:
            return self._parse_number_ce(m.group(1))
        m = re.search(r"Total\s+([\d,.]+)", self.text)
        if m:
            total = self._parse_number_ce(m.group(1))
            if total > 0:
                return total
        return 0.0

    def _parse_number_ce(self, value: str) -> float:
        value = value.strip()
        if not value:
            return 0.0
        cleaned = re.sub(r"[^\d,.]", "", value)
        if "," in cleaned and "." in cleaned:
            if cleaned.rindex(",") > cleaned.rindex("."):
                cleaned = cleaned.replace(".", "").replace(",", ".")
            else:
                cleaned = cleaned.replace(",", "")
        elif "," in cleaned:
            cleaned = cleaned.replace(",", ".")
        try:
            return float(cleaned)
        except ValueError:
            return 0.0

    # ==================== PARSEO GENERICO DE NUMEROS ====================

    def _parse_number(self, value: Optional[str]) -> float:
        if not value or not value.strip():
            return 0.0
        if re.search(r"[A-Za-z\u00C0-\u024F]", value.strip()):
            if re.search(r"\d", value.strip()):
                cleaned = re.sub(r"[^\d.,]", "", value.strip())
                if not cleaned:
                    return 0.0
                return self._parse_cleaned_number(cleaned)
            return 0.0
        cleaned = re.sub(r"[^\d.,]", "", value.strip())
        if not cleaned:
            return 0.0
        return self._parse_cleaned_number(cleaned)

    def _parse_cleaned_number(self, cleaned: str) -> float:
        if "," in cleaned and "." in cleaned:
            if cleaned.rindex(",") > cleaned.rindex("."):
                cleaned = cleaned.replace(".", "").replace(",", ".")
            else:
                cleaned = cleaned.replace(",", "")
        elif "," in cleaned:
            cleaned = cleaned.replace(",", ".")
        try:
            return float(cleaned)
        except ValueError:
            return 0.0
