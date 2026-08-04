import { useState, useRef, useCallback } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle, Loader, FileText, Trash2, Plus, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { uploadFiles } from '../services/api';
import type { RecordData, ItemData } from '../types';
import CanEdit from '../components/CanEdit';

type FileStatus = { name: string; status: 'pending' | 'processing' | 'success' | 'error'; record?: RecordData; error?: string };

export default function Process() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);
  const [processing, setProcessing] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<RecordData | null>(null);
  const [editMode, setEditMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const handleFiles = useCallback((fileList: FileList) => {
    setFiles(fileList);
    setFileStatuses(Array.from(fileList).map((f) => ({ name: f.name, status: 'pending' })));
    setCurrentRecord(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleProcess = async () => {
    if (!files || files.length === 0) return;
    setProcessing(true);
    setFileStatuses((prev) => prev.map((f) => ({ ...f, status: 'processing' as const })));
    try {
      const results = await uploadFiles(Array.from(files));
      setFileStatuses(results.map((r: any) => ({
        name: r.filename,
        status: r.status === 'success' ? 'success' : 'error',
        record: r.record,
        error: r.error,
      })));
      const firstSuccess = results.find((r: any) => r.status === 'success');
      if (firstSuccess) setCurrentRecord(firstSuccess.record as RecordData);
    } catch (err: any) {
      setFileStatuses((prev) => prev.map((f) => ({ ...f, status: 'error', error: err.message })));
    } finally {
      setProcessing(false);
    }
  };

  const handleEditItem = (index: number, field: keyof ItemData, value: any) => {
    if (!currentRecord) return;
    const items = [...currentRecord.items];
    items[index] = { ...items[index], [field]: value };
    if (field === 'cantidad' || field === 'precio_unitario') {
      items[index].subtotal = (items[index].cantidad || 0) * (items[index].precio_unitario || 0);
    }
    const total = items.reduce((s, it) => s + it.subtotal, 0);
    setCurrentRecord({ ...currentRecord, items, monto_total: total });
  };

  const handleAddItem = () => {
    if (!currentRecord) return;
    const newItem: ItemData = {
      codigo_cpc: '', descripcion: '', cantidad: 1, unidad: '',
      precio_unitario: 0, subtotal: 0, requires_review: false,
    };
    const items = [...currentRecord.items, newItem];
    setCurrentRecord({ ...currentRecord, items });
  };

  const handleRemoveItem = (index: number) => {
    if (!currentRecord) return;
    const items = currentRecord.items.filter((_, i) => i !== index);
    const total = items.reduce((s, it) => s + it.subtotal, 0);
    setCurrentRecord({ ...currentRecord, items, monto_total: total });
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sortedItems = currentRecord
    ? [...currentRecord.items].sort((a, b) => {
        if (!sortKey) return 0;
        const aVal = (a as any)[sortKey] ?? '';
        const bVal = (b as any)[sortKey] ?? '';
        const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
        return sortAsc ? cmp : -cmp;
      })
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div className="card-header"><Upload size={18} /> Cargar Documentos</div>
        <CanEdit>
          <div
            className={`dropzone${dragOver ? ' active' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <div className="dropzone-icon"><Upload size={48} /></div>
            <div className="dropzone-text">Arrastra tus archivos aquí</div>
            <div className="dropzone-hint">o haz clic para seleccionar (PDF, DOCX)</div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.docx"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </div>
        </CanEdit>
        {fileStatuses.length > 0 && (
          <div className="file-list">
            {fileStatuses.map((fs, i) => (
              <div key={i} className="file-item">
                <div className="file-item-info">
                  <FileText size={18} style={{ color: 'var(--text-secondary)' }} />
                  <span>{fs.name}</span>
                </div>
                <div>
                  {fs.status === 'pending' && <span className="file-item-status processing">Pendiente</span>}
                  {fs.status === 'processing' && <span className="file-item-status processing"><Loader size={14} style={{ display: 'inline', marginRight: 4 }} />Procesando</span>}
                  {fs.status === 'success' && <span className="file-item-status success"><CheckCircle size={14} style={{ display: 'inline', marginRight: 4 }} />Completado</span>}
                  {fs.status === 'error' && <span className="file-item-status error"><AlertCircle size={14} style={{ display: 'inline', marginRight: 4 }} />{fs.error}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <CanEdit>
            <button className="btn btn-primary" onClick={handleProcess} disabled={!files || processing}>
              {processing ? <><Loader size={16} /> Procesando...</> : <><Upload size={16} /> Procesar Documentos</>}
            </button>
          </CanEdit>
        </div>
      </div>

      {currentRecord && (
        <div className="card">
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <span><FileText size={18} /> Datos Extraídos - {currentRecord.filename}</span>
            <CanEdit>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(!editMode)}>
                {editMode ? 'Ver' : 'Editar'}
              </button>
            </CanEdit>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[
              ['Proveedor', 'proveedor'],
              ['RUC', 'ruc'],
              ['Código Proceso', 'codigo_proceso'],
              ['N° Orden', 'numero_orden'],
              ['Fecha', 'fecha'],
              ['Monto Total', 'monto_total'],
            ].map(([label, key]) => (
              <div key={key} className="form-group" style={{ margin: 0 }}>
                <label>{label}</label>
                <input
                  className="form-input"
                  value={editMode ? String((currentRecord as any)[key] ?? '') : String((currentRecord as any)[key] ?? '')}
                  onChange={(e) => setCurrentRecord({ ...currentRecord, [key]: e.target.value })}
                  readOnly={!editMode}
                />
              </div>
            ))}
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Objeto de Contratación</label>
            <textarea
              className="form-textarea"
              value={currentRecord.objeto_contratacion || ''}
              onChange={(e) => setCurrentRecord({ ...currentRecord, objeto_contratacion: e.target.value })}
              readOnly={!editMode}
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600 }}>Ítems</h4>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div className="search-bar" style={{ maxWidth: 200 }}>
                  <Search size={14} />
                  <input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                {editMode && (
                  <CanEdit>
                    <button className="btn btn-primary btn-sm" onClick={handleAddItem}>
                      <Plus size={14} /> Agregar
                    </button>
                  </CanEdit>
                )}
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  {['Código CPC', 'Descripción', 'Cantidad', 'Unidad', 'P. Unitario', 'Subtotal', 'Req. Revisión', ''].map((h, i) => {
                    const keys = ['codigo_cpc', 'descripcion', 'cantidad', 'unidad', 'precio_unitario', 'subtotal', 'requires_review', ''];
                    const k = keys[i];
                    return (
                      <th key={i} onClick={() => k && handleSort(k)} style={{ cursor: k ? 'pointer' : 'default' }}>
                        {h}
                        {sortKey === k && (sortAsc ? <ChevronUp size={12} style={{ display: 'inline', marginLeft: 2 }} /> : <ChevronDown size={12} style={{ display: 'inline', marginLeft: 2 }} />)}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sortedItems
                  .filter((it) => !searchTerm || it.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((item, i) => (
                    <tr key={i}>
                      <td>
                        {editMode
                          ? <input className="form-input" style={{ width: 100, padding: '4px 8px' }} value={item.codigo_cpc} onChange={(e) => handleEditItem(i, 'codigo_cpc', e.target.value)} />
                          : item.codigo_cpc || '-'}
                      </td>
                      <td>
                        {editMode
                          ? <input className="form-input" style={{ padding: '4px 8px' }} value={item.descripcion} onChange={(e) => handleEditItem(i, 'descripcion', e.target.value)} />
                          : item.descripcion || '-'}
                      </td>
                      <td>
                        {editMode
                          ? <input className="form-input" type="number" style={{ width: 80, padding: '4px 8px' }} value={item.cantidad} onChange={(e) => handleEditItem(i, 'cantidad', parseFloat(e.target.value) || 0)} />
                          : item.cantidad}
                      </td>
                      <td>
                        {editMode
                          ? <input className="form-input" style={{ width: 80, padding: '4px 8px' }} value={item.unidad} onChange={(e) => handleEditItem(i, 'unidad', e.target.value)} />
                          : item.unidad || '-'}
                      </td>
                      <td>
                        {editMode
                          ? <input className="form-input" type="number" style={{ width: 100, padding: '4px 8px' }} value={item.precio_unitario} onChange={(e) => handleEditItem(i, 'precio_unitario', parseFloat(e.target.value) || 0)} />
                          : item.precio_unitario.toLocaleString('es-PY', { minimumFractionDigits: 2 })}
                      </td>
                      <td>{item.subtotal.toLocaleString('es-PY', { minimumFractionDigits: 2 })}</td>
                      <td>{item.requires_review ? <span className="badge badge-warning">Revisar</span> : 'No'}</td>
                      <td>
                        {editMode && (
                          <CanEdit>
                            <button className="btn-icon" onClick={() => handleRemoveItem(i)} style={{ color: 'var(--danger)' }}>
                              <Trash2 size={14} />
                            </button>
                          </CanEdit>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
