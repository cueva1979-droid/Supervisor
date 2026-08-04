import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { FileSearch, Upload, Search, Plus, Trash2, Download, FileText, Save, RefreshCw, CheckCircle2, AlertCircle, FilePlus, Square, CheckSquare } from 'lucide-react';
import CanEdit from '../../components/CanEdit';
import { pacAPI } from '../../services/pacApi';

export default function PACCPCBuscador() {
  const [data, setData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [addedRows, setAddedRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadLoadedData = async () => {
    try {
      const items = await pacAPI.getCPCLoaded();
      if (Array.isArray(items)) {
        setData(items.map((item: any, idx: number) => ({
          id: idx,
          cpc: item.cpc,
          descripcion: item.descripcion || '',
          umbral: item.umbral || 0,
        })));
      }
    } catch {
      /* ignore */
    }
  };

  const loadCatalog = async () => {
    try {
      const items = await pacAPI.getCPCCatalog();
      if (Array.isArray(items)) setAddedRows(items);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadLoadedData(), loadCatalog()]).finally(() => setLoading(false));
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        if (!bstr) return;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws) as any[];
        if (rawData.length === 0) {
          setSaveStatus({ type: 'error', message: 'El archivo no contiene datos.' });
          setData([]);
          return;
        }
        const keys = Object.keys(rawData[0]);
        const normalizedKeys = keys.map(k => k.trim().toLowerCase());
        const findKey = (patterns: string[]): string | undefined => {
          const idx = normalizedKeys.findIndex(k => patterns.some(p => k.includes(p)));
          return idx >= 0 ? keys[idx] : undefined;
        };
        const cpcKey = findKey(['cpc', 'codigo', 'código', 'partida', 'code', 'identificador', 'id', 'producto']);
        const descKey = findKey(['descrip', 'nombre', 'concepto', 'descripción', 'descricao']);
        const umbralKey = findKey(['umbral', 'valor', 'monto', 'importe', 'precio', 'threshold']);
        if (!cpcKey) {
          setSaveStatus({ type: 'error', message: `No se encontró una columna de código CPC. Columnas detectadas: ${keys.join(', ')}` });
          setData([]);
          return;
        }
        const mappedData = rawData.map((row: any) => ({
          cpc: String(row[cpcKey] || '').trim(),
          descripcion: String(row[descKey ?? ''] || '').trim(),
          umbral: parseFloat(String(row[umbralKey ?? ''] || '0').replace(/[^0-9.,\-]/g, '').replace(',', '.')) || 0
        })).filter((item: any) => item.cpc);
        await pacAPI.saveCPCLoaded(mappedData);
        await loadLoadedData();
        setSaveStatus({ type: 'info', message: `Se cargaron ${mappedData.length} registros.` });
      } catch (err) {
        setSaveStatus({ type: 'error', message: 'Error al procesar el archivo.' });
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredData = data.filter(item =>
    String(item.cpc).toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(item.descripcion).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedRows(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === filteredData.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(filteredData.map(item => item.id)));
  };

  const handleAdd = async () => {
    const toAdd = data.filter(item => selectedRows.has(item.id));
    if (toAdd.length === 0) return;
    setLoading(true);
    try {
      const newAdded = [...addedRows];
      const itemsToSave: any[] = [];
      toAdd.forEach(item => {
        if (!newAdded.find(a => a.cpc === item.cpc)) {
          newAdded.push(item);
          itemsToSave.push(item);
        }
      });
      if (itemsToSave.length > 0) {
        await pacAPI.bulkSaveCPC(itemsToSave);
        setAddedRows(newAdded);
        for (const item of itemsToSave) {
          try { await pacAPI.deleteCPCLoaded(item.cpc); } catch { /* ignore */ }
        }
        await loadLoadedData();
      }
      setSelectedRows(new Set());
      setSaveStatus({ type: 'success', message: `${itemsToSave.length} registros guardados.` });
    } catch (err) {
      setSaveStatus({ type: 'error', message: 'Error al guardar.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (cpc: string) => {
    try {
      await pacAPI.deleteCPC(cpc);
      setAddedRows(addedRows.filter(item => item.cpc !== cpc));
    } catch (err) {
      setSaveStatus({ type: 'error', message: 'Error al eliminar.' });
    }
  };

  const handleClearCatalog = async () => {
    if (!window.confirm('¿Vaciar todo el catálogo?')) return;
    setLoading(true);
    try {
      await pacAPI.deleteAllCPC();
      setAddedRows([]);
    } catch (err) {
      setSaveStatus({ type: 'error', message: 'Error al vaciar.' });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (addedRows.length === 0) return;
    const csv = '\uFEFF' + ['CPC,Descripción,Umbral', ...addedRows.map(i => `${i.cpc},"${(i.descripcion || '').replace(/"/g, '""')}",${i.umbral}`)].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'CPC_Exportados.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const clearTempData = async () => {
    setData([]); setSearchTerm(''); setSelectedRows(new Set());
    try { await pacAPI.clearCPCLoaded(); } catch { /* ignore */ }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileSearch size={24} color="#059669" /> Gestor de Códigos CPC
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Busque, seleccione y gestione códigos CPC desde archivos Excel.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} style={{ display: 'none' }} ref={fileInputRef} />
          <CanEdit>
            <button className="btn btn-ghost btn-sm" onClick={() => fileInputRef.current?.click()}><FilePlus size={14} /> Nuevo archivo</button>
          </CanEdit>
          <CanEdit>
            <button className="btn btn-success btn-sm" disabled={addedRows.length === 0 || loading} onClick={async () => {
            setLoading(true);
            try { await pacAPI.bulkSaveCPC(addedRows); setSaveStatus({ type: 'success', message: 'Guardado.' }); } catch { setSaveStatus({ type: 'error', message: 'Error.' }); } finally { setLoading(false); }
          }}>{loading ? <RefreshCw size={14} /> : <Save size={14} />} Guardar</button>
          </CanEdit>
        </div>
      </div>

      {saveStatus.message && (
        <div style={{ marginBottom: 12, padding: '8px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
          background: saveStatus.type === 'success' ? '#f0fdf4' : saveStatus.type === 'error' ? '#fef2f2' : '#eff6ff',
          color: saveStatus.type === 'success' ? '#166534' : saveStatus.type === 'error' ? '#991b1b' : '#1e40af', border: '1px solid',
          borderColor: saveStatus.type === 'success' ? '#bbf7d0' : saveStatus.type === 'error' ? '#fecaca' : '#bfdbfe' }}>
          {saveStatus.type === 'success' ? <CheckCircle2 size={16} /> : saveStatus.type === 'error' ? <AlertCircle size={16} /> : <RefreshCw size={16} />}
          {saveStatus.message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className="card">
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div className="search-bar" style={{ flex: 1, maxWidth: '100%' }}>
              <Search size={16} />
              <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <CanEdit>
              <button className="btn btn-success btn-sm" disabled={selectedRows.size === 0} onClick={handleAdd}>
                <Plus size={14} /> Añadir ({selectedRows.size})
              </button>
            </CanEdit>
          </div>

          {data.length > 0 ? (
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}><button onClick={toggleSelectAll} className="btn-icon">{selectedRows.size === filteredData.length && filteredData.length > 0 ? <CheckSquare size={16} color="#059669" /> : <Square size={16} />}</button></th>
                    <th>CPC</th><th>Descripción</th><th>Umbral</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map(item => (
                    <tr key={item.id} onClick={() => toggleSelect(item.id)} style={{ cursor: 'pointer', background: selectedRows.has(item.id) ? 'rgba(16,185,129,0.1)' : undefined }}>
                      <td>{selectedRows.has(item.id) ? <CheckSquare size={16} color="#059669" /> : <Square size={16} />}</td>
                      <td style={{ fontFamily: 'monospace' }}>{item.cpc}</td>
                      <td style={{ fontSize: 13 }}>{item.descripcion}</td>
                      <td>${Number(item.umbral).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>
              <FileText size={40} style={{ opacity: 0.4, marginBottom: 8 }} />
              <p>No hay datos cargados. Suba un archivo Excel.</p>
            </div>
          )}
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)' }}>
            <span>{filteredData.length} de {data.length} registros</span>
            {data.length > 0 && <CanEdit><button className="btn-icon" onClick={clearTempData}><Trash2 size={14} color="#ef4444" /> Limpiar</button></CanEdit>}
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontWeight: 700 }}>Catálogo Guardado <span className="badge" style={{ background: 'var(--bg)' }}>{addedRows.length}</span></h3>
            <button className="btn-icon" onClick={handleExport} disabled={addedRows.length === 0} title="Exportar"><Download size={16} color="#059669" /></button>
          </div>
          {addedRows.length > 0 ? (
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {addedRows.map(item => (
                <div key={item.cpc} style={{ padding: 8, marginBottom: 4, background: 'var(--bg)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: '#059669' }}>{item.cpc}</span>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.descripcion}</p>
                  </div>
                  <CanEdit><button className="btn-icon" onClick={() => handleRemove(item.cpc)}><Trash2 size={14} color="#ef4444" /></button></CanEdit>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)', fontSize: 13 }}>Añada registros al catálogo</div>
          )}
          {addedRows.length > 0 && (
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <CanEdit><button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={handleClearCatalog}>Vaciar catálogo</button></CanEdit>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
