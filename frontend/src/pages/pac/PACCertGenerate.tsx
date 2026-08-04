import { useState, useEffect } from 'react';
import { FileText, Download, Search, Edit3, ArrowLeft, Trash2 } from 'lucide-react';
import { pacAPI } from '../../services/pacApi';
import CanEdit from '../../components/CanEdit';

function truncate(text: string | null | undefined, max = 60): string {
  if (!text) return '';
  return String(text).length > max ? String(text).slice(0, max - 1) + '…' : String(text);
}

export default function PACCertGenerate() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [manualData, setManualData] = useState<any>({});

  useEffect(() => { loadDocuments(); }, []);

  const loadDocuments = async () => {
    try {
      const data = await pacAPI.getDocuments();
      setDocuments(data);
    } catch (err) {
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedDocs(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  const handleManualEdit = () => {
    if (selectedDocs.length !== 1) { alert('Seleccione exactamente un registro'); return; }
    const doc = documents.find(d => d.id === selectedDocs[0]);
    if (!doc) return;
    setManualData({
      partida: doc.partida_presupuestaria || '', cpc: doc.cpc || '',
      descripcion: doc.descripcion || '', tipo_compra: doc.tipo_compra || '',
      tipo_regimen: doc.tipo_regimen || '', procedimiento: doc.procedimiento || '',
      costo_unitario: doc.costo_unitario?.toString() || '0.00', periodo: doc.periodo || ''
    });
    setIsEditMode(true);
  };

  const generateManualCertificate = async () => {
    try {
      const blob = await pacAPI.generateCustomCert(manualData);
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `Certificado_Manual_${manualData.cpc}.docx`;
      link.click();
      URL.revokeObjectURL(link.href);
      setIsEditMode(false);
      setSelectedDocs([]);
    } catch (e: any) {
      alert(e?.error || 'Error al generar certificado');
    }
  };

  const generateCertificates = async () => {
    if (selectedDocs.length === 0) return;
    for (const docId of selectedDocs) {
      window.open(pacAPI.generateCertUrl(docId), '_blank');
      await new Promise(r => setTimeout(r, 500));
    }
    setSelectedDocs([]);
  };

  const filteredDocuments = documents.filter(doc =>
    doc.cpc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isEditMode) {
    return (
      <div>
        <button onClick={() => setIsEditMode(false)} className="btn btn-ghost" style={{ marginBottom: 16 }}>
          <ArrowLeft size={16} /> Volver
        </button>
        <div className="card">
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>Personalizar Certificado PAC</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { key: 'partida', label: 'Partida Presupuestaria' },
              { key: 'cpc', label: 'Código CPC' },
              { key: 'tipo_compra', label: 'Tipo de Compra' },
              { key: 'procedimiento', label: 'Procedimiento' },
              { key: 'costo_unitario', label: 'Costo Unitario' },
              { key: 'periodo', label: 'Período' },
            ].map(f => (
              <div key={f.key} className="form-group">
                <label>{f.label}</label>
                <input className="form-input" value={manualData[f.key] || ''} onChange={e => setManualData({ ...manualData, [f.key]: e.target.value })} />
              </div>
            ))}
            <div style={{ gridColumn: '1 / -1' }} className="form-group">
              <label>Descripción</label>
              <textarea className="form-textarea" value={manualData.descripcion || ''} onChange={e => setManualData({ ...manualData, descripcion: e.target.value })} />
            </div>
          </div>
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <CanEdit><button className="btn btn-primary" onClick={generateManualCertificate}>
              <Download size={16} /> Descargar Certificado
            </button></CanEdit>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>Cargando...</div>;

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={22} color="#2563eb" /> Certificado PAC
          </h2>
          <CanEdit><button className="btn btn-danger btn-sm" onClick={async () => { if (confirm('¿Borrar historial?')) await pacAPI.deleteAllCertificates(); }}>
            <Trash2 size={14} /> Borrar Historial
          </button></CanEdit>
        </div>

        <div className="search-bar" style={{ marginBottom: 16 }}>
          <Search size={16} />
          <input type="text" placeholder="Buscar registro para certificar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th>Partida</th><th>CPC</th><th>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map(doc => (
                <tr key={doc.id} onClick={() => toggleSelect(doc.id)} style={{ cursor: 'pointer', background: selectedDocs.includes(doc.id) ? 'rgba(37,99,235,0.08)' : undefined }}>
                  <td><input type="checkbox" checked={selectedDocs.includes(doc.id)} readOnly style={{ width: 16, height: 16 }} /></td>
                  <td>{doc.partida_presupuestaria}</td>
                  <td>{doc.cpc}</td>
                  <td>{truncate(doc.descripcion, 80)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <CanEdit><button className="btn btn-ghost" disabled={selectedDocs.length !== 1} onClick={handleManualEdit}>
            <Edit3 size={16} /> Editar y Crear
          </button></CanEdit>
          <CanEdit><button className="btn btn-primary" disabled={selectedDocs.length === 0} onClick={generateCertificates}>
            <Download size={16} /> Descarga Directa ({selectedDocs.length})
          </button></CanEdit>
        </div>
      </div>
    </div>
  );
}
