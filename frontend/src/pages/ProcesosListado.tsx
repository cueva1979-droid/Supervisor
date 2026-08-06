import { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Trash2, RefreshCw, CheckCircle, AlertCircle, Loader, Search } from 'lucide-react';
import { API_BASE } from '../services/config';
import { getCsrfToken } from '../services/auth';
import CanEdit from '../components/CanEdit';

function csrfHeaders(method?: string): Record<string, string> {
  const m = (method || 'GET').toUpperCase();
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return {};
  const csrf = getCsrfToken();
  return csrf ? { 'X-CSRF-Token': csrf } : {};
}

interface CAMExtraction {
  id: string;
  filename: string;
  codigo_proceso: string | null;
  administrador_contrato_actual: string | null;
  objeto_proceso: string | null;
  estado_proceso: string | null;
  fecha_publicacion: string;
  fecha_procesamiento: string;
}

export default function ProcesosListado() {
  const [extractions, setExtractions] = useState<CAMExtraction[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lastResult, setLastResult] = useState<CAMExtraction | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchExtractions = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/cam/extractions`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error al cargar extracciones');
      const data = await res.json();
      setExtractions(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExtractions();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setLastResult(null);
    setError('');
    setSuccess('');
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Seleccione un archivo PDF');
      return;
    }
    setUploading(true);
    setError('');
    setSuccess('');
    setLastResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch(`${API_BASE}/cam/extract`, {
        method: 'POST',
        credentials: 'include',
        headers: csrfHeaders('POST'),
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al procesar PDF');
      setLastResult(data);
      const total = data.procesos_creados || 1;
      setSuccess(`PDF procesado exitosamente: ${total} registro(s) creado(s)`);
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = '';
      fetchExtractions();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/cam/extractions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: csrfHeaders('DELETE'),
      });
      if (!res.ok) throw new Error('Error al eliminar');
      setSuccess('Extracción eliminada');
      fetchExtractions();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>CAM - Cambio de Administrador de Contrato</h2>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
          Extraiga datos de documentos PDF del sistema de contratación pública
        </p>
      </div>

      {error && (
        <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', marginBottom: 16 }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 8, background: '#f0fdf4', color: '#16a34a', marginBottom: 16 }}>
          <CheckCircle size={18} /> {success}
        </div>
      )}

      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Upload size={18} /> Cargar documento CAM
        </h3>
        <CanEdit>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              style={{ flex: 1, minWidth: 200, padding: 8, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-card)' }}
            />
            <button className="btn-primary" onClick={handleUpload} disabled={uploading || !selectedFile} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {uploading ? <Loader size={16} className="spin" /> : <Upload size={16} />}
              {uploading ? 'Procesando...' : 'Extraer Datos'}
            </button>
          </div>
        </CanEdit>
      </div>

      {lastResult && (
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={18} color="#16a34a" /> Resultado de la Extracción
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Código del Proceso</label>
              <p style={{ margin: '4px 0', fontSize: 14, fontWeight: 600, fontFamily: 'monospace' }}>{lastResult.codigo_proceso || <span style={{ color: '#999' }}>null</span>}</p>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Estado del Proceso</label>
              <p style={{ margin: '4px 0', fontSize: 14 }}>
                <span className={`badge badge-${lastResult.estado_proceso?.toLowerCase().includes('ejecuci') ? 'success' : 'info'}`}>
                  {lastResult.estado_proceso || <span style={{ color: '#999' }}>null</span>}
                </span>
              </p>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Administrador de Contrato Actual</label>
              <p style={{ margin: '4px 0', fontSize: 14 }}>{lastResult.administrador_contrato_actual || <span style={{ color: '#999' }}>null</span>}</p>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Objeto del Proceso</label>
              <p style={{ margin: '4px 0', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{lastResult.objeto_proceso || <span style={{ color: '#999' }}>null</span>}</p>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} /> Historial de Extracciones
          </h3>
          <button className="btn-secondary" onClick={fetchExtractions} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 13 }}>
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <Loader size={24} className="spin" style={{ marginBottom: 8 }} />
            <p>Cargando...</p>
          </div>
        ) : extractions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <FileText size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p>No hay extracciones registradas</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>Archivo</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>Código Proceso</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>Administrador</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>Estado</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>Fecha</th>
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {extractions.map((ext) => (
                  <tr key={ext.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 12px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ext.filename}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12 }}>{ext.codigo_proceso || '-'}</td>
                    <td style={{ padding: '8px 12px', fontSize: 12 }}>{ext.administrador_contrato_actual || '-'}</td>
                    <td style={{ padding: '8px 12px' }}>
                      {ext.estado_proceso ? (
                        <span className={`badge badge-${ext.estado_proceso.toLowerCase().includes('ejecuci') ? 'success' : 'info'}`}>
                          {ext.estado_proceso}
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {ext.fecha_publicacion || (ext.fecha_procesamiento ? new Date(ext.fecha_procesamiento).toLocaleString() : '-')}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <button
                        className="btn-danger"
                        style={{ padding: '4px 8px', fontSize: 12 }}
                        onClick={() => handleDelete(ext.id)}
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}