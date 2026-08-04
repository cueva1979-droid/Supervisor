import datetime
import uuid
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base

class Provider(Base):
    __tablename__ = "providers"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre = Column(String(255), index=True)
    ruc = Column(String(20), index=True)
    codigo_proceso = Column(String(100), nullable=True)
    telefono = Column(String(50), nullable=True)
    observaciones = Column(Text, nullable=True)
    fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow)
    records = relationship("Record", back_populates="provider", cascade="all, delete-orphan")

class Record(Base):
    __tablename__ = "records"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    filename = Column(String(255))
    file_type = Column(String(10))
    proveedor = Column(String(255), index=True, nullable=True)
    ruc = Column(String(20), nullable=True)
    codigo_proceso = Column(String(100), nullable=True)
    numero_orden = Column(String(100), nullable=True)
    fecha = Column(String(50), nullable=True)
    objeto_contratacion = Column(Text, nullable=True)
    administrador = Column(String(255), nullable=True)
    plazo_entrega = Column(String(100), nullable=True)
    monto_total = Column(Float, default=0.0)
    moneda = Column(String(10), default="PYG")
    estado = Column(String(50), default="completado")
    observaciones = Column(Text, nullable=True)
    fecha_procesamiento = Column(DateTime, default=datetime.datetime.utcnow)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=True)
    provider = relationship("Provider", back_populates="records")
    items = relationship("Item", back_populates="record", cascade="all, delete-orphan")

class Item(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    record_id = Column(Integer, ForeignKey("records.id"))
    codigo_cpc = Column(String(50), nullable=True)
    descripcion = Column(Text, nullable=True)
    cantidad = Column(Float, default=1.0)
    unidad = Column(String(50), nullable=True)
    precio_unitario = Column(Float, default=0.0)
    subtotal = Column(Float, default=0.0)
    requires_review = Column(Boolean, default=False)
    record = relationship("Record", back_populates="items")

# ==================== PAC Module Models ====================

class PACDocument(Base):
    __tablename__ = "pac_documents"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String(255), nullable=False)
    upload_date = Column(String(50), default=lambda: datetime.datetime.utcnow().isoformat())
    partida_presupuestaria = Column(String(255), nullable=True)
    cpc = Column(String(100), nullable=True)
    tipo_compra = Column(String(100), nullable=True)
    tipo_regimen = Column(String(100), nullable=True)
    procedimiento = Column(String(255), nullable=True)
    descripcion = Column(Text, nullable=True)
    costo_unitario = Column(Float, nullable=True)
    periodo = Column(String(50), nullable=True)
    pdf_data = Column(Text, nullable=True)

class PACCertificate(Base):
    __tablename__ = "pac_certificates"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), nullable=True)
    certificate_type = Column(String(50), nullable=False)
    cert_nro = Column(String(100), nullable=True, unique=True)
    data = Column(Text, nullable=True)
    created_date = Column(String(50), default=lambda: datetime.datetime.utcnow().isoformat())

class CPCCatalog(Base):
    __tablename__ = "cpc_catalog"
    cpc = Column(String(50), primary_key=True)
    descripcion = Column(Text, nullable=True)
    umbral = Column(Float, nullable=True)
    created_at = Column(String(50), default=lambda: datetime.datetime.utcnow().isoformat())

# ==================== Catálogo Electrónico Models ====================

class CEExtractionDB(Base):
    __tablename__ = "ce_extractions"
    __table_args__ = (UniqueConstraint("orden_compra", name="uq_ce_orden_compra"),)
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    orden_compra = Column(String(100), nullable=True)
    fecha_aceptacion = Column(String(50), nullable=True)
    nombre_comercial = Column(String(255), nullable=True)
    razon_social = Column(String(255), nullable=True)
    ruc = Column(String(20), nullable=True)
    administrador = Column(String(255), nullable=True)
    objeto_contratacion = Column(Text, nullable=True)
    v_total = Column(Float, default=0.0)
    estado = Column(String(50), default="En Ejecucion")
    filename = Column(String(255), nullable=True)
    fecha_procesamiento = Column(String(50), default=lambda: datetime.datetime.utcnow().isoformat())
    items = relationship("CEItemDB", back_populates="extraction", cascade="all, delete-orphan")

class CEItemDB(Base):
    __tablename__ = "ce_items"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    extraction_id = Column(String(36), ForeignKey("ce_extractions.id"))
    cpc = Column(String(50), nullable=True)
    descripcion = Column(Text, nullable=True)
    cantidad = Column(Float, default=0.0)
    unidad = Column(String(50), nullable=True)
    v_unitario = Column(Float, default=0.0)
    subtotal = Column(Float, default=0.0)
    partida_presupuestaria = Column(String(255), nullable=True)
    extraction = relationship("CEExtractionDB", back_populates="items")

class CPCLoadedData(Base):
    __tablename__ = "cpc_loaded_data"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    cpc = Column(String(50), nullable=False)
    descripcion = Column(Text, nullable=True)
    umbral = Column(Float, nullable=True)
    created_at = Column(String(50), default=lambda: datetime.datetime.utcnow().isoformat())

# ==================== CAM (Cambio de Administrador) Model ====================

class CAMExtraction(Base):
    __tablename__ = "cam_extractions"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String(255), nullable=True)
    codigo_proceso = Column(String(100), nullable=True)
    administrador_contrato_actual = Column(String(255), nullable=True)
    objeto_proceso = Column(Text, nullable=True)
    estado_proceso = Column(String(100), nullable=True)
    fecha_publicacion = Column(String(20), nullable=True)
    raw_data = Column(Text, nullable=True)
    fecha_procesamiento = Column(String(50), default=lambda: datetime.datetime.utcnow().isoformat())

# ==================== Security Models ====================

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="operator", nullable=False)
    is_active = Column(Boolean, default=True)
    is_locked = Column(Boolean, default=False)
    locked_until = Column(DateTime, nullable=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    username = Column(String(100), nullable=True)
    action = Column(String(100), nullable=False)
    resource = Column(String(100), nullable=False)
    resource_id = Column(String(100), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    user = relationship("User", back_populates="audit_logs")


class LoginAttempt(Base):
    __tablename__ = "login_attempts"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(100), nullable=False)
    ip_address = Column(String(50), nullable=False)
    success = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
