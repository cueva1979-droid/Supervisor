import sys; sys.path.insert(0, '.')
from parser import DocumentParser
import os
base = r'C:\Users\Analista\Desktop\aplicaciones\PROVEEDORES\Supervisor\backend\uploads'

# Test PDF
p = DocumentParser(os.path.join(base, '0001-ORDEN DE COMPRA-COMBUSTIBLE-.pdf'), '0001.pdf')
d = p.get_all_data()
print("=== PDF ===")
print(f"Proveedor: {d['proveedor']}")
print(f"RUC: {d['ruc']}")
print(f"Codigo: {d['codigo_proceso']}")
print(f"Orden: {d['numero_orden']}")
print(f"Fecha: {d['fecha']}")
print(f"Objeto: {str(d['objeto_contratacion'])[:80]}")
print(f"Monto: {d['monto_total']}")
print(f"Items: {len(d['items'])}")
for i, it in enumerate(d['items']):
    print(f"  [{i}] CPC:{it['codigo_cpc']} | {it['descripcion'][:40]} | Cant:{it['cantidad']} | PU:{it['precio_unitario']} | Sub:{it.get('subtotal',0)}")

# Test DOCX
p2 = DocumentParser(os.path.join(base, '0001-ORDEN DE COMPRA-COMBUSTIBLE-.docx'), '0001.docx')
d2 = p2.get_all_data()
print("\n=== DOCX ===")
print(f"Proveedor: {d2['proveedor']}")
print(f"RUC: {d2['ruc']}")
print(f"Codigo: {d2['codigo_proceso']}")
print(f"Orden: {d2['numero_orden']}")
print(f"Fecha: {d2['fecha']}")
print(f"Objeto: {str(d2['objeto_contratacion'])[:80]}")
print(f"Monto: {d2['monto_total']}")
print(f"Items: {len(d2['items'])}")
for i, it in enumerate(d2['items']):
    print(f"  [{i}] CPC:{it['codigo_cpc']} | {it['descripcion'][:40]} | Cant:{it['cantidad']} | PU:{it['precio_unitario']} | Sub:{it.get('subtotal',0)}")
