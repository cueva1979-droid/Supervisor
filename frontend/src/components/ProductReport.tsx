import { useEffect, useState, useCallback } from 'react';
import { Search, ChevronUp, ChevronDown, Filter, X, Package, ShoppingCart, TrendingUp, DollarSign } from 'lucide-react';
import { getProductReport, getProductExcelUrl } from '../services/ProductReportService';
import ExportExcelButton from '../components/ExportExcelButton';
import type { ProductReportItem, ProductReportStats, ProductReportCharts } from '../types';

export default function ProductReport() {
  const [items, setItems] = useState<ProductReportItem[]>([]);
  const [stats, setStats] = useState<ProductReportStats | null>(null);
  const [charts, setCharts] = useState<ProductReportCharts | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [producto, setProducto] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [codigoCpc, setCodigoCpc] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [precioMin, setPrecioMin] = useState('');
  const [precioMax, setPrecioMax] = useState('');
  const [codigoProceso, setCodigoProceso] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortKey, setSortKey] = useState<string>('total_adquirido');
  const [sortAsc, setSortAsc] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const perPage = 20;

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await getProductReport({
        search: search || undefined,
        producto: producto || undefined,
        proveedor: proveedor || undefined,
        codigo_cpc: codigoCpc || undefined,
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
        precio_min: precioMin ? Number(precioMin) : undefined,
        precio_max: precioMax ? Number(precioMax) : undefined,
        codigo_proceso: codigoProceso || undefined,
        page: p,
        per_page: perPage,
      });
      setItems(res.items);
      setStats(res.stats);
      setCharts(res.charts);
      setTotal(res.total);
      setTotalPages(res.total_pages);
      setPage(res.page);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, producto, proveedor, codigoCpc, fechaDesde, fechaHasta, precioMin, precioMax, codigoProceso]);

  useEffect(() => { load(1); }, [load]);

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

  const excelHref = getProductExcelUrl({
    search: search || undefined,
    producto: producto || undefined,
    proveedor: proveedor || undefined,
    codigo_cpc: codigoCpc || undefined,
    fecha_desde: fechaDesde || undefined,
    fecha_hasta: fechaHasta || undefined,
    precio_min: precioMin ? Number(precioMin) : undefined,
    precio_max: precioMax ? Number(precioMax) : undefined,
    codigo_proceso: codigoProceso || undefined,
  });

  const maxBar = (data: { value: number }[]) => Math.max(...data.map(d => d.value), 1);
  const fmt = (n: number) => n.toLocaleString('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className="report-page">
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue"><Package size={22} /></div>
            <div>
              <div className="stat-value">{stats.total_productos}</div>
              <div className="stat-label">Total Productos</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><ShoppingCart size={22} /></div>
            <div>
              <div className="stat-value">{stats.total_compras}</div>
              <div className="stat-label">Total Compras</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange"><TrendingUp size={22} /></div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div className="stat-value stat-value-sm" title={stats.producto_mas_comprado}>{stats.producto_mas_comprado}</div>
              <div className="stat-label">Producto Más Comprado</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple"><DollarSign size={22} /></div>
            <div>
              <div className="stat-value">{fmt(stats.valor_total_acumulado)}</div>
              <div className="stat-label">Valor Total Acumulado</div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header card-header-wrap">
          <span><Package size={18} /> Productos y Precios</span>
          <div className="card-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter size={14} /> Filtros
            </button>
            <ExportExcelButton href={excelHref} label="Exportar Excel" />
          </div>
        </div>

        {showFilters && (
          <div className="filters-grid">
            <div className="form-group" style={{ margin: 0 }}>
              <label>Buscar</label>
              <input className="form-input" placeholder="Producto o CPC..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Producto</label>
              <input className="form-input" placeholder="Nombre producto..." value={producto} onChange={(e) => setProducto(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Proveedor</label>
              <input className="form-input" placeholder="Nombre proveedor..." value={proveedor} onChange={(e) => setProveedor(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Código CPC</label>
              <input className="form-input" placeholder="CPC..." value={codigoCpc} onChange={(e) => setCodigoCpc(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Código Proceso</label>
              <input className="form-input" placeholder="Proceso..." value={codigoProceso} onChange={(e) => setCodigoProceso(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Fecha desde</label>
              <input className="form-input" type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Fecha hasta</label>
              <input className="form-input" type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Precio mín</label>
              <input className="form-input" type="number" placeholder="0" value={precioMin} onChange={(e) => setPrecioMin(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Precio máx</label>
              <input className="form-input" type="number" placeholder="0" value={precioMax} onChange={(e) => setPrecioMax(e.target.value)} />
            </div>
            <div className="filters-actions">
              <button className="btn btn-primary btn-sm" onClick={() => load(1)}><Search size={14} /> Buscar</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setProducto(''); setProveedor(''); setCodigoCpc(''); setFechaDesde(''); setFechaHasta(''); setPrecioMin(''); setPrecioMax(''); setCodigoProceso(''); load(1); }}><X size={14} /> Limpiar</button>
            </div>
          </div>
        )}

        {loading ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando...</div> : (
          <>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
              {total} producto{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
            </div>
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th onClick={() => handleSort('codigo_cpc')} style={{ cursor: 'pointer' }}>Código CPC <SortIcon k="codigo_cpc" /></th>
                    <th onClick={() => handleSort('descripcion')} style={{ cursor: 'pointer', paddingRight: 24 }}>Producto <SortIcon k="descripcion" /></th>
                    <th onClick={() => handleSort('precio_min')} style={{ cursor: 'pointer', paddingLeft: 24 }}>Precio Mín <SortIcon k="precio_min" /></th>
                    <th onClick={() => handleSort('precio_max')} style={{ cursor: 'pointer' }}>Precio Máx <SortIcon k="precio_max" /></th>
                    <th onClick={() => handleSort('precio_promedio')} style={{ cursor: 'pointer' }}>Precio Prom <SortIcon k="precio_promedio" /></th>
                    <th onClick={() => handleSort('compras')} style={{ cursor: 'pointer' }}>Compras <SortIcon k="compras" /></th>
                    <th onClick={() => handleSort('total_adquirido')} style={{ cursor: 'pointer' }}>Total Adquirido <SortIcon k="total_adquirido" /></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24 }}>No se encontraron productos</td></tr>
                  )}
                  {sorted.map((it, i) => (
                    <tr key={it.codigo_cpc + it.descripcion + i}>
                      <td style={{ fontSize: 12 }}>{it.codigo_cpc || '-'}</td>
                      <td style={{ paddingRight: 24 }}><strong>{it.descripcion}</strong></td>
                      <td style={{ paddingLeft: 24 }}>{it.precio_min.toLocaleString('es-PY')}</td>
                      <td>{it.precio_max.toLocaleString('es-PY')}</td>
                      <td>{it.precio_promedio.toLocaleString('es-PY')}</td>
                      <td><span className="badge badge-primary">{it.compras}</span></td>
                      <td>{fmt(it.total_adquirido)}</td>
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

      {charts && !loading && (
        <div className="charts-grid">
          <div className="card">
            <div className="card-header"><TrendingUp size={16} /> Productos Más Comprados</div>
            <div className="chart-container">
              <div className="bar-chart" style={{ height: 160 }}>
                {charts.chart_top_products.map((d, i) => (
                  <div key={i} className="bar-item">
                    <div className="bar-value" style={{ fontSize: 9 }}>{fmt(d.value)}</div>
                    <div className="bar" style={{ height: `${(d.value / maxBar(charts.chart_top_products)) * 130}px`, background: i === 0 ? 'var(--primary)' : 'var(--border)' }} />
                    <div className="bar-label bar-label-sm">{d.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><ShoppingCart size={16} /> Evolución de Precios Promedio</div>
            <div className="chart-container">
              <div className="bar-chart" style={{ height: 160 }}>
                {charts.chart_price_evolution.slice(-10).map((d, i) => (
                  <div key={i} className="bar-item">
                    <div className="bar-value" style={{ fontSize: 9 }}>{fmt(d.value)}</div>
                    <div className="bar" style={{ height: `${(d.value / maxBar(charts.chart_price_evolution)) * 130}px`, background: '#10b981' }} />
                    <div className="bar-label bar-label-sm">{d.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><DollarSign size={16} /> Compras por Proveedor</div>
            <div className="chart-container">
              <div className="bar-chart" style={{ height: 160 }}>
                {charts.chart_provider_purchases.map((d, i) => (
                  <div key={i} className="bar-item">
                    <div className="bar-value" style={{ fontSize: 9 }}>{d.value}</div>
                    <div className="bar" style={{ height: `${(d.value / maxBar(charts.chart_provider_purchases)) * 130}px`, background: '#f59e0b' }} />
                    <div className="bar-label bar-label-sm">{d.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
