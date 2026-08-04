import requests, json

r = requests.get('http://127.0.0.1:8000/ce/extractions')
data = r.json()
if not data:
    print('No extractions found')
    exit()

ext = data[0]
eid = ext['id']
print(f'ID: {eid}')
print(f'Antes: nombre_comercial={ext["nombre_comercial"]}, razon_social={ext["razon_social"]}')

r2 = requests.put(f'http://127.0.0.1:8000/ce/extractions/{eid}', json={'nombre_comercial': 'Test Edit', 'razon_social': 'Test Razon'})
print(f'Status: {r2.status_code}')
if r2.ok:
    print(r2.json())
else:
    print(r2.text)

r3 = requests.get(f'http://127.0.0.1:8000/ce/extractions/{eid}')
print(f'Despues: nombre_comercial={r3.json()["nombre_comercial"]}, razon_social={r3.json()["razon_social"]}')

# Restore original
requests.put(f'http://127.0.0.1:8000/ce/extractions/{eid}', json={'nombre_comercial': ext['nombre_comercial'], 'razon_social': ext['razon_social']})
