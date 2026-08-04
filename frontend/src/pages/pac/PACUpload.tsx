import { useState } from 'react';
import { Upload, FileSpreadsheet, FileText, AlertCircle, CheckCircle, Table } from 'lucide-react';
import { pacAPI } from '../../services/pacApi';
import CanEdit from '../../components/CanEdit';

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(value);
}

function truncate(text: string | null | undefined, max = 60): string {
  if (!text) return '';
  return String(text).length > max ? String(text).slice(0, max - 1) + '…' : String(text);
}

export default function PACUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [extractedData, setExtractedData] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    const validExtensions = ['.xlsx', '.xls', '.pdf'];
    const hasValidExtension = validExtensions.some(ext => selectedFile.name.toLowerCase().endsWith(ext));
    if (hasValidExtension) {
      setFile(selectedFile);
      setError(null);
      setUploaded(false);
      setExtractedData(null);
    } else {
      setError('Por favor seleccione un archivo válido (.xlsx, .xls o .pdf)');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const response = await pacAPI.uploadDocument(file);
      if (response.error) {
        setError(response.error + (response.details ? ': ' + response.details : ''));
      } else {
        setExtractedData(response.extractedData || []);
        setUploaded(true);
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar el archivo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Upload size={22} color="#10b981" />
          Cargar Archivo
        </h2>

        <div
          className="dropzone"
          onClick={() => document.getElementById('pac-file-input')?.click()}
          style={{ cursor: 'pointer' }}
        >
          <input
            id="pac-file-input"
            type="file"
            accept=".xlsx,.xls,.pdf"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          {file ? (
            <>
              {file.name.endsWith('.pdf') ? (
                <FileText size={48} style={{ color: 'var(--primary)', marginBottom: 12 }} />
              ) : (
                <FileSpreadsheet size={48} style={{ color: 'var(--primary)', marginBottom: 12 }} />
              )}
              <p className="dropzone-text">{file.name}</p>
              <p className="dropzone-hint">{(file.size / 1024).toFixed(2)} KB</p>
            </>
          ) : (
            <>
              <Upload size={48} className="dropzone-icon" />
              <p className="dropzone-text">Haga clic para seleccionar un archivo</p>
              <p className="dropzone-hint">Formatos soportados: .xlsx, .xls, .pdf</p>
            </>
          )}
        </div>

        {file && !uploaded && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <CanEdit><button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
              {uploading ? (
                <>Procesando...</>
              ) : (
                <><Upload size={16} /> Extraer Información</>
              )}
            </button></CanEdit>
          </div>
        )}

        {error && (
          <div style={{ marginTop: 16, padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, color: '#991b1b' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {extractedData && extractedData.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={22} color="#10b981" />
              Datos Extraídos ({extractedData.length} registros)
            </h3>
          </div>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Partida</th>
                  <th>CPC</th>
                  <th>Tipo Compra</th>
                  <th>Régimen</th>
                  <th>Procedimiento</th>
                  <th>Descripción</th>
                  <th>Costo Unit.</th>
                  <th>Período</th>
                </tr>
              </thead>
              <tbody>
                {extractedData.slice(0, 10).map((doc: any, index: number) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{doc.partida_presupuestaria || '-'}</td>
                    <td>{doc.cpc || '-'}</td>
                    <td>{doc.tipo_compra || '-'}</td>
                    <td>{doc.tipo_regimen || '-'}</td>
                    <td>{doc.procedimiento || '-'}</td>
                    <td title={doc.descripcion}>{truncate(doc.descripcion, 60) || '-'}</td>
                    <td>{formatCurrency(doc.costo_unitario)}</td>
                    <td>{doc.periodo || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {extractedData.length > 10 && (
            <p style={{ marginTop: 12, textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
              Mostrando 10 de {extractedData.length} registros.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
