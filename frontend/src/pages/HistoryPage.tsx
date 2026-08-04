import { useEffect, useState } from 'react';
import { History, Search, Trash2, Eye, X, FileDown, ChevronUp, ChevronDown } from 'lucide-react';
import { getRecords, deleteRecord, getRecord, getExportExcelUrl } from '../services/api';
import type { RecordData } from '../types';
import CanEdit from '../components/CanEdit';

export default function HistoryPage() {
  const [records, setRecords] = useState<RecordData[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<RecordData | null>(null);
  const [sortKey, setSortKey] = useState<string>('fecha_procesamiento');
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

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sorted = [...records].sort((a, b) => {
    if (!sortKey) return 0;
    const aVal = (a as any)[sortKey] ?? '';
    const bVal = (b as any)[sortKey] ?? '';
    const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
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
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <div className="search-bar" style={{ maxWidth: 400, flex: 1 }}>
            <Search size={16} />
            <input placeholder="Buscar por proveedor, RUC, orden o proceso..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleSearch}><Search size={14} /> Buscar</button>
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
    </div>
  );
}
