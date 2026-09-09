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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ textAlign: 'center', padding: '12px 16px', background: 'var(--primary, #1e40af)', color: 'white', borderRadius: 12, letterSpacing: '0.04em' }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>SISTEMA ADMINISTRATIVO DE PROCESOS DE CONTRATACIÓN</h1>
      </div>
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
    </div>
  );
}
