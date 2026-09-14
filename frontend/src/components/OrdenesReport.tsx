import { useEffect, useState, useCallback } from 'react';
import { Search, ArrowUp, ArrowDown } from 'lucide-react';

interface OrdenItem {
  numero_orden: string;
  objeto_contratacion: string;
  fecha: string;
  plazo_entrega: string;
  proveedor: string;
  administrador: string;
}

type SortField = 'numero_orden' | 'objeto_contratacion' | 'fecha' | 'plazo_entrega' | 'proveedor' | 'administrador' | null;

export default function OrdenesReport() {
  const [items, setItems] = useState<OrdenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<SortField>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const perPage = 50;

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), per_page: String(perPage) });
      if (search) params.set('search', search);
      if (sortBy) {
        params.set('sort_by', sortBy);
        params.set('sort_dir', sortDir);
      }
      const res = await fetch(`/reports/ordenes?${params}`, { credentials: 'include' });
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
      setPage(data.page);
    } catch { } finally {
      setLoading(false);
    }
  }, [search, sortBy, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return null;
    return sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  useEffect(() => { load(1); }, [load]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-input"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 32, width: 260, fontSize: 13 }}
            />
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{total} orden(es)</span>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 8px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('numero_orden')}>Nro. Orden <SortIcon field="numero_orden" /></th>
                <th style={{ padding: '10px 8px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('objeto_contratacion')}>Objeto <SortIcon field="objeto_contratacion" /></th>
                <th style={{ padding: '10px 8px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('fecha')}>Fecha <SortIcon field="fecha" /></th>
                <th style={{ padding: '10px 8px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('plazo_entrega')}>Plazo de Entrega <SortIcon field="plazo_entrega" /></th>
                <th style={{ padding: '10px 8px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('proveedor')}>Proveedor <SortIcon field="proveedor" /></th>
                <th style={{ padding: '10px 8px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('administrador')}>Administrador <SortIcon field="administrador" /></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron órdenes</td>
                </tr>
              ) : items.map((item, i) => (
                <tr key={i}>
                  <td style={{ padding: '8px', fontWeight: 500 }}>{item.numero_orden || '—'}</td>
                  <td style={{ padding: '8px', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.objeto_contratacion || '—'}</td>
                  <td style={{ padding: '8px' }}>{item.fecha || '—'}</td>
                  <td style={{ padding: '8px' }}>{item.plazo_entrega || '—'}</td>
                  <td style={{ padding: '8px' }}>{item.proveedor || '—'}</td>
                  <td style={{ padding: '8px' }}>{item.administrador || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              className={p === page ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
              onClick={() => load(p)}
              style={{ minWidth: 32 }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
