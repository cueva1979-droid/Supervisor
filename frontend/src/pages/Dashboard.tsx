import { useEffect, useState } from 'react';
import { LayoutDashboard, Users, FileText, DollarSign, PieChart as PieIcon, BarChart3, TrendingUp } from 'lucide-react';
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
  const [pacEjecucion, setPacEjecucion] = useState<{ tramite: number; pendiente: number; ejecucion: number } | null>(null);

  useEffect(() => {
    getDashboard().then((res) => setData(res as DashboardData));
    // Cargar reporte PAC por estado de ejecución para Inicio
    import('../services/pacApi').then(({ pacAPI }) =>
      pacAPI.getPeriodAnalysis().then((rows: any[]) => {
        const c = { tramite: 0, pendiente: 0, ejecucion: 0 };
        rows.forEach((r: any) => {
          const e = (r.estado_ejecucion || 'Pendiente').toLowerCase();
          if (e.includes('tramite')) c.tramite++;
          else if (e.includes('ejecucion')) c.ejecucion++;
          else c.pendiente++;
        });
        setPacEjecucion(c);
      }).catch(() => {})
    );
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

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><PieIcon size={18} /> Órdenes por Mes — Diagrama Circular</div>
          {ordenes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>Sin datos</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', justifyContent: 'center', padding: 12 }}>
              <svg width={200} height={200} viewBox="0 0 200 200" style={{ flexShrink: 0 }}>
                {(() => {
                  let acc = 0;
                  return ordenes.flatMap(([label, value], i) => {
                    const start = (acc / totalOrdenesPie) * 360;
                    acc += value;
                    const end = (acc / totalOrdenesPie) * 360;
                    const color = PIE_COLORS[i % PIE_COLORS.length];
                    if (value === 0) return [];
                    const pct = (value / totalOrdenesPie) * 100;
                    const mid = (start + end) / 2;
                    const pos = polarToCartesian(100, 100, 48, mid);
                    const elems: any[] = [
                      <path key={label} d={describeArc(100, 100, 80, start, end)} fill={color} stroke="white" strokeWidth={2} />
                    ];
                    if (pct >= 4) {
                      elems.push(
                        <text key={label + '-pct'} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle" fontSize={pct >= 10 ? 11 : 9} fontWeight={800} fill="white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)', paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.35)', strokeWidth: 2 }}>{pct.toFixed(1)}%</text>
                      );
                    }
                    return elems;
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
          <div className="card-header"><TrendingUp size={18} /> Evolución de Compras por Mes</div>
          {(() => {
            const sorted = [...ordenes].sort((a, b) => {
              const pa = a[0].split('/'); const pb = b[0].split('/');
              const da = pa.length === 2 ? new Date(parseInt(pa[1]), parseInt(pa[0]) - 1) : new Date(a[0]);
              const db = pb.length === 2 ? new Date(parseInt(pb[1]), parseInt(pb[0]) - 1) : new Date(b[0]);
              return da.getTime() - db.getTime();
            });
            if (sorted.length === 0) return <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>Sin datos</div>;
            const maxV = Math.max(...sorted.map(([, v]) => v), 1);
            const W = 340, H = 180, padL = 32, padR = 12, padT = 12, padB = 28;
            const innerW = W - padL - padR;
            const innerH = H - padT - padB;
            const stepX = sorted.length === 1 ? 0 : innerW / (sorted.length - 1);
            const points = sorted.map(([, v], i) => {
              const x = padL + i * stepX;
              const y = padT + innerH - (v / maxV) * innerH;
              return { x, y, v };
            });
            const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
            const areaD = `${pathD} L ${points[points.length - 1].x} ${padT + innerH} L ${points[0].x} ${padT + innerH} Z`;
            return (
              <div style={{ padding: '8px 12px' }}>
                <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
                  {/* grid */}
                  {[0, 0.5, 1].map(t => {
                    const y = padT + innerH * t;
                    return <line key={t} x1={padL} x2={W - padR} y1={y} y2={y} stroke="var(--border, #e5e7eb)" strokeDasharray="4 4" />;
                  })}
                  {[0, 0.5, 1].map(t => {
                    const v = Math.round(maxV * (1 - t));
                    const y = padT + innerH * t;
                    return <text key={v} x={2} y={y + 4} fontSize={10} fill="var(--text-secondary)">{v}</text>;
                  })}
                  <path d={areaD} fill="rgba(30,64,175,0.12)" stroke="none" />
                  <path d={pathD} fill="none" stroke="#1e40af" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                  {points.map((p, i) => (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r={4} fill="#1e40af" stroke="white" strokeWidth={2} />
                      <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize={10} fontWeight={700} fill="#1e40af">{p.v}</text>
                    </g>
                  ))}
                  {sorted.map(([label], i) => (
                    <text key={label} x={padL + i * stepX} y={H - 8} textAnchor="middle" fontSize={10} fill="var(--text-secondary)">{label}</text>
                  ))}
                </svg>
                <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Tendencia mensual de órdenes registradas</p>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="grid-2">
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

        <div className="card">
          <div className="card-header"><PieIcon size={18} /> Reporte por Estado de Ejecución — Módulo PAC</div>
          {!pacEjecucion ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>Cargando...</div>
          ) : (() => {
            const total = pacEjecucion.tramite + pacEjecucion.pendiente + pacEjecucion.ejecucion || 1;
            const items: [string, number, string][] = [
              ['En tramite', pacEjecucion.tramite, '#f59e0b'],
              ['Pendiente', pacEjecucion.pendiente, '#ef4444'],
              ['En Ejecucion', pacEjecucion.ejecucion, '#1e40af'],
            ];
            let acc = 0;
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', justifyContent: 'center', padding: 12 }}>
                <svg width={180} height={180} viewBox="0 0 200 200" style={{ flexShrink: 0 }}>
                  {items.flatMap(([label, value, color]) => {
                    if (value === 0) return [];
                    const start = (acc / total) * 360;
                    acc += value;
                    const end = (acc / total) * 360;
                    const pct = (value / total) * 100;
                    const mid = (start + end) / 2;
                    const pos = polarToCartesian(100, 100, 46, mid);
                    const elems: any[] = [
                      <path key={label} d={describeArc(100, 100, 75, start, end)} fill={color} stroke="white" strokeWidth={2} />
                    ];
                    if (pct >= 4) {
                      elems.push(
                        <text key={label + '-pct'} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle" fontSize={pct >= 12 ? 11 : 9} fontWeight={800} fill="white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)', paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.35)', strokeWidth: 2 }}>{pct.toFixed(1)}%</text>
                      );
                    }
                    return elems;
                  })}
                  <circle cx={100} cy={100} r={42} fill="var(--bg, white)" />
                  <text x={100} y={100} textAnchor="middle" dy={-4} fontSize={16} fontWeight={800} fill="var(--text)">{total}</text>
                  <text x={100} y={100} textAnchor="middle" dy={10} fontSize={10} fill="var(--text-secondary)">PAC</text>
                </svg>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 160 }}>
                  {items.map(([label, value, color]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '6px 10px', borderRadius: 8, background: color === '#1e40af' ? '#dbeafe' : color === '#f59e0b' ? '#fef3c7' : '#fee2e2', border: `1px solid ${color}40` }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: color, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontWeight: 600, color: color === '#1e40af' ? '#1e40af' : color === '#f59e0b' ? '#92400e' : '#991b1b' }}>{label}</span>
                      <strong>{value}</strong>
                      <span style={{ fontSize: 12, opacity: 0.8 }}>({((value / total) * 100).toFixed(1)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Fuente: PAC → Análisis Periodos → Estado Ejecución</p>
        </div>
      </div>
    </div>
  );
}
