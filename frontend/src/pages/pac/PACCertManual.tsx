import { useState, useEffect } from 'react';
import { Download, FileCheck, Search, Database } from 'lucide-react';
import CanEdit from '../../components/CanEdit';
import { pacAPI } from '../../services/pacApi';

const InputField = ({ label, name, type = 'text', options = null, value, onChange }: { label: string; name: string; type?: string; options?: string[] | null; value: any; onChange: (name: string, value: any) => void }) => (
  <div className="form-group">
    <label>{label}</label>
    {options ? (
      <select className="form-select" value={value || ''} onChange={e => onChange(name, e.target.value)}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : (
      <input className="form-input" type={type} value={value || ''} onChange={e => onChange(name, e.target.value)} placeholder={`Ingrese ${label.toLowerCase()}`} />
    )}
  </div>
);

export default function PACCertManual() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    cert_nro: '', anio: new Date().getFullYear().toString(), objeto: '',
    base_legal: 'Que conforme a lo establecido en el Art.-66.- Reglamento de la Ley Orgánica del Sistema de Contratación Pública-LOSNCP.',
    partida: '', cpc: '', tipo_compra: 'Bien',
    tipo_regimen: 'Común', procedimiento: '', valor: '', periodo: 'C1',
    lugar: 'Quito', fecha: new Date().toISOString().split('T')[0],
    elaborado_por: '', cargo: '', aprobado_por: '', cargo_aprobado: '',
    verificacion_catalogo: 'SI'
  });

  const [dbDocuments, setDbDocuments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    pacAPI.getDocuments().then(setDbDocuments).catch(() => {});
  }, []);

  const filteredDocs = dbDocuments.filter(doc =>
    doc.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.cpc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.partida_presupuestaria?.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 5);

  const handleSelectDocument = (doc: any) => {
    setFormData(prev => ({
      ...prev,
      partida: doc.partida_presupuestaria || '',
      cpc: doc.cpc || '',
      tipo_compra: doc.tipo_compra || 'Bien',
      tipo_regimen: doc.tipo_regimen || 'Común',
      procedimiento: doc.procedimiento || '',
      valor: doc.costo_unitario || '',
      periodo: doc.periodo || 'C1',
      objeto: doc.descripcion || ''
    }));
    setShowSearchResults(false);
    setSearchTerm('');
  };

  const handleGenerate = async () => {
    if (!formData.cert_nro || !formData.objeto) {
      alert('Complete los campos requeridos: Nro. Certificación y Objeto');
      return;
    }
    setIsGenerating(true);
    try {
      const blob = await pacAPI.generateCustomCert(formData);
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `Certificacion_PAC_${formData.cert_nro}.docx`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (e: any) {
      const errMsg = e?.error || e?.detail || 'Error al generar';
      alert(errMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFieldChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="card" style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ background: '#1e293b', margin: '-24px -24px 24px', padding: 20, borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <FileCheck size={28} color="#fff" />
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Formulario de Certificación PAC</h2>
          <p style={{ fontSize: 12, color: '#94a3b8' }}>Gestión Presupuestaria Oficial</p>
        </div>
      </div>

      <div style={{ marginBottom: 24, position: 'relative' }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <Database size={12} /> Buscar en Base de Datos PAC
        </label>
        <div className="search-bar" style={{ maxWidth: '100%' }}>
          <Search size={16} />
          <input type="text" placeholder="Buscar por descripción, CPC o partida..." value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setShowSearchResults(true); }}
            onFocus={() => setShowSearchResults(true)} />
        </div>
        {showSearchResults && searchTerm.length > 0 && (
          <div style={{ position: 'absolute', zIndex: 100, width: '100%', marginTop: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 10px 40px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            {filteredDocs.length > 0 ? filteredDocs.map(doc => (
              <button key={doc.id} onClick={() => handleSelectDocument(doc)}
                style={{ width: '100%', padding: 12, textAlign: 'left', border: 'none', borderBottom: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', marginBottom: 4 }}>{doc.partida_presupuestaria} | {doc.cpc}</div>
                <div style={{ fontSize: 13 }}>{doc.descripcion}</div>
              </button>
            )) : (
              <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>Sin resultados</div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <InputField label="Nro. Certificación *" name="cert_nro" value={formData.cert_nro} onChange={handleFieldChange} />
        <InputField label="Año Fiscal" name="anio" type="number" value={formData.anio} onChange={handleFieldChange} />
        <InputField label="Cuatrimestre" name="periodo" options={['C1', 'C2', 'C3']} value={formData.periodo} onChange={handleFieldChange} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="form-group">
          <label>Objeto de Contratación *</label>
          <textarea className="form-textarea" value={formData.objeto} onChange={e => setFormData({ ...formData, objeto: e.target.value })} placeholder="Descripción detallada..." />
        </div>
        <div className="form-group">
          <label>Base Legal</label>
          <textarea className="form-textarea" value={formData.base_legal} onChange={e => setFormData({ ...formData, base_legal: e.target.value })} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <InputField label="Partida" name="partida" value={formData.partida} onChange={handleFieldChange} />
        <InputField label="CPC" name="cpc" value={formData.cpc} onChange={handleFieldChange} />
        <InputField label="Tipo Compra" name="tipo_compra" options={['Bien', 'Servicio', 'Obra', 'Consultoría']} value={formData.tipo_compra} onChange={handleFieldChange} />
        <InputField label="Régimen" name="tipo_regimen" options={['Común', 'Especial']} value={formData.tipo_regimen} onChange={handleFieldChange} />
        <InputField label="Procedimiento" name="procedimiento" value={formData.procedimiento} onChange={handleFieldChange} />
        <InputField label="Valor Estimado ($)" name="valor" type="number" value={formData.valor} onChange={handleFieldChange} />
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <InputField label="Lugar" name="lugar" value={formData.lugar} onChange={handleFieldChange} />
          <InputField label="Fecha" name="fecha" type="date" value={formData.fecha} onChange={handleFieldChange} />
          <InputField label="CONSTA PAC" name="verificacion_catalogo" options={['SI', 'NO']} value={formData.verificacion_catalogo} onChange={handleFieldChange} />
          <InputField label="Elaborado por" name="elaborado_por" value={formData.elaborado_por} onChange={handleFieldChange} />
          <InputField label="Cargo Elaborador" name="cargo" value={formData.cargo} onChange={handleFieldChange} />
          <InputField label="Aprobado por" name="aprobado_por" value={formData.aprobado_por} onChange={handleFieldChange} />
          <InputField label="Cargo Aprobador" name="cargo_aprobado" value={formData.cargo_aprobado} onChange={handleFieldChange} />
        </div>
      </div>

      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <CanEdit>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={isGenerating} style={{ padding: '12px 32px' }}>
            {isGenerating ? 'Generando...' : <><Download size={20} /> GENERAR CERTIFICACIÓN</>}
          </button>
        </CanEdit>
      </div>
    </div>
  );
}
