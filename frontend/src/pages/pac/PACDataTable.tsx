import { useState, useEffect, useMemo } from 'react';
import { Search, Edit2, Trash2, Download, Filter, X, Award } from 'lucide-react';
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

const fields = [
  { key: 'partida_presupuestaria', label: 'Partida' },
  { key: 'cpc', label: 'CPC' },
  { key: 'tipo_compra', label: 'Tipo Compra' },
  { key: 'tipo_regimen', label: 'Tipo Régimen' },
  { key: 'procedimiento', label: 'Procedimiento' },
  { key: 'descripcion', label: 'Descripción' },
  { key: 'costo_unitario', label: 'Costo Unit.' },
  { key: 'periodo', label: 'Período' },
];

export default function PACDataTable() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterField, setFilterField] = useState('all');
  const [filterValue, setFilterValue] = useState('');
  const [editingDoc, setEditingDoc] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

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

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar este documento?')) return;
    try {
      await pacAPI.deleteDocument(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      alert('Error al eliminar el documento');
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('¿ESTÁ ABSOLUTAMENTE SEGURO? Esta acción eliminará TODOS los registros.')) return;
    try {
      await pacAPI.deleteAllDocuments();
      setDocuments([]);
    } catch (err) {
      alert('Error al eliminar los registros');
    }
  };

  const handleEdit = (doc: any) => {
    setEditingDoc(doc.id);
    setEditForm({
      partida_presupuestaria: doc.partida_presupuestaria || '',
      cpc: doc.cpc || '',
      tipo_compra: doc.tipo_compra || '',
      tipo_regimen: doc.tipo_regimen || '',
      procedimiento: doc.procedimiento || '',
      descripcion: doc.descripcion || '',
      costo_unitario: doc.costo_unitario || '',
      periodo: doc.periodo || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingDoc) return;
    try {
      await pacAPI.updateDocument(editingDoc, editForm);
      setDocuments(prev => prev.map(d => d.id === editingDoc ? { ...d, ...editForm } : d));
      setEditingDoc(null);
    } catch (err) {
      alert('Error al actualizar el documento');
    }
  };

  const handleGenerate = (id: string) => {
    window.open(pacAPI.generateCertUrl(id), '_blank');
  };

  const handleExport = () => {
    const headers = ['Archivo', 'Fecha Carga', 'Partida Presupuestaria', 'CPC', 'Tipo de Compra', 'Tipo de Régimen', 'Procedimiento', 'Descripción', 'Costo Unitario', 'Período'];
    const escape = (val: any) => {
      if (val === null || val === undefined) return '';
      const s = String(val);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const rows = filteredDocuments.map(d => [d.filename, d.upload_date, d.partida_presupuestaria, d.cpc, d.tipo_compra, d.tipo_regimen, d.procedimiento, d.descripcion, d.costo_unitario, d.periodo].map(escape).join(','));
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `PAC_Documentos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const filteredDocuments = useMemo(() => documents.filter(doc => {
    const matchesSearch = searchTerm === '' || Object.values(doc).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterField === 'all' || filterValue === '' || String(doc[filterField]).toLowerCase().includes(filterValue.toLowerCase());
    return matchesSearch && matchesFilter;
  }), [documents, searchTerm, filterField, filterValue]);

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>Cargando...</div>;

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Tabla de Documentos PAC</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <CanEdit><button className="btn btn-danger btn-sm" onClick={handleDeleteAll}><Trash2 size={14} /> Eliminar Todo</button></CanEdit>
            <button className="btn btn-success btn-sm" onClick={handleExport}><Download size={14} /> CSV</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ maxWidth: 300 }}>
            <Search size={16} />
            <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={filterField} onChange={e => setFilterField(e.target.value)}>
            <option value="all">Todos los campos</option>
            {fields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
          {filterField !== 'all' && (
            <input className="form-input" style={{ width: 200 }} placeholder="Valor..." value={filterValue} onChange={e => setFilterValue(e.target.value)} />
          )}
          {(searchTerm || filterValue) && (
            <button className="btn-icon" onClick={() => { setSearchTerm(''); setFilterValue(''); }}><X size={16} /></button>
          )}
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
          Mostrando {filteredDocuments.length} de {documents.length} documento(s)
        </p>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Archivo</th><th>Partida</th><th>CPC</th><th>Tipo Compra</th><th>Procedimiento</th><th>Descripción</th><th>Costo Unit.</th><th>Período</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>No se encontraron documentos</td></tr>
              ) : (
                filteredDocuments.map(doc => (
                  <tr key={doc.id}>
                    <td style={{ fontSize: 13 }}>{truncate(doc.filename, 40)}</td>
                    <td>{doc.partida_presupuestaria || '-'}</td>
                    <td>{doc.cpc || '-'}</td>
                    <td>{doc.tipo_compra || '-'}</td>
                    <td>{doc.procedimiento || '-'}</td>
                    <td title={doc.descripcion}>{truncate(doc.descripcion, 80) || '-'}</td>
                    <td>{formatCurrency(doc.costo_unitario)}</td>
                    <td>{doc.periodo || '-'}</td>
                    <td>
                      <div className="table-actions">
                        <button className="btn-icon" onClick={() => handleGenerate(doc.id)} title="Certificado"><Award size={16} color="#d97706" /></button>
                        <CanEdit><button className="btn-icon" onClick={() => handleEdit(doc)} title="Editar"><Edit2 size={16} color="#2563eb" /></button></CanEdit>
                        <CanEdit><button className="btn-icon" onClick={() => handleDelete(doc.id)} title="Eliminar"><Trash2 size={16} color="#ef4444" /></button></CanEdit>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingDoc && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Editar Documento</h3>
              <button className="btn-icon" onClick={() => setEditingDoc(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {fields.map(f => (
                  <div key={f.key} className="form-group">
                    <label>{f.label}</label>
                    <input
                      className="form-input"
                      type={f.key === 'costo_unitario' ? 'number' : 'text'}
                      value={editForm[f.key] || ''}
                      onChange={e => setEditForm((prev: any) => ({ ...prev, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setEditingDoc(null)}>Cancelar</button>
              <CanEdit><button className="btn btn-primary" onClick={handleSaveEdit}>Guardar</button></CanEdit>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
