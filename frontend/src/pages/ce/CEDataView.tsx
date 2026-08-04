import { useState, useEffect, useMemo } from 'react';
import { Download, Trash2, RefreshCw, AlertCircle, Save, X, Edit3, Filter, XCircle } from 'lucide-react';
import CanEdit from '../../components/CanEdit';
import { ceListExtractions, ceDeleteExtraction, ceClearExtractions, ceGetExportExcelUrl, ceExportExcelByIds, ceUpdateExtraction, CEExtraction } from '../../services/ceApi';

export default function CEDataView() {
  const [extractions, setExtractions] = useState<CEExtraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ nombre_comercial: string; razon_social: string }>({ nombre_comercial: '', razon_social: '' });

  const [filterField, setFilterField] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');

  const [error, setError] = useState<string | null>(null);

  const filteredExtractions = useMemo(() => {
    if (!filterField || !filterValue.trim()) return extractions;
    const value = filterValue.trim().toLowerCase();
    return extractions.filter((ext) => {
      if (filterField === 'fecha_aceptacion' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [y, m, d] = value.split('-');
        const normalized = `${d}/${m}/${y}`;
        return (ext.fecha_aceptacion || '').toLowerCase().includes(normalized);
      }
      const fieldValue = (ext as any)[filterField] as string | undefined;
      return (fieldValue || '').toLowerCase().includes(value);
    });
  }, [extractions, filterField, filterValue]);

  const clearFilters = () => {
    setFilterField('');
    setFilterValue('');
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ceListExtractions();
      setExtractions(data);
    } catch (e: any) {
      setError(e.message || 'Error al cargar datos');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    await ceDeleteExtraction(id);
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    load();
  };

  const handleClear = async () => {
    await ceClearExtractions();
    setSelectedIds(new Set());
    load();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const startEdit = (ext: CEExtraction) => {
    setEditing(ext.id);
    setEditForm({ nombre_comercial: ext.nombre_comercial, razon_social: ext.razon_social });
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditForm({ nombre_comercial: '', razon_social: '' });
  };

  const saveEdit = async (id: string) => {
    try {
      await ceUpdateExtraction(id, editForm);
      setEditing(null);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const selectedExtraction = extractions.find((e) => e.id === selected);

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22 }}>Datos Extraídos</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
            {filteredExtractions.length} de {extractions.length} orden(es) procesada(s)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary" onClick={() => ceExportExcelByIds(selectedIds.size > 0 ? Array.from(selectedIds) : undefined)}>
            <Download size={14} /> Exportar Excel
          </button>
          <button className="btn-secondary" onClick={load}>
            <RefreshCw size={14} /> Actualizar
          </button>
          <CanEdit>
            <button className="btn-danger" onClick={handleClear} disabled={extractions.length === 0}>
              <Trash2 size={14} /> Limpiar Todo
            </button>
          </CanEdit>
        </div>
      </div>

      <div className="card" style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500 }}>
          <Filter size={15} /> Filtrar por
        </span>
        <select
          className="form-input"
          value={filterField}
          onChange={(e) => { setFilterField(e.target.value); setFilterValue(''); }}
          style={{ width: 200 }}
        >
          <option value="">Todos</option>
          <option value="orden_compra">Orden de Compra</option>
          <option value="fecha_aceptacion">Fecha</option>
          <option value="nombre_comercial">Nombre Comercial</option>
          <option value="ruc">RUC</option>
        </select>
        <input
          className="form-input"
          type={filterField === 'fecha_aceptacion' ? 'date' : 'text'}
          placeholder={filterField === 'fecha_aceptacion' ? 'Seleccione la fecha' : 'Escriba para filtrar...'}
          value={filterValue}
          onChange={(e) => setFilterValue(e.target.value)}
          disabled={!filterField}
          style={{ width: 260 }}
        />
        {filterField && (
          <button className="btn-ghost btn-sm" onClick={clearFilters} title="Limpiar filtros">
            <XCircle size={14} /> Limpiar
          </button>
        )}
        {filteredExtractions.length === 0 && !loading && extractions.length > 0 && (
          <span style={{ color: 'var(--danger)', fontSize: 13 }}>Sin resultados con el filtro aplicado</span>
        )}
      </div>

      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>
      ) : error ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <AlertCircle size={32} style={{ color: 'var(--danger)', marginBottom: 12 }} />
          <p style={{ color: 'var(--danger)' }}>{error}</p>
        </div>
      ) : filteredExtractions.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <AlertCircle size={32} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <p style={{ color: 'var(--text-muted)' }}>No se encontraron resultados con el filtro aplicado.</p>
          <button className="btn-secondary btn-sm" onClick={clearFilters}>
            <XCircle size={14} /> Limpiar filtros
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 16 }}>
          <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 8px', width: 36 }}>
                    <input type="checkbox" onChange={(e) => { if (e.target.checked) setSelectedIds(new Set(filteredExtractions.map((x) => x.id))); else setSelectedIds(new Set()); }} checked={selectedIds.size === filteredExtractions.length && filteredExtractions.length > 0} />
                  </th>
                  <th style={{ padding: '10px 8px' }}>Orden de Compra</th>
                  <th style={{ padding: '10px 8px' }}>Nombre Comercial</th>
                  <th style={{ padding: '10px 8px' }}>Razón Social</th>
                  <th style={{ padding: '10px 8px' }}>RUC</th>
                  <th style={{ padding: '10px 8px' }}>Descripción</th>
                  <th style={{ padding: '10px 8px' }}>Partida Presup.</th>
                  <th style={{ padding: '10px 8px' }}>Fecha</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>V. Total</th>
                  <th style={{ padding: '10px 8px', width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredExtractions.map((ext) => (
                  <tr
                    key={ext.id}
                    style={{ cursor: 'pointer', background: selected === ext.id ? '#e8f0fe' : undefined }}
                    onClick={() => { setSelected(ext.id); if (editing && editing !== ext.id) cancelEdit(); }}
                  >
                    <td style={{ padding: '8px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(ext.id)} onChange={() => toggleSelect(ext.id)} />
                    </td>
                    <td style={{ padding: '8px', fontWeight: 500 }}>{ext.orden_compra || '—'}</td>
                    <td style={{ padding: '8px' }}>
                      {editing === ext.id ? (
                        <input
                          className="form-input"
                          value={editForm.nombre_comercial}
                          onChange={(e) => setEditForm({ ...editForm, nombre_comercial: e.target.value })}
                          style={{ fontSize: 13, width: '100%', minWidth: 120 }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        ext.nombre_comercial || '—'
                      )}
                    </td>
                    <td style={{ padding: '8px' }}>
                      {editing === ext.id ? (
                        <input
                          className="form-input"
                          value={editForm.razon_social}
                          onChange={(e) => setEditForm({ ...editForm, razon_social: e.target.value })}
                          style={{ fontSize: 13, width: '100%', minWidth: 120 }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        ext.razon_social || '—'
                      )}
                    </td>
                    <td style={{ padding: '8px' }}>{ext.ruc || '—'}</td>
                    <td style={{ padding: '8px', fontSize: 12, maxWidth: 220, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {ext.items.map(it => it.descripcion).filter(Boolean).join(' | ') || '—'}
                    </td>
                    <td style={{ padding: '8px', fontSize: 12 }}>
                      {(() => {
                        const partidas = [...new Set(ext.items.map(it => it.partida_presupuestaria).filter(Boolean))];
                        return partidas.length > 0 ? partidas.join(', ') : '—';
                      })()}
                    </td>
                    <td style={{ padding: '8px' }}>{ext.fecha_aceptacion || '—'}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>${ext.v_total.toLocaleString()}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      {editing === ext.id ? (
                        <span style={{ display: 'inline-flex', gap: 4 }}>
                          <CanEdit>
                            <button className="btn-icon" onClick={() => saveEdit(ext.id)} title="Guardar">
                              <Save size={14} />
                            </button>
                          </CanEdit>
                          <button className="btn-icon" onClick={cancelEdit} title="Cancelar">
                            <X size={14} />
                          </button>
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', gap: 4 }}>
                          <CanEdit>
                            <button className="btn-icon" onClick={() => startEdit(ext)} title="Editar">
                              <Edit3 size={14} />
                            </button>
                          </CanEdit>
                          <CanEdit>
                            <button className="btn-icon" onClick={() => handleDelete(ext.id)} title="Eliminar">
                              <Trash2 size={14} />
                            </button>
                          </CanEdit>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedExtraction && (
            <div className="card" style={{ width: 420, padding: 20, maxHeight: '70vh', overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 15 }}>Detalle de Orden</h3>
                {editing !== selectedExtraction.id && (
                  <CanEdit>
                    <button className="btn-ghost btn-sm" onClick={() => startEdit(selectedExtraction)} title="Editar">
                      <Edit3 size={14} />
                    </button>
                  </CanEdit>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {[
                  ['Orden de Compra', selectedExtraction.orden_compra],
                  ['Fecha de Aceptación', selectedExtraction.fecha_aceptacion],
                  ['Nombre Comercial', selectedExtraction.nombre_comercial, 'nombre_comercial'],
                  ['Razón Social', selectedExtraction.razon_social, 'razon_social'],
                  ['RUC', selectedExtraction.ruc],
                  ['Partida Presupuestaria', [...new Set(selectedExtraction.items.map(it => it.partida_presupuestaria).filter(Boolean))].join(', ') || '—'],
                  ['Administrador', selectedExtraction.administrador],
                ].map(([label, value, field]) => (
                  <div key={label as string}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>{label}</span>
                    {editing === selectedExtraction.id && field ? (
                      <input
                        className="form-input"
                        value={(editForm as any)[field]}
                        onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })}
                        style={{ fontSize: 13, width: '100%', marginTop: 2 }}
                      />
                    ) : (
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{value || '—'}</span>
                    )}
                  </div>
                ))}
                {editing === selectedExtraction.id && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <CanEdit>
                      <button className="btn-primary btn-sm" onClick={() => saveEdit(selectedExtraction.id)}>
                        <Save size={14} /> Guardar
                      </button>
                    </CanEdit>
                    <button className="btn-ghost btn-sm" onClick={cancelEdit}>
                      <X size={14} /> Cancelar
                    </button>
                  </div>
                )}
                {selectedExtraction.objeto_contratacion && (
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Objeto</span>
                    <span style={{ fontSize: 12 }}>{selectedExtraction.objeto_contratacion}</span>
                  </div>
                )}
              </div>
              <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>Ítems ({selectedExtraction.items.length})</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg)' }}>
                    <th style={{ padding: '6px 4px', textAlign: 'left' }}>CPC</th>
                    <th style={{ padding: '6px 4px', textAlign: 'left', minWidth: 200 }}>Descripción</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right' }}>Cant.</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right' }}>V. Unit</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right' }}>Subtotal</th>
                    <th style={{ padding: '6px 4px', textAlign: 'left', minWidth: 140 }}>Partida Presup.</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedExtraction.items.map((it, i) => (
                    <tr key={i}>
                      <td style={{ padding: '4px' }}>{it.cpc}</td>
                      <td style={{ padding: '4px', maxWidth: 220, whiteSpace: 'normal', wordBreak: 'break-word' }}>{it.descripcion}</td>
                      <td style={{ padding: '4px', textAlign: 'right' }}>{it.cantidad}</td>
                      <td style={{ padding: '4px', textAlign: 'right' }}>${it.v_unitario.toFixed(2)}</td>
                      <td style={{ padding: '4px', textAlign: 'right', fontWeight: 600 }}>${it.subtotal.toFixed(2)}</td>
                      <td style={{ padding: '4px', fontSize: 11, wordBreak: 'break-all', maxWidth: 200 }}>{it.partida_presupuestaria}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border)' }}>
                    <td colSpan={5} style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 700 }}>V. TOTAL</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 700 }}>${selectedExtraction.v_total.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
