from typing import List, Optional
from sqlalchemy.orm import Session
from models import Provider, Record
from schemas import ProviderCreate, ProviderUpdate

def get_providers(db: Session, search: Optional[str] = None) -> List[Provider]:
    query = db.query(Provider)
    if search:
        term = f"%{search}%"
        query = query.filter(
            Provider.nombre.ilike(term) |
            Provider.ruc.ilike(term) |
            Provider.codigo_proceso.ilike(term)
        )
    return query.order_by(Provider.nombre).all()

def get_provider(db: Session, provider_id: int) -> Optional[Provider]:
    return db.query(Provider).filter(Provider.id == provider_id).first()

def create_provider(db: Session, data: ProviderCreate) -> Provider:
    existing = db.query(Provider).filter(Provider.ruc == data.ruc).first()
    if existing:
        raise ValueError(f"Ya existe un proveedor con RUC {data.ruc}")
    provider = Provider(**data.model_dump())
    db.add(provider)
    db.commit()
    db.refresh(provider)
    return provider

def update_provider(db: Session, provider_id: int, data: ProviderUpdate) -> Optional[Provider]:
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(provider, key, value)
    db.commit()
    db.refresh(provider)
    return provider

def delete_provider(db: Session, provider_id: int) -> bool:
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        return False
    db.delete(provider)
    db.commit()
    return True

def get_provider_records(db: Session, provider_id: int) -> List[Record]:
    return db.query(Record).filter(Record.provider_id == provider_id).order_by(Record.fecha_procesamiento.desc()).all()

def count_provider_records(db: Session) -> dict:
    from sqlalchemy import func
    rows = db.query(Record.provider_id, func.count(Record.id)).group_by(Record.provider_id).all()
    return {row[0]: row[1] for row in rows}
