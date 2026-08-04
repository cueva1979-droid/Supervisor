import { useEffect, useState } from 'react';
import { Users, Plus, Search, Edit3, Trash2, X, Save, AlertCircle, Phone, FileText } from 'lucide-react';
import { getProviders, createProvider, updateProvider, deleteProvider, getProvider } from '../services/api';
import type { ProviderData } from '../types';
import CanEdit from '../components/CanEdit';

export default function ProvidersPage() {
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ nombre: '', ruc: '', codigo_proceso: '', telefono: '', observaciones: '' });
  const [viewId, setViewId] = useState<number | null>(null);
  const [viewData, setViewData] = useState<ProviderData | null>(null);
  const [error, setError] = useState('');

  const loadProviders = () => {
    setLoading(true);
    getProviders(search || undefined).then((res) => {
      setProviders(res as ProviderData[]);
      setLoading(false);
    });
  };

  useEffect(() => { loadProviders(); }, [search]);

  const openCreate = () => {
    setEditId(null);
    setForm({ nombre: '', ruc: '', codigo_proceso: '', telefono: '', observaciones: '' });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (p: ProviderData) => {
    setEditId(p.id!);
    setForm({ nombre: p.nombre, ruc: p.ruc, codigo_proceso: p.codigo_proceso || '', telefono: p.telefono || '', observaciones: p.observaciones || '' });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre || !form.ruc) { setError('Nombre y RUC son obligatorios'); return; }
    setError('');
    try {
      if (editId) {
        await updateProvider(editId, form);
      } else {
        await createProvider(form);
      }
      setModalOpen(false);
      loadProviders();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este proveedor? Se eliminarán todos sus registros asociados.')) return;
    try {
      await deleteProvider(id);
      loadProviders();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleView = async (id: number) => {
    try {
      const data = await getProvider(id) as ProviderData;
      setViewData(data);
      setViewId(id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div className="card-header" style={{ justifyContent: 'space-between' }}>
          <span><Users size={18} /> Gestión de Proveedores</span>
          <CanEdit>
            <button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={14} /> Nuevo Proveedor</button>
          </CanEdit>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div className="search-bar">
            <Search size={16} />
            <input placeholder="Buscar proveedores..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        {loading ? <div>Cargando...</div> : (
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>RUC</th>
                <th>Contratos</th>
                <th>Código Proceso</th>
                <th>Teléfono</th>
                <th>Fecha Creación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {providers.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24 }}>No hay proveedores registrados</td></tr>
              )}
              {providers.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.nombre}</strong></td>
                    <td>{p.ruc}</td>
                    <td><span className="badge badge-primary">{(p as any).contratos ?? 0}</span></td>
                    <td>{p.codigo_proceso || '-'}</td>
                    <td>{p.telefono || '-'}</td>
                    <td>{p.fecha_creacion ? new Date(p.fecha_creacion).toLocaleDateString() : '-'}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn-icon" title="Ver registros" onClick={() => handleView(p.id!)}><FileText size={15} /></button>
                      <CanEdit>
                        <button className="btn-icon" title="Editar" onClick={() => openEdit(p)}><Edit3 size={15} /></button>
                      </CanEdit>
                      <CanEdit>
                        <button className="btn-icon" title="Eliminar" onClick={() => handleDelete(p.id!)} style={{ color: 'var(--danger)' }}><Trash2 size={15} /></button>
                      </CanEdit>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editId ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
              <button className="btn-icon" onClick={() => setModalOpen(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle size={14} />{error}</div>}
              <div className="form-group">
                <label>Nombre *</label>
                <input className="form-input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Razón social" />
              </div>
              <div className="form-group">
                <label>RUC *</label>
                <input className="form-input" value={form.ruc} onChange={(e) => setForm({ ...form, ruc: e.target.value })} placeholder="12345678-9" />
              </div>
              <div className="form-group">
                <label>Código Proceso</label>
                <input className="form-input" value={form.codigo_proceso} onChange={(e) => setForm({ ...form, codigo_proceso: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Teléfono</label>
                <input className="form-input" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="+595 981 123456" />
              </div>
              <div className="form-group">
                <label>Observaciones</label>
                <textarea className="form-textarea" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
              <CanEdit>
                <button className="btn btn-primary" onClick={handleSave}><Save size={14} /> Guardar</button>
              </CanEdit>
            </div>
          </div>
        </div>
      )}

      {viewId && viewData && (
        <div className="modal-overlay" onClick={() => setViewId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3>Registros de {viewData.nombre}</h3>
              <button className="btn-icon" onClick={() => setViewId(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {(!viewData.records || viewData.records.length === 0) ? (
                <div className="empty-state"><FileText size={40} /><h3>Sin registros</h3><p>Este proveedor no tiene órdenes asociadas</p></div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Archivo</th>
                      <th>N° Orden</th>
                      <th>Fecha</th>
                      <th>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewData.records.map((r) => (
                      <tr key={r.id}>
                        <td>{r.filename}</td>
                        <td>{r.numero_orden || '-'}</td>
                        <td>{r.fecha || '-'}</td>
                        <td>{(r.monto_total ?? 0).toLocaleString('es-PY', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
