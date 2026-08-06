# SupervisorPRO

Aplicación full-stack para extracción inteligente de datos desde documentos PDF y Word (órdenes de compra), con gestión de proveedores, historial y exportación a Excel.

## Arquitectura

```
Supervisor/
├── backend/
│   ├── main.py              # API FastAPI
│   ├── database.py          # Configuración SQLite + SQLAlchemy
│   ├── models.py            # Modelos ORM (Provider, Record, Item)
│   ├── schemas.py           # Esquemas Pydantic
│   ├── parser.py            # Motor de extracción (PDF/DOCX)
│   └── services/
│       ├── extraction_service.py  # Procesamiento documentos
│       ├── excel_service.py       # Exportación Excel
│       └── provider_service.py    # CRUD proveedores
├── frontend/
│   └── src/
│       ├── pages/           # Componentes de página
│       ├── services/        # API client
│       ├── hooks/           # Hooks personalizados
│       ├── types/           # TypeScript interfaces
│       └── styles/          # CSS global
└── dist/                    # Build output
```

## Requisitos

### Backend
- Python 3.12+
- pip (gestor de paquetes)

### Frontend
- Node.js 18+
- npm 9+

## Instalación

### 1. Backend

```bash
cd Supervisor/backend
pip install -r requirements.txt
```

### 2. Frontend

```bash
cd Supervisor/frontend
npm install
```

### 3. Build Frontend

```bash
cd Supervisor/frontend
npm run build
```

## Ejecución

### Modo Desarrollo

**Backend:**
```bash
cd Supervisor/backend
python main.py
```
API disponible en http://127.0.0.1:8000

**Frontend:**
```bash
cd Supervisor/frontend
npm run dev
```
App disponible en http://127.0.0.1:3000

### Modo Producción

```bash
cd Supervisor
python run.py
```

## Empaquetado Windows (.exe)

### Requisitos
- PyInstaller: `pip install pyinstaller`

### Build
```bash
cd Supervisor
pyinstaller SupervisorPRO.spec
```

El ejecutable se genera en `dist/SupervisorPRO.exe`.

### Funcionamiento del ejecutable
- Inicia el backend automáticamente
- Abre el navegador en la URL local
- Guarda DB y archivos en la carpeta del .exe

## API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/upload` | Subir documentos (PDF/DOCX) |
| GET | `/records` | Listar registros |
| GET | `/records/{id}` | Detalle de registro |
| PUT | `/records/{id}` | Actualizar registro |
| DELETE | `/records/{id}` | Eliminar registro |
| GET | `/providers` | Listar proveedores |
| POST | `/providers` | Crear proveedor |
| PUT | `/providers/{id}` | Actualizar proveedor |
| DELETE | `/providers/{id}` | Eliminar proveedor |
| GET | `/dashboard` | Datos del dashboard |
| GET | `/export/excel` | Exportar a Excel |

## Características

- ✅ Carga drag & drop (PDF, DOCX)
- ✅ Extracción inteligente con regex + heurísticas
- ✅ Tabla editable con cálculos en tiempo real
- ✅ CRUD completo de proveedores
- ✅ Historial con búsqueda y detalle
- ✅ Dashboard con estadísticas y gráficos
- ✅ Exportación Excel (4 hojas, estilos, autofiltros)
- ✅ Tema claro/oscuro
- ✅ 100% offline
- ✅ Responsive design
