import sys
sys.path.insert(0, '.')
from parser import DocumentParser

# Test DOCX
print('=== DOCX PARSING ===')
docx = DocumentParser(r'..\0002.docx', '0002.docx')
data = docx.get_all_data()
print(f'Proveedor: {data["proveedor"]}')
print(f'RUC: {data["ruc"]}')
print(f'Codigo Proceso: {data["codigo_proceso"]}')
print(f'Numero Orden: {data["numero_orden"]}')
print(f'Fecha: {data["fecha"]}')
obj = data["objeto_contratacion"]
print(f'Objeto: {obj[:80] if obj else None}')
print(f'Monto Total: {data["monto_total"]}')
print(f'Items ({len(data["items"])}):')
for i, item in enumerate(data['items']):
    print(f'  [{i}] CPC:{item["codigo_cpc"]} | {item["descripcion"][:60]} | Cant:{item["cantidad"]} | {item["unidad"]} | P.U.:{item["precio_unitario"]} | Sub:{item["subtotal"]}')

print()
print('=== PDF PARSING ===')
pdf = DocumentParser(r'uploads\0002-ORDEN DE COMPRA-INFRAESTRUCTURA-INFANTIL.pdf', '0002.pdf')
data = pdf.get_all_data()
print(f'Proveedor: {data["proveedor"]}')
print(f'RUC: {data["ruc"]}')
print(f'Codigo Proceso: {data["codigo_proceso"]}')
print(f'Numero Orden: {data["numero_orden"]}')
print(f'Fecha: {data["fecha"]}')
obj = data["objeto_contratacion"]
print(f'Objeto: {obj[:80] if obj else None}')
print(f'Monto Total: {data["monto_total"]}')
print(f'Items ({len(data["items"])}):')
for i, item in enumerate(data['items']):
    print(f'  [{i}] CPC:{item["codigo_cpc"]} | {item["descripcion"][:60]} | Cant:{item["cantidad"]} | {item["unidad"]} | P.U.:{item["precio_unitario"]} | Sub:{item["subtotal"]}')
