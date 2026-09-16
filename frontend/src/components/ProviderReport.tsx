import { useEffect, useState, useCallback } from 'react';
import { Search, ChevronUp, ChevronDown, Filter, X, Users, FileText, Award, Edit3, Trash2, Save, AlertCircle } from 'lucide-react';
import { getProviderReport, getProviderExcelUrl } from '../services/ReportService';
import { updateProvider, deleteProvider } from '../services/api';
import ExportExcelButton from '../components/ExportExcelButton';
import CanEdit from '../components/CanEdit';
import type { ProviderReportItem, ProviderReportStats } from '../types';

export default function ProviderReport() {
  const [items, setItems] = useState<ProviderReportItem[]>([]);
  const [stats, setStats] = useState<ProviderReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ordenFiltro, setOrdenFiltro] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortKey, setSortKey] = useState<string>('nombre');
  const [sortAsc, setSortAsc] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ nombre: '', ruc: '', codigo_proceso: '', telefono: '', observaciones: '' });
  const [error, setError] = useState('');
  const perPage = 20;

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await getProviderReport({
        search: search || undefined,
        orden_filtro: ordenFiltro || undefined,
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
        page: p,
        per_page: perPage,
      });
      setItems(res.items);
      setStats(res.stats);
      setTotal(res.total);
      setTotalPages(res.total_pages);
      setPage(res.page);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, ordenFiltro, fechaDesde, fechaHasta]);

  useEffect(() => { load(1); }, [load]);

  const openEdit = (item: ProviderReportItem) => {
    setEditId(item.id);
    setForm({
      nombre: item.nombre,
      ruc: item.ruc,
      codigo_proceso: '',
      telefono: '',
      observaciones: ''
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre || !form.ruc) {
      setError('Nombre y RUC son obligatorios');
      return;
    }
    setError('');
    try {
      if (editId) {
        await updateProvider(editId, form);
        setModalOpen(false);
        load(page);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar el proveedor "${nombre}"? Se eliminarán todos sus registros asociados.`)) return;
    try {
      await deleteProvider(id);
      load(page);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sorted = [...items].sort((a, b) => {
    const aVal = (a as any)[sortKey] ?? '';
    const bVal = (b as any)[sortKey] ?? '';
    const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
    return sortAsc ? cmp : -cmp;
  });

  const SortIcon = ({ k }: { k: string }) => {
    if (sortKey !== k) return null;
    return sortAsc ? <ChevronUp size={12} style={{ display: 'inline', marginLeft: 2 }} /> : <ChevronDown size={12} style={{ display: 'inline', marginLeft: 2 }} />;
  };

  const excelHref = getProviderExcelUrl({
    search: search || undefined,
    orden_filtro: ordenFiltro || undefined,
  });

  return (
    <div className="report-page">
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue"><Users size={22} /></div>
            <div>
              <div className="stat-value">{stats.total_proveedores}</div>
              <div className="stat-label">Total Proveedores</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><FileText size={22} /></div>
            <div>
              <div className="stat-value">{stats.total_infimas}</div>
              <div className="stat-label">Total Ínfimas Registradas</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange"><Award size={22} /></div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div className="stat-value stat-value-sm" title={stats.top_proveedor}>{stats.top_proveedor}</div>
              <div className="stat-label">Proveedor con más contrataciones ({stats.top_cantidad})</div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header card-header-wrap">
          <span><FileText size={18} /> Reporte de Proveedores</span>
          <div className="card-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter size={14} /> Filtros
            </button>
            <ExportExcelButton href={excelHref} />
          </div>
        </div>

        {showFilters && (
          <div className="filters-grid">
            <div className="form-group" style={{ margin: 0 }}>
              <label>Buscar proveedor</label>
              <input className="form-input" placeholder="Nombre o RUC..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>N° Orden</label>
              <input className="form-input" placeholder="Filtrar por orden..." value={ordenFiltro} onChange={(e) => setOrdenFiltro(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Fecha desde</label>
              <input className="form-input" type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Fecha hasta</label>
              <input className="form-input" type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </div>
            <div className="filters-actions">
              <button className="btn btn-primary btn-sm" onClick={() => load(1)}><Search size={14} /> Buscar</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setOrdenFiltro(''); setFechaDesde(''); setFechaHasta(''); load(1); }}><X size={14} /> Limpiar</button>
            </div>
          </div>
        )}

        {loading ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando...</div> : (
          <>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
              {total} proveedor{total !== 1 ? 'es' : ''} encontrado{total !== 1 ? 's' : ''}
            </div>
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th onClick={() => handleSort('nombre')} style={{ cursor: 'pointer' }}>Nombre del Proveedor <SortIcon k="nombre" /></th>
                    <th onClick={() => handleSort('ruc')} style={{ cursor: 'pointer' }}>RUC <SortIcon k="ruc" /></th>
                    <th onClick={() => handleSort('ordenes')} style={{ cursor: 'pointer' }}>N° Orden <SortIcon k="ordenes" /></th>
                    <th onClick={() => handleSort('objeto')} style={{ cursor: 'pointer' }}>Objeto <SortIcon k="objeto" /></th>
                    <th onClick={() => handleSort('total_infimas')} style={{ cursor: 'pointer' }}>N° Ínfimas Contratadas <SortIcon k="total_infimas" /></th>
                    <th style={{ width: 100 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24 }}>No se encontraron proveedores</td></tr>
                  )}
                  {sorted.map((it) => (
                    <tr key={it.id}>
                      <td><strong>{it.nombre}</strong></td>
                      <td>{it.ruc || '-'}</td>
                      <td style={{ fontSize: 12 }}>{it.ordenes || '-'}</td>
                      <td style={{ fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={it.objeto}>{it.objeto || '-'}</td>
                      <td><span className="badge badge-primary">{it.total_infimas}</span></td>
                      <td>
                        <div className="table-actions">
                          <CanEdit>
                            <button className="btn-icon" title="Editar" onClick={() => openEdit(it)}><Edit3 size={15} /></button>
                          </CanEdit>
                          <CanEdit>
                            <button className="btn-icon" title="Eliminar" onClick={() => handleDelete(it.id, it.nombre)} style={{ color: 'var(--danger)' }}><Trash2 size={15} /></button>
                          </CanEdit>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => load(page - 1)}>Anterior</button>
                <span style={{ fontSize: 13 }}>Página {page} de {totalPages}</span>
                <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => load(page + 1)}>Siguiente</button>
              </div>
            )}
          </>
        )}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Editar Proveedor</h3>
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
    </div>
  );
}
