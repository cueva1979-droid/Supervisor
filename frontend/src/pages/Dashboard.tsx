import { useEffect, useState } from 'react';
import { LayoutDashboard, Users, FileText, DollarSign, TrendingUp, BarChart3 } from 'lucide-react';
import { getDashboard } from '../services/api';
import type { DashboardData } from '../types';

function maxValue(entries: [string, number][]): number {
  return Math.max(...entries.map(([, v]) => v), 1);
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    getDashboard().then((res) => setData(res as DashboardData));
  }, []);

  if (!data) return <div>Cargando...</div>;

  const ordenes = Object.entries(data.ordenes_por_mes ?? {});
  const montos = Object.entries(data.montos_por_proveedor ?? {});
  const maxOrdenes = maxValue(ordenes);
  const maxMontos = maxValue(montos);
  const ultimos = (data.ultimos_registros ?? []).slice(-5).reverse();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="grid-4">
        <div className="stat-card">
          <div className="stat-icon blue"><FileText size={22} /></div>
          <div>
            <div className="stat-value">{data.total_documentos ?? 0}</div>
            <div className="stat-label">Total Documentos</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><Users size={22} /></div>
          <div>
            <div className="stat-value">{data.total_proveedores ?? 0}</div>
            <div className="stat-label">Total Proveedores</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><LayoutDashboard size={22} /></div>
          <div>
            <div className="stat-value">{data.total_ordenes ?? 0}</div>
            <div className="stat-label">Total Órdenes</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><DollarSign size={22} /></div>
          <div>
            <div className="stat-value">{(data.total_montos ?? 0).toLocaleString('es-PY', { minimumFractionDigits: 2 })}</div>
            <div className="stat-label">Total Montos Acumulados</div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><BarChart3 size={18} /> Órdenes por Mes</div>
          <div className="chart-container">
            <div className="bar-chart">
              {ordenes.map(([label, value]) => (
                <div key={label} className="bar-item">
                  <div className="bar-value">{value}</div>
                  <div className="bar" style={{ height: `${(value / maxOrdenes) * 100}%` }} />
                  <div className="bar-label">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><TrendingUp size={18} /> Montos por Proveedor</div>
          <div className="chart-container">
            <div className="bar-chart">
              {montos.map(([label, value]) => (
                <div key={label} className="bar-item">
                  <div className="bar-value">{value.toLocaleString('es-PY', { minimumFractionDigits: 0 })}</div>
                  <div className="bar" style={{ height: `${(value / maxMontos) * 100}%` }} />
                  <div className="bar-label">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><FileText size={18} /> Últimos Registros</div>
        <table>
          <thead>
            <tr>
              <th>Archivo</th>
              <th>Proveedor</th>
              <th>Fecha</th>
              <th>Monto Total</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {ultimos.map((r, i) => (
              <tr key={r.id ?? i}>
                <td>{r.filename ?? '-'}</td>
                <td>{r.proveedor ?? '-'}</td>
                <td>{r.fecha ?? '-'}</td>
                <td>{(r.monto_total ?? 0).toLocaleString('es-PY', { minimumFractionDigits: 2 })}</td>
                <td>{r.estado ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
