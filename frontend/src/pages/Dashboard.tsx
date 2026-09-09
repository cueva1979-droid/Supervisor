import { useEffect, useState } from 'react';
import { LayoutDashboard, Users, FileText, DollarSign, PieChart as PieIcon, BarChart3 } from 'lucide-react';
import { getDashboard } from '../services/api';
import type { DashboardData } from '../types';

const PIE_COLORS = ['#1e40af', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    getDashboard().then((res) => setData(res as DashboardData));
  }, []);

  if (!data) return <div>Cargando...</div>;

  const ordenes = Object.entries(data.ordenes_por_mes ?? {});
  const totalOrdenesPie = ordenes.reduce((s, [, v]) => s + v, 0) || 1;
  const montos = Object.entries(data.montos_por_proveedor ?? {});
  const maxMontos = Math.max(...montos.map(([, v]) => v), 1);

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

      <div className="card">
        <div className="card-header"><PieIcon size={18} /> Órdenes por Mes — Diagrama Circular</div>
        {ordenes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>Sin datos</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', justifyContent: 'center', padding: 12 }}>
            <svg width={200} height={200} viewBox="0 0 200 200" style={{ flexShrink: 0 }}>
              {(() => {
                let acc = 0;
                return ordenes.map(([label, value], i) => {
                  const start = (acc / totalOrdenesPie) * 360;
                  acc += value;
                  const end = (acc / totalOrdenesPie) * 360;
                  const color = PIE_COLORS[i % PIE_COLORS.length];
                  if (value === 0) return null;
                  return <path key={label} d={describeArc(100, 100, 80, start, end)} fill={color} stroke="white" strokeWidth={2} />;
                });
              })()}
              <circle cx={100} cy={100} r={45} fill="var(--bg, white)" />
              <text x={100} y={100} textAnchor="middle" dy={-4} fontSize={18} fontWeight={800} fill="var(--text)">{totalOrdenesPie}</text>
              <text x={100} y={100} textAnchor="middle" dy={12} fontSize={11} fill="var(--text-secondary)">Total</text>
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 180 }}>
              {ordenes.map(([label, value], i) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <span style={{ width: 14, height: 14, borderRadius: 3, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{label}</span>
                  <strong>{value}</strong>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>({((value / totalOrdenesPie) * 100).toFixed(1)}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header"><BarChart3 size={18} /> Montos Contratados</div>
        {montos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>Sin datos de montos</div>
        ) : (
          <div className="chart-container">
            <div className="bar-chart">
              {montos.slice(0, 10).map(([label, value]) => (
                <div key={label} className="bar-item" title={`${label}: ${value.toLocaleString('es-PY')}`}>
                  <div className="bar-value" style={{ fontSize: 11 }}>{value.toLocaleString('es-PY', { notation: 'compact', maximumFractionDigits: 1 })}</div>
                  <div className="bar" style={{ height: `${(value / maxMontos) * 100}%`, background: 'linear-gradient(to top, #1e40af, #60a5fa)' }} />
                  <div className="bar-label" style={{ fontSize: 10, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label.length > 18 ? label.slice(0, 18) + '…' : label}</div>
                </div>
              ))}
            </div>
            {montos.length > 10 && <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>Mostrando top 10 de {montos.length} proveedores</p>}
          </div>
        )}
      </div>
    </div>
  );
}
