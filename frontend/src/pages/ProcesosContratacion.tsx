import { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Trash2, Search, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { API_BASE } from '../services/config';
import { getCsrfToken } from '../services/auth';
import CanEdit from '../components/CanEdit';

function csrfHeaders(method?: string): Record<string, string> {
  const m = (method || 'GET').toUpperCase();
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return {};
  const csrf = getCsrfToken();
  return csrf ? { 'X-CSRF-Token': csrf } : {};
}

interface ProcesoData {
  id: string;
  filename: string;
  codigo: string;
  objeto_proceso: string;
  estado_proceso: string;
  presupuesto_referencial: number | null;
  fecha_publicacion: string;
  fecha_procesamiento: string;
  mensaje?: string;
}

export default function ProcesosContratacion() {
  const [procesos, setProcesos] = useState<ProcesoData[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [lastResult, setLastResult] = useState<ProcesoData | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchProcesos = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/procesos-contratacion/list`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error al cargar procesos');
      const data = await res.json();
      setProcesos(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesos();
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
      const res = await fetch(`${API_BASE}/procesos-contratacion/extract`, {
        method: 'POST',
        credentials: 'include',
        headers: csrfHeaders('POST'),
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al procesar PDF');
      setLastResult(data);
      setSuccess(data.mensaje || 'PDF procesado exitosamente');
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = '';
      fetchProcesos();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este proceso?')) return;
    try {
      const res = await fetch(`${API_BASE}/procesos-contratacion/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: csrfHeaders('DELETE'),
      });
      if (!res.ok) throw new Error('Error al eliminar');
      setSuccess('Proceso eliminado');
      fetchProcesos();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('¿Eliminar todos los procesos? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch(`${API_BASE}/procesos-contratacion-all`, {
        method: 'DELETE',
        credentials: 'include',
        headers: csrfHeaders('DELETE'),
      });
      if (!res.ok) throw new Error('Error al eliminar');
      setSuccess('Todos los procesos fueron eliminados');
      fetchProcesos();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const filteredProcesos = procesos.filter(p =>
    !search || 
    (p.codigo || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.objeto_proceso || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.estado_proceso || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.filename || '').toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(value);
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>Procesos de Contratación</h2>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
          Extraiga datos de documentos PDF de procesos de contratación pública
        </p>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', marginBottom: 16 }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {success && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 8, background: '#f0fdf4', color: '#16a34a', marginBottom: 16 }}>
          <CheckCircle size={18} /> {success}
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Cargar Documento PDF</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            style={{ fontSize: 13 }}
          />
          <button
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
          >
            {uploading ? <><Loader size={14} /> Procesando...</> : <><Upload size={14} /> Extraer Datos</>}
          </button>
          <CanEdit>
            <button
              className="btn btn-danger"
              onClick={handleDeleteAll}
              disabled={procesos.length === 0}
            >
              <Trash2 size={14} /> Eliminar Todos
            </button>
          </CanEdit>
        </div>
        {lastResult && (
          <div style={{ marginTop: 12, padding: 12, background: 'var(--bg)', borderRadius: 8, fontSize: 13 }}>
            <strong>Último resultado:</strong> {lastResult.codigo} - {lastResult.objeto_proceso?.substring(0, 80)}
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
            Procesos Extraídos ({filteredProcesos.length})
          </h3>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-input"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 32, width: 250, fontSize: 13 }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Objeto del Proceso</th>
                  <th>Estado</th>
                  <th>Presupuesto Ref.</th>
                  <th>Fecha Publicación</th>
                  <th>Archivo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProcesos.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>
                      {search ? 'No se encontraron procesos con ese criterio' : 'No hay procesos registrados'}
                    </td>
                  </tr>
                ) : (
                  filteredProcesos.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{p.codigo || '-'}</td>
                      <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.objeto_proceso}>
                        {p.objeto_proceso || '-'}
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 500,
                          background: p.estado_proceso?.includes('Ejecución') || p.estado_proceso?.includes('Ejecucion') ? '#dbeafe' :
                                     p.estado_proceso?.includes('Finalizado') ? '#d1fae5' :
                                     p.estado_proceso?.includes('Publicado') ? '#fef3c7' : '#f3f4f6',
                          color: p.estado_proceso?.includes('Ejecución') || p.estado_proceso?.includes('Ejecucion') ? '#1e40af' :
                                p.estado_proceso?.includes('Finalizado') ? '#065f46' :
                                p.estado_proceso?.includes('Publicado') ? '#92400e' : '#6b7280',
                        }}>
                          {p.estado_proceso || 'Sin estado'}
                        </span>
                      </td>
                      <td>{formatCurrency(p.presupuesto_referencial)}</td>
                      <td>{p.fecha_publicacion || '-'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.filename || '-'}</td>
                      <td>
                        <CanEdit>
                          <button
                            className="btn-icon"
                            title="Eliminar"
                            onClick={() => handleDelete(p.id)}
                            style={{ color: 'var(--danger)' }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </CanEdit>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
