import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
sys.path.insert(0, os.path.dirname(__file__))
from extractor_oc.parser import PDFExtractor

upload_dir = os.path.join(os.path.dirname(__file__), 'uploads')
found = 0
for f in sorted(os.listdir(upload_dir)):
    if not f.endswith('.pdf'):
        continue
    p = os.path.join(upload_dir, f)
    try:
        ext = PDFExtractor(p)
        oc = ext.extract()
        if 'contrato' in ext.text.lower():
            found += 1
            if found <= 10:
                admin = oc.administrador if oc.administrador else '(vacio)'
                print(f'{oc.orden_compra} -> Admin: [{admin}]')
                for line in ext.text.split('\n'):
                    if 'contrato' in line.lower():
                        print(f'  TEXT: {line.strip()[:300]}')
    except Exception as e:
        pass
print(f'\nTotal con "contrato": {found}')
