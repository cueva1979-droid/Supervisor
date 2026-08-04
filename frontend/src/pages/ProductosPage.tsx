import { useEffect, useState } from 'react';
import { Search, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { getProductos } from '../services/api';
import type { ProductoItem } from '../types';

export default function ProductosPage() {
  const [items, setItems] = useState<ProductoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortKey, setSortKey] = useState<string>('id');
  const [sortAsc, setSortAsc] = useState(false);
  const perPage = 50;

  const load = async (p: number) => {
    setLoading(true);
    try {
      const res = await getProductos({ search: search || undefined, page: p, per_page: perPage });
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
      setPage(res.page);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); }, []);

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

  const fmt = (n: number) => n.toLocaleString('es-PY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="report-page">
      <div className="card">
        <div className="card-header card-header-wrap">
          <span><Package size={18} /> Productos</span>
          <div className="card-actions">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className="form-input"
                placeholder="Buscar producto, CPC, proveedor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: 280 }}
                onKeyDown={(e) => { if (e.key === 'Enter') load(1); }}
              />
              <button className="btn btn-primary btn-sm" onClick={() => load(1)}><Search size={14} /> Buscar</button>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando...</div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
              {total} producto{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
            </div>
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th onClick={() => handleSort('codigo_cpc')} style={{ cursor: 'pointer' }}>CPC <SortIcon k="codigo_cpc" /></th>
                    <th onClick={() => handleSort('descripcion')} style={{ cursor: 'pointer' }}>Descripción <SortIcon k="descripcion" /></th>
                    <th onClick={() => handleSort('unidad')} style={{ cursor: 'pointer' }}>Unidad <SortIcon k="unidad" /></th>
                    <th onClick={() => handleSort('cantidad')} style={{ cursor: 'pointer' }}>Cantidad <SortIcon k="cantidad" /></th>
                    <th onClick={() => handleSort('v_unitario')} style={{ cursor: 'pointer' }}>V. UNITARIO <SortIcon k="v_unitario" /></th>
                    <th onClick={() => handleSort('v_total')} style={{ cursor: 'pointer' }}>V. TOTAL <SortIcon k="v_total" /></th>
                    <th onClick={() => handleSort('numero_orden')} style={{ cursor: 'pointer' }}>N° Orden <SortIcon k="numero_orden" /></th>
                    <th onClick={() => handleSort('proveedor')} style={{ cursor: 'pointer' }}>Proveedor <SortIcon k="proveedor" /></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24 }}>No se encontraron productos</td></tr>
                  )}
                  {sorted.map((it) => (
                    <tr key={it.id}>
                      <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{it.codigo_cpc || '-'}</td>
                      <td><strong>{it.descripcion}</strong></td>
                      <td>{it.unidad || '-'}</td>
                      <td style={{ textAlign: 'right' }}>{it.cantidad}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(it.v_unitario)}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(it.v_total)}</td>
                      <td style={{ fontSize: 12 }}>{it.numero_orden || '-'}</td>
                      <td>{it.proveedor || '-'}</td>
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
    </div>
  );
}
