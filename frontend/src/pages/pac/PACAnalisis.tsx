import { useState, useEffect } from 'react';
import { CalendarDays, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { pacAPI } from '../../services/pacApi';

const PERIOD_DEFINITIONS: Record<string, { code: string; label: string; months: string }> = {
  C1: { code: 'C1', label: 'Cuatrimestre 1', months: 'Enero - Abril' },
  C2: { code: 'C2', label: 'Cuatrimestre 2', months: 'Mayo - Agosto' },
  C3: { code: 'C3', label: 'Cuatrimestre 3', months: 'Septiembre - Diciembre' },
};

const STATUS_LABELS: Record<string, string> = {
  current: 'Período Actual', past: 'Período Vencido', future: 'Período Futuro', unknown: 'Sin definir',
};

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(value);
}

function truncate(text: string | null | undefined, max = 60): string {
  if (!text) return '';
  return String(text).length > max ? String(text).slice(0, max - 1) + '…' : String(text);
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'current': return <Clock size={16} />;
    case 'past': return <AlertTriangle size={16} />;
    case 'future': return <CheckCircle size={16} />;
    default: return null;
  }
}

function getStatusStyle(status: string): React.CSSProperties {
  switch (status) {
    case 'current': return { background: '#fef3c7', color: '#92400e' };
    case 'past': return { background: '#fee2e2', color: '#991b1b' };
    case 'future': return { background: '#d1fae5', color: '#065f46' };
    default: return { background: '#f3f4f6', color: '#6b7280' };
  }
}

function getRowStyle(status: string): React.CSSProperties {
  switch (status) {
    case 'current': return { background: '#fffbeb' };
    case 'past': return { background: '#fef2f2' };
    case 'future': return { background: '#f0fdf4' };
    default: return {};
  }
}

export default function PACAnalisis() {
  const [analysisData, setAnalysisData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ current: 0, past: 0, future: 0, unknown: 0 });

  useEffect(() => {
    loadAnalysis();
  }, []);

  const loadAnalysis = async () => {
    try {
      const data = await pacAPI.getPeriodAnalysis();
      setAnalysisData(data);
      const counts = { current: 0, past: 0, future: 0, unknown: 0 };
      data.forEach((doc: any) => { counts[doc.status as keyof typeof counts]++; });
      setSummary(counts);
    } catch (err) {
      console.error('Error loading analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>Cargando...</div>;

  return (
    <div>
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarDays size={22} color="#7c3aed" />
          Leyenda de Períodos
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
          {Object.values(PERIOD_DEFINITIONS).map(p => (
            <div key={p.code} style={{ background: 'var(--bg)', padding: 12, borderRadius: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <strong>{p.code}</strong>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{p.months}</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.label}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, background: '#fbbf24' }} />
            <span style={{ fontSize: 13 }}>Período Actual</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, background: '#ef4444' }} />
            <span style={{ fontSize: 13 }}>Período Vencido</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, background: '#10b981' }} />
            <span style={{ fontSize: 13 }}>Período Futuro</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#92400e' }}>{summary.current}</div>
          <div style={{ fontSize: 13, color: '#92400e' }}>Período Actual</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#991b1b' }}>{summary.past}</div>
          <div style={{ fontSize: 13, color: '#991b1b' }}>Período Vencido</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#065f46' }}>{summary.future}</div>
          <div style={{ fontSize: 13, color: '#065f46' }}>Período Futuro</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #9ca3af' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#6b7280' }}>{summary.unknown}</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Sin Clasificar</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Análisis de Documentos por Período</h3>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Archivo</th><th>Período</th><th>Categoría</th><th>Descripción</th><th>Costo Unit.</th><th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {analysisData.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>No hay documentos para analizar.</td></tr>
              ) : (
                analysisData.map((doc: any) => (
                  <tr key={doc.id} style={getRowStyle(doc.status)}>
                    <td style={{ fontSize: 13 }}>{truncate(doc.filename, 40)}</td>
                    <td>{doc.periodo || <span style={{ color: '#9ca3af' }}>No definido</span>}</td>
                    <td>{doc.periodCategory ? <strong>{doc.periodCategory}</strong> : <span style={{ color: '#9ca3af' }}>-</span>}</td>
                    <td title={doc.descripcion}>{truncate(doc.descripcion, 80) || '-'}</td>
                    <td>{formatCurrency(doc.costo_unitario)}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500, ...getStatusStyle(doc.status) }}>
                        {getStatusIcon(doc.status)}
                        {STATUS_LABELS[doc.status] || 'Sin definir'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
