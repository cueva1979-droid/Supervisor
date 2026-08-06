from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime

class ItemBase(BaseModel):
    codigo_cpc: Optional[str] = None
    descripcion: Optional[str] = None
    cantidad: float = 1.0
    unidad: Optional[str] = None
    precio_unitario: float = 0.0
    subtotal: float = 0.0
    requires_review: bool = False

class ItemCreate(ItemBase):
    pass

class ItemResponse(ItemBase):
    id: int
    record_id: int
    class Config:
        from_attributes = True

class RecordBase(BaseModel):
    filename: Optional[str] = None
    file_type: Optional[str] = None
    proveedor: Optional[str] = None
    ruc: Optional[str] = None
    codigo_proceso: Optional[str] = None
    numero_orden: Optional[str] = None
    fecha: Optional[str] = None
    objeto_contratacion: Optional[str] = None
    administrador: Optional[str] = None
    plazo_entrega: Optional[str] = None
    monto_total: float = 0.0
    moneda: str = "PYG"
    estado: str = "completado"
    observaciones: Optional[str] = None

class RecordCreate(RecordBase):
    items: List[ItemCreate] = []

class RecordUpdate(RecordBase):
    plazo_entrega: Optional[str] = None
    items: List[ItemCreate] = []

class RecordResponse(RecordBase):
    id: int
    fecha_procesamiento: Optional[datetime] = None
    provider_id: Optional[int] = None
    items: List[ItemResponse] = []
    class Config:
        from_attributes = True

class ProviderBase(BaseModel):
    nombre: str
    ruc: str
    codigo_proceso: Optional[str] = None
    telefono: Optional[str] = None
    observaciones: Optional[str] = None

class ProviderCreate(ProviderBase):
    pass

class ProviderUpdate(BaseModel):
    nombre: Optional[str] = None
    ruc: Optional[str] = None
    codigo_proceso: Optional[str] = None
    telefono: Optional[str] = None
    observaciones: Optional[str] = None

class ProviderResponse(ProviderBase):
    id: int
    fecha_creacion: Optional[datetime] = None
    contratos: int = 0
    records: List[RecordResponse] = []
    class Config:
        from_attributes = True

class DashboardResponse(BaseModel):
    total_documentos: int = 0
    total_proveedores: int = 0
    total_ordenes: int = 0
    total_montos: float = 0.0
    ultimos_registros: List[RecordResponse] = []
    ordenes_por_mes: dict = {}
    montos_por_proveedor: dict = {}

# ==================== PAC Module Schemas ====================

class PACDocumentResponse(BaseModel):
    id: str
    filename: Optional[str] = None
    upload_date: Optional[str] = None
    partida_presupuestaria: Optional[str] = None
    cpc: Optional[str] = None
    tipo_compra: Optional[str] = None
    tipo_regimen: Optional[str] = None
    procedimiento: Optional[str] = None
    descripcion: Optional[str] = None
    costo_unitario: Optional[float] = None
    periodo: Optional[str] = None
    class Config:
        from_attributes = True

class PACDocumentUpdate(BaseModel):
    partida_presupuestaria: Optional[str] = None
    cpc: Optional[str] = None
    tipo_compra: Optional[str] = None
    tipo_regimen: Optional[str] = None
    procedimiento: Optional[str] = None
    descripcion: Optional[str] = None
    costo_unitario: Optional[float] = None
    periodo: Optional[str] = None

class PACCertificateResponse(BaseModel):
    id: str
    document_id: Optional[str] = None
    certificate_type: Optional[str] = None
    cert_nro: Optional[str] = None
    data: Optional[str] = None
    created_date: Optional[str] = None
    class Config:
        from_attributes = True

class PACCertificateCreate(BaseModel):
    document_id: Optional[str] = None
    certificate_type: str = "PAC"
    cert_nro: Optional[str] = None
    data: Optional[Any] = None

class CPCCatalogResponse(BaseModel):
    cpc: str
    descripcion: Optional[str] = None
    umbral: Optional[float] = None
    created_at: Optional[str] = None
    class Config:
        from_attributes = True

class CPCCatalogCreate(BaseModel):
    cpc: str
    descripcion: Optional[str] = None
    umbral: Optional[float] = None

class CPCLoadedDataResponse(BaseModel):
    id: int
    cpc: str
    descripcion: Optional[str] = None
    umbral: Optional[float] = None
    created_at: Optional[str] = None
    class Config:
        from_attributes = True

class CPCLoadedDataCreate(BaseModel):
    cpc: str
    descripcion: Optional[str] = None
    umbral: Optional[float] = None

class PACAnalysisResponse(BaseModel):
    id: str
    filename: Optional[str] = None
    partida_presupuestaria: Optional[str] = None
    cpc: Optional[str] = None
    descripcion: Optional[str] = None
    costo_unitario: Optional[float] = None
    periodo: Optional[str] = None
    periodCategory: Optional[str] = None
    status: str = "unknown"

# ==================== Auth Schemas ====================

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    csrf_token: Optional[str] = None
    token_type: str = "bearer"
    user: dict

class RefreshRequest(BaseModel):
    refresh_token: str

class UserCreate(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    role: str = "operator"

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    role: str
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    username: Optional[str] = None
    action: str
    resource: str
    resource_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: Optional[datetime] = None
    class Config:
        from_attributes = True

class CAMExtractionResponse(BaseModel):
    id: str
    filename: str
    codigo_proceso: Optional[str] = None
    administrador_contrato_actual: Optional[str] = None
    objeto_proceso: Optional[str] = None
    estado_proceso: Optional[str] = None
    fecha_publicacion: Optional[str] = None
    fecha_procesamiento: str = ""
    class Config:
        from_attributes = True

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
