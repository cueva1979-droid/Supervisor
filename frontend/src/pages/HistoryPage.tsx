import { useEffect, useState } from 'react';
import { History, Search, Trash2, Eye, X, FileDown, ChevronUp, ChevronDown, Edit3, Save } from 'lucide-react';
import { getRecords, deleteRecord, getRecord, updateRecord, getExportExcelUrl } from '../services/api';
import type { RecordData } from '../types';
import CanEdit from '../components/CanEdit';

export default function HistoryPage() {
  const [records, setRecords] = useState<RecordData[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<RecordData | null>(null);
  const [editing, setEditing] = useState<RecordData | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [sortKey, setSortKey] = useState<string>('numero_orden');
  const [sortAsc, setSortAsc] = useState(false);

  const loadRecords = (s?: string) => {
    setLoading(true);
    getRecords(s || undefined).then((res) => {
      setRecords(res as RecordData[]);
      setLoading(false);
    });
  };

  useEffect(() => { loadRecords(); }, []);

  const handleSearch = () => {
    loadRecords(search || undefined);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este registro permanentemente?')) return;
    try {
      await deleteRecord(id);
      loadRecords(search || undefined);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleViewDetail = async (id: number) => {
    try {
      const data = await getRecord(id) as RecordData;
      setDetail(data);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEdit = async (id: number) => {
    try {
      const data = await getRecord(id) as RecordData;
      setEditing(data);
      setEditForm({
        proveedor: data.proveedor || '',
        ruc: data.ruc || '',
        codigo_proceso: data.codigo_proceso || '',
        numero_orden: data.numero_orden || '',
        fecha: data.fecha || '',
        objeto_contratacion: data.objeto_contratacion || '',
        administrador: (data as any).administrador || '',
        plazo_entrega: (data as any).plazo_entrega || '',
        monto_total: data.monto_total ?? 0,
        moneda: (data as any).moneda || 'USD',
        estado: data.estado || '',
        observaciones: (data as any).observaciones || '',
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveEdit = async () => {
    if (!editing?.id) return;
    setSaving(true);
    try {
      await updateRecord(editing.id, editForm);
      setEditing(null);
      loadRecords(search || undefined);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sorted = [...records].sort((a, b) => {
    if (!sortKey) return 0;
    const aVal = (a as any)[sortKey] ?? '';
    const bVal = (b as any)[sortKey] ?? '';
    let cmp: number;
    if (sortKey === 'numero_orden') {
      const aNum = parseInt(String(aVal).split('-').pop() || '0', 10);
      const bNum = parseInt(String(bVal).split('-').pop() || '0', 10);
      if (!isNaN(aNum) && !isNaN(bNum) && aNum !== bNum) cmp = aNum - bNum;
      else cmp = String(aVal).localeCompare(String(bVal));
    } else {
      cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
    }
    return sortAsc ? cmp : -cmp;
  });

  const SortIcon = ({ k }: { k: string }) => {
    if (sortKey !== k) return null;
    return sortAsc ? <ChevronUp size={12} style={{ display: 'inline', marginLeft: 2 }} /> : <ChevronDown size={12} style={{ display: 'inline', marginLeft: 2 }} />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div className="card-header" style={{ justifyContent: 'space-between' }}>
          <span><History size={18} /> Historial de Registros</span>
          <a href={getExportExcelUrl()} className="btn btn-success btn-sm" download>
            <FileDown size={14} /> Exportar Excel
          </a>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ maxWidth: 400, flex: 1, minWidth: 220 }}>
            <Search size={16} />
            <input placeholder="Buscar por proveedor, RUC, orden o proceso..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleSearch}><Search size={14} /> Buscar</button>
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Ordenar N° Orden:</span>
            <button
              className={`btn btn-sm ${sortKey === 'numero_orden' && sortAsc ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setSortKey('numero_orden'); setSortAsc(true); }}
              title="Menor a mayor (IC-...-0001 → 0058)"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <ChevronUp size={14} /> Ascendente
            </button>
            <button
              className={`btn btn-sm ${sortKey === 'numero_orden' && !sortAsc ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setSortKey('numero_orden'); setSortAsc(false); }}
              title="Mayor a menor (IC-...-0058 → 0001)"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <ChevronDown size={14} /> Descendente
            </button>
          </div>
        </div>
        {loading ? <div>Cargando...</div> : (
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('filename')}>Archivo <SortIcon k="filename" /></th>
                <th onClick={() => handleSort('proveedor')}>Proveedor <SortIcon k="proveedor" /></th>
                <th onClick={() => handleSort('ruc')}>RUC <SortIcon k="ruc" /></th>
                <th onClick={() => handleSort('codigo_proceso')}>Proceso <SortIcon k="codigo_proceso" /></th>
                <th onClick={() => handleSort('numero_orden')}>N° Orden <SortIcon k="numero_orden" /></th>
                <th onClick={() => handleSort('fecha')}>Fecha <SortIcon k="fecha" /></th>
                <th onClick={() => handleSort('monto_total')}>Monto <SortIcon k="monto_total" /></th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24 }}>No hay registros</td></tr>
              )}
              {sorted.map((r) => (
                <tr key={r.id}>
                  <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.filename}</td>
                  <td><strong>{r.proveedor || '-'}</strong></td>
                  <td>{r.ruc || '-'}</td>
                  <td>{r.codigo_proceso || '-'}</td>
                  <td>{r.numero_orden || '-'}</td>
                  <td>{r.fecha || '-'}</td>
                  <td>{(r.monto_total ?? 0).toLocaleString('es-PY', { minimumFractionDigits: 2 })}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn-icon" title="Ver detalle" onClick={() => handleViewDetail(r.id!)}><Eye size={15} /></button>
                      <CanEdit>
                        <button className="btn-icon" title="Editar" onClick={() => handleEdit(r.id!)} style={{ color: 'var(--primary)' }}><Edit3 size={15} /></button>
                        <button className="btn-icon" title="Eliminar" onClick={() => handleDelete(r.id!)} style={{ color: 'var(--danger)' }}><Trash2 size={15} /></button>
                      </CanEdit>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3>Detalle del Registro</h3>
              <button className="btn-icon" onClick={() => setDetail(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <dl className="detail-grid">
                <dt>Archivo</dt><dd>{detail.filename}</dd>
                <dt>Proveedor</dt><dd>{detail.proveedor || '-'}</dd>
                <dt>RUC</dt><dd>{detail.ruc || '-'}</dd>
                <dt>Código Proceso</dt><dd>{detail.codigo_proceso || '-'}</dd>
                <dt>N° Orden</dt><dd>{detail.numero_orden || '-'}</dd>
                <dt>Fecha</dt><dd>{detail.fecha || '-'}</dd>
                <dt>Objeto</dt><dd>{detail.objeto_contratacion || '-'}</dd>
                <dt>Monto Total</dt><dd>{(detail.monto_total ?? 0).toLocaleString('es-PY', { minimumFractionDigits: 2 })}</dd>
                <dt>Moneda</dt><dd>{detail.moneda || '-'}</dd>
                <dt>Estado</dt><dd>{detail.estado || '-'}</dd>
                <dt>Procesado</dt><dd>{detail.fecha_procesamiento ? new Date(detail.fecha_procesamiento).toLocaleString() : '-'}</dd>
              </dl>
              {detail.items && detail.items.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Ítems</h4>
                  <table>
                    <thead>
                      <tr>
                        <th>CPC</th>
                        <th>Descripción</th>
                        <th>Cant.</th>
                        <th>Unidad</th>
                        <th>P. Unit.</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.items.map((it, i) => (
                        <tr key={i}>
                          <td>{it.codigo_cpc || '-'}</td>
                          <td>{it.descripcion || '-'}</td>
                          <td>{it.cantidad}</td>
                          <td>{it.unidad || '-'}</td>
                          <td>{it.precio_unitario.toLocaleString('es-PY', { minimumFractionDigits: 2 })}</td>
                          <td>{it.subtotal.toLocaleString('es-PY', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDetail(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="modal-overlay" onClick={() => !saving && setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 650 }}>
            <div className="modal-header">
              <h3><Edit3 size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Editar Registro</h3>
              <button className="btn-icon" onClick={() => setEditing(null)} disabled={saving}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>Proveedor<input className="form-input" value={editForm.proveedor} onChange={e => setEditForm({ ...editForm, proveedor: e.target.value })} /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>RUC<input className="form-input" value={editForm.ruc} onChange={e => setEditForm({ ...editForm, ruc: e.target.value })} /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>Código Proceso<input className="form-input" value={editForm.codigo_proceso} onChange={e => setEditForm({ ...editForm, codigo_proceso: e.target.value })} /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>N° Orden<input className="form-input" value={editForm.numero_orden} onChange={e => setEditForm({ ...editForm, numero_orden: e.target.value })} /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>Fecha<input className="form-input" value={editForm.fecha} onChange={e => setEditForm({ ...editForm, fecha: e.target.value })} placeholder="DD/MM/YYYY" /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>Monto Total<input className="form-input" type="number" value={editForm.monto_total} onChange={e => setEditForm({ ...editForm, monto_total: parseFloat(e.target.value) || 0 })} /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>Administrador<input className="form-input" value={editForm.administrador} onChange={e => setEditForm({ ...editForm, administrador: e.target.value })} /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>Plazo Entrega<input className="form-input" value={editForm.plazo_entrega} onChange={e => setEditForm({ ...editForm, plazo_entrega: e.target.value })} /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>Estado<input className="form-input" value={editForm.estado} onChange={e => setEditForm({ ...editForm, estado: e.target.value })} /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>Moneda<input className="form-input" value={editForm.moneda || 'USD'} onChange={e => setEditForm({ ...editForm, moneda: e.target.value })} /></label>
              </div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>Objeto Contratación<textarea className="form-input" rows={3} value={editForm.objeto_contratacion} onChange={e => setEditForm({ ...editForm, objeto_contratacion: e.target.value })} /></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>Observaciones<textarea className="form-input" rows={2} value={editForm.observaciones} onChange={e => setEditForm({ ...editForm, observaciones: e.target.value })} /></label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setEditing(null)} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSaveEdit} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Save size={16} />{saving ? 'Guardando...' : 'Guardar Cambios'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
