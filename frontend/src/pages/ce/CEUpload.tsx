import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { ceUploadFile, ceListExtractions, CEExtraction } from '../../services/ceApi';
import CanEdit from '../../components/CanEdit';

interface Props {
  onExtractionsChange: () => void;
}

export default function CEUpload({ onExtractionsChange }: Props) {
  const [files, setFiles] = useState<{ file: File; status: 'pending' | 'processing' | 'done' | 'error'; result?: CEExtraction; error?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((f) => ({ file: f, status: 'pending' as const }));
      setFiles((prev) => [...prev, ...newFiles]);
    }
    e.target.value = '';
  };

  const processAll = async () => {
    setLoading(true);
    const pending = files.filter((f) => f.status === 'pending');
    for (let i = 0; i < pending.length; i++) {
      const idx = files.indexOf(pending[i]);
      setFiles((prev) => {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], status: 'processing' };
        return copy;
      });
      try {
        const result = await ceUploadFile(pending[i].file);
        setFiles((prev) => {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], status: 'done', result };
          return copy;
        });
      } catch (err: any) {
        setFiles((prev) => {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], status: 'error', error: err.message };
          return copy;
        });
      }
    }
    setLoading(false);
    onExtractionsChange();
  };

  const clearAll = () => {
    setFiles([]);
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'processing') return <Loader size={18} className="spin" style={{ color: '#2E75B6' }} />;
    if (status === 'done') return <CheckCircle size={18} style={{ color: '#27AE60' }} />;
    if (status === 'error') return <AlertCircle size={18} style={{ color: '#E74C3C' }} />;
    return <FileText size={18} style={{ color: '#7F8C8D' }} />;
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>Cargar PDF - Catálogo Electrónico</h2>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
          Seleccione archivos PDF de Órdenes de Compra para extraer sus datos
        </p>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <CanEdit>
          <div
            className="dropzone"
            style={{
              border: '2px dashed var(--border)',
              borderRadius: 12,
              padding: 40,
              textAlign: 'center',
              cursor: 'pointer',
              background: 'var(--bg-card)',
            }}
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={40} style={{ color: 'var(--primary)', marginBottom: 12 }} />
            <p style={{ margin: '0 0 4px', fontWeight: 600 }}>Haga clic para seleccionar archivos PDF</p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Solo archivos PDF de Órdenes de Compra SERCOP</p>
            <input ref={inputRef} type="file" accept=".pdf" multiple onChange={handleSelect} style={{ display: 'none' }} />
          </div>
        </CanEdit>
      </div>

      {files.length > 0 && (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>{files.length} archivo(s)</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <CanEdit>
                <button className="btn-primary" onClick={processAll} disabled={loading}>
                  {loading ? 'Procesando...' : 'Procesar Todo'}
                </button>
              </CanEdit>
              <button className="btn-secondary" onClick={clearAll}>Limpiar</button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {files.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12', background: f.status === 'done' ? '#f0faf0' : f.status === 'error' ? '#fef0f0' : 'var(--bg)', borderRadius: 8 }}>
                <StatusIcon status={f.status} />
                <span style={{ fontSize: 13, flex: 1 }}>{f.file.name}</span>
                {f.status === 'done' && f.result && (
                  <span style={{ fontSize: 12, color: '#27AE60' }}>OC: {f.result.orden_compra || '—'}</span>
                )}
                {f.status === 'error' && (
                  <span style={{ fontSize: 12, color: '#E74C3C' }}>{f.error}</span>
                )}
                {f.status === 'pending' && (
                  <span style={{ fontSize: 12, color: '#7F8C8D' }}>Pendiente</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
