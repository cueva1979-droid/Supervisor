import { useState, useEffect, useMemo } from 'react';
import { CalendarDays, AlertTriangle, Clock, CheckCircle, Pencil, Save, Check, BarChart3 } from 'lucide-react';
import { pacAPI } from '../../services/pacApi';
import { useAuth } from '../../contexts/AuthContext';

const PERIOD_DEFINITIONS: Record<string, { code: string; label: string; months: string }> = {
  C1: { code: 'C1', label: 'Cuatrimestre 1', months: 'Enero - Abril' },
  C2: { code: 'C2', label: 'Cuatrimestre 2', months: 'Mayo - Agosto' },
  C3: { code: 'C3', label: 'Cuatrimestre 3', months: 'Septiembre - Diciembre' },
};

const STATUS_LABELS: Record<string, string> = {
  current: 'Período Actual', past: 'Período Vencido', future: 'Período Futuro', unknown: 'Sin definir',
};

const ESTADOS_EJECUCION = ['En tramite', 'Pendiente', 'En Ejecucion'] as const;

function getEstadoEjecucionStyle(estado: string): React.CSSProperties {
  switch (estado) {
    case 'En Ejecucion': return { background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd' };
    case 'En tramite': return { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' };
    case 'Pendiente': return { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' };
    default: return { background: '#f3f4f6', color: '#6b7280', border: '1px solid #d1d5db' };
  }
}

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
  const { user } = useAuth();
  const canEdit = !!user && user.role !== 'viewer';
  const [analysisData, setAnalysisData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, string>>({});
  const [savedId, setSavedId] = useState<string | null>(null);
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

  const handleSelectChange = (docId: string, nuevoEstado: string) => {
    setPending(prev => ({ ...prev, [docId]: nuevoEstado }));
  };

  const handleSave = async (docId: string) => {
    const nuevoEstado = pending[docId];
    if (!nuevoEstado) return;
    setSavingId(docId);
    try {
      await pacAPI.updateDocument(docId, { estado_ejecucion: nuevoEstado });
      setAnalysisData(prev => prev.map(d => d.id === docId ? { ...d, estado_ejecucion: nuevoEstado } : d));
      setPending(prev => { const n = { ...prev }; delete n[docId]; return n; });
      setSavedId(docId);
      setTimeout(() => setSavedId(null), 2000);
    } catch (err: any) {
      alert(err.message || 'Error al guardar');
    } finally {
      setSavingId(null);
    }
  };

  const handleEstadoChange = async (docId: string, nuevoEstado: string) => {
    // compat: auto-save fallback
    setSavingId(docId);
    try {
      await pacAPI.updateDocument(docId, { estado_ejecucion: nuevoEstado });
      setAnalysisData(prev => prev.map(d => d.id === docId ? { ...d, estado_ejecucion: nuevoEstado } : d));
    } catch (err: any) {
      alert(err.message || 'Error al actualizar estado');
    } finally {
      setSavingId(null);
    }
  };

  const ejecucionSummary = useMemo(() => {
    const c: Record<string, number> = { 'En tramite': 0, 'Pendiente': 0, 'En Ejecucion': 0 };
    analysisData.forEach((d: any) => {
      const e = d.estado_ejecucion || 'Pendiente';
      if (e in c) c[e]++; else c['Pendiente']++;
    });
    const total = analysisData.length || 1;
    return { counts: c, total: analysisData.length, pct: (n: number) => ((n / total) * 100).toFixed(1) };
  }, [analysisData]);

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
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
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

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <BarChart3 size={16} color="#2563eb" /> Reporte por Estado de Ejecución
            <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-secondary)' }}>({ejecucionSummary.total} documentos)</span>
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {ESTADOS_EJECUCION.map(estado => {
              const count = ejecucionSummary.counts[estado] || 0;
              const pct = ejecucionSummary.pct(count);
              return (
                <div key={estado} style={{ padding: 12, borderRadius: 8, textAlign: 'center', ...getEstadoEjecucionStyle(estado) }}>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{count}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{estado}</div>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>{pct}%</div>
                  <div style={{ marginTop: 6, height: 4, background: 'rgba(0,0,0,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'currentColor', opacity: 0.6 }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ marginTop: 8, fontSize: 11, color: 'var(--text-secondary)' }}>
            Actualizado al cambiar el <em>Estado Ejecución</em> en la tabla inferior (requiere <strong>Guardar</strong>).
          </p>
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
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          Análisis de Documentos por Período
          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}><Pencil size={12} /> Editable</span>
        </h3>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Archivo</th><th>Partida</th><th>Período</th><th>Categoría</th><th>Descripción</th><th>Costo Unit.</th><th>Estado Período</th><th>Estado Ejecución</th>
              </tr>
            </thead>
            <tbody>
              {analysisData.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>No hay documentos para analizar.</td></tr>
              ) : (
                analysisData.map((doc: any) => (
                  <tr key={doc.id} style={getRowStyle(doc.status)}>
                    <td style={{ fontSize: 13 }}>{truncate(doc.filename, 40)}</td>
                    <td style={{ fontSize: 13, fontFamily: 'monospace' }}>{doc.partida_presupuestaria || <span style={{ color: '#9ca3af' }}>-</span>}</td>
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
                    <td>
                      {canEdit ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <select
                            value={pending[doc.id] ?? doc.estado_ejecucion ?? 'Pendiente'}
                            onChange={e => handleSelectChange(doc.id, e.target.value)}
                            disabled={savingId === doc.id}
                            style={{ padding: '4px 8px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', minWidth: 130, ...getEstadoEjecucionStyle(pending[doc.id] ?? doc.estado_ejecucion ?? 'Pendiente') }}
                          >
                            {ESTADOS_EJECUCION.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                          {pending[doc.id] !== undefined && pending[doc.id] !== (doc.estado_ejecucion ?? 'Pendiente') && (
                            <button
                              onClick={() => handleSave(doc.id)}
                              disabled={savingId === doc.id}
                              title="Guardar cambio"
                              className="btn btn-primary"
                              style={{ padding: '4px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
                            >
                              <Save size={14} /> {savingId === doc.id ? 'Guardando...' : 'Guardar'}
                            </button>
                          )}
                          {savedId === doc.id && (
                            <span style={{ color: '#065f46', display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12 }}><Check size={14} /> Guardado</span>
                          )}
                        </div>
                      ) : (
                        <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500, ...getEstadoEjecucionStyle(doc.estado_ejecucion || 'Pendiente') }}>
                          {doc.estado_ejecucion || 'Pendiente'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>Opciones: En tramite • Pendiente • En Ejecucion. Seleccione un valor y pulse <strong>Guardar</strong> para persistir el cambio (backend <code>PUT /pac/documents/{"{id}"}</code>).</p>
      </div>
    </div>
  );
}
