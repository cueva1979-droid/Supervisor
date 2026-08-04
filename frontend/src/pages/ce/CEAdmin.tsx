import React, { useState, useEffect } from 'react';
import { Users, AlertCircle, RefreshCw, Save, X, Edit3, FileSpreadsheet, ChevronDown, ChevronRight, CheckSquare } from 'lucide-react';
import { ceListExtractions, ceUpdateExtraction, ceExportExcelByAdmin, CEExtraction } from '../../services/ceApi';
import CanEdit from '../../components/CanEdit';

export default function CEAdmin() {
  const [extractions, setExtractions] = useState<CEExtraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ nombre_comercial: string; razon_social: string; administrador: string; estado: string }>({ nombre_comercial: '', razon_social: '', administrador: '', estado: 'En Ejecucion' });

  const load = async () => {
    setLoading(true);
    try {
      const data = await ceListExtractions();
      setExtractions(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startEdit = (ext: CEExtraction) => {
    setEditing(ext.id);
    setEditForm({ nombre_comercial: ext.nombre_comercial, razon_social: ext.razon_social, administrador: ext.administrador || '', estado: ext.estado || 'En Ejecucion' });
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditForm({ nombre_comercial: '', razon_social: '', administrador: '', estado: 'En Ejecucion' });
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

  const grouped: Record<string, CEExtraction[]> = {};
  for (const ext of extractions) {
    const key = ext.administrador || 'Sin asignar';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(ext);
  }

  const adminKeys = Object.keys(grouped).sort();

  const bulkFinalizeByAdmin = async (admin: string) => {
    const pendientes = grouped[admin].filter(e => e.estado !== 'Finalizada');
    if (pendientes.length === 0) return alert('No hay órdenes pendientes por finalizar en este administrador.');
    if (!confirm(`¿Finalizar las ${pendientes.length} órdenes de ${admin}?`)) return;
    setBulkLoading(true);
    try {
      await Promise.all(pendientes.map(e => ceUpdateExtraction(e.id, { estado: 'Finalizada' })));
      load();
    } catch (err: any) {
      alert(err.message);
    }
    setBulkLoading(false);
  };

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22 }}>Administradores de Orden</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
            {extractions.length} orden(es) · {adminKeys.filter(k => k !== 'Sin asignar').length} administrador(es)
          </p>
        </div>
        <button className="btn-secondary" onClick={load}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>
      ) : extractions.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <AlertCircle size={32} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <p style={{ color: 'var(--text-muted)' }}>No hay órdenes procesadas. Cargue archivos PDF desde la sección "Cargar PDF".</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {adminKeys.map((admin) => {
            const orders = grouped[admin];
            const totalAmount = orders.reduce((sum, o) => sum + o.v_total, 0);
            const isExpanded = expanded === admin;

            return (
              <div key={admin} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div
                  style={{
                    padding: '14px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                  }}
                  onClick={() => setExpanded(isExpanded ? null : admin)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: 'var(--primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 16, fontWeight: 700,
                    }}>
                      {admin !== 'Sin asignar' ? admin.charAt(0) : '?'}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{admin}</h3>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                        {orders.length} orden(es) · Total: ${totalAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                    <CanEdit>
                      <button
                        className="btn-icon"
                        onClick={async (e) => { e.stopPropagation(); await bulkFinalizeByAdmin(admin); }}
                        disabled={bulkLoading}
                        title="Finalizar todas las órdenes de este administrador"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 12 }}
                      >
                        <CheckSquare size={14} /> Finalizar
                      </button>
                    </CanEdit>
                    <button
                      className="btn-icon"
                      onClick={async (e) => { e.stopPropagation(); await ceExportExcelByAdmin(admin); }}
                      title="Exportar a Excel"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 12 }}
                    >
                      <FileSpreadsheet size={14} /> Excel
                    </button>
                    <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 500 }}>
                      {isExpanded ? 'Ocultar' : 'Ver órdenes'}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '12px 20px' }}>
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '8px 6px', textAlign: 'left' }}>Orden de Compra</th>
                          <th style={{ padding: '8px 6px', textAlign: 'left' }}>Nombre Comercial</th>
                          <th style={{ padding: '8px 6px', textAlign: 'left' }}>Razón Social</th>
                          <th style={{ padding: '8px 6px', textAlign: 'left' }}>RUC</th>
                          <th style={{ padding: '8px 6px', textAlign: 'left' }}>Administrador</th>
                          <th style={{ padding: '8px 6px', textAlign: 'left' }}>Fecha</th>
                          <th style={{ padding: '8px 6px', textAlign: 'right' }}>V. Total</th>
                          <th style={{ padding: '8px 6px', textAlign: 'center' }}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((ext) => (
                          <React.Fragment key={ext.id}>
                          <tr
                            style={{ cursor: 'pointer', background: expandedOrder === ext.id ? '#f0f4ff' : undefined }}
                            onClick={() => setExpandedOrder(expandedOrder === ext.id ? null : ext.id)}
                          >
                            <td style={{ padding: '8px 6px', fontWeight: 500 }}>
                              {expandedOrder === ext.id ? <ChevronDown size={12} style={{ marginRight: 4 }} /> : <ChevronRight size={12} style={{ marginRight: 4 }} />}
                              {ext.orden_compra || '—'}
                            </td>
                            <td style={{ padding: '8px 6px' }}>
                              {editing === ext.id ? (
                                <input
                                  className="form-input"
                                  value={editForm.nombre_comercial}
                                  onChange={(e) => setEditForm({ ...editForm, nombre_comercial: e.target.value })}
                                  style={{ fontSize: 13, width: '100%', minWidth: 140 }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span>{ext.nombre_comercial || '—'}</span>
                              )}
                            </td>
                            <td style={{ padding: '8px 6px' }}>
                              {editing === ext.id ? (
                                <input
                                  className="form-input"
                                  value={editForm.razon_social}
                                  onChange={(e) => setEditForm({ ...editForm, razon_social: e.target.value })}
                                  style={{ fontSize: 13, width: '100%', minWidth: 140 }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span>{ext.razon_social || '—'}</span>
                              )}
                            </td>
                            <td style={{ padding: '8px 6px' }}>{ext.ruc || '—'}</td>
                            <td style={{ padding: '8px 6px' }}>
                              {editing === ext.id ? (
                                <input
                                  className="form-input"
                                  value={editForm.administrador}
                                  onChange={(e) => setEditForm({ ...editForm, administrador: e.target.value })}
                                  style={{ fontSize: 13, width: '100%', minWidth: 140 }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span>{ext.administrador || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin asignar</span>}</span>
                              )}
                            </td>
                            <td style={{ padding: '8px 6px' }}>{ext.fecha_aceptacion || '—'}</td>
                            <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600 }}>
                              ${ext.v_total.toLocaleString()}
                              {editing !== ext.id && (
                                <CanEdit>
                                  <button
                                    className="btn-icon"
                                    onClick={(e) => { e.stopPropagation(); startEdit(ext); }}
                                    title="Editar"
                                    style={{ marginLeft: 8 }}
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                </CanEdit>
                              )}
                              {editing === ext.id && (
                                <span style={{ marginLeft: 8, display: 'inline-flex', gap: 4 }}>
                                  <CanEdit>
                                    <button className="btn-icon" onClick={(e) => { e.stopPropagation(); saveEdit(ext.id); }} title="Guardar">
                                      <Save size={13} />
                                    </button>
                                  </CanEdit>
                                  <button className="btn-icon" onClick={(e) => { e.stopPropagation(); cancelEdit(); }} title="Cancelar">
                                    <X size={13} />
                                  </button>
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                              {editing === ext.id ? (
                                <select
                                  className="form-input"
                                  value={editForm.estado}
                                  onChange={(e) => setEditForm({ ...editForm, estado: e.target.value })}
                                  style={{ fontSize: 13 }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <option value="En Ejecucion">En Ejecucion</option>
                                  <option value="Finalizada">Finalizada</option>
                                </select>
                              ) : (
                                <span style={{
                                  display: 'inline-block',
                                  padding: '2px 10px',
                                  borderRadius: 10,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  background: ext.estado === 'Finalizada' ? '#d4edda' : '#fff3cd',
                                  color: ext.estado === 'Finalizada' ? '#155724' : '#856404',
                                }}>
                                  {ext.estado || 'En Ejecucion'}
                                </span>
                              )}
                            </td>
                          </tr>
                          {expandedOrder === ext.id && ext.items.length > 0 && (
                            <tr>
                              <td colSpan={8} style={{ padding: '0 0 8px 24px', background: '#f8faff' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                  <thead>
                                    <tr style={{ background: '#eef2f7' }}>
                                      <th style={{ padding: '4px 6px', textAlign: 'left' }}>CPC</th>
                                      <th style={{ padding: '4px 6px', textAlign: 'left' }}>Descripción</th>
                                      <th style={{ padding: '4px 6px', textAlign: 'right' }}>Cant.</th>
                                      <th style={{ padding: '4px 6px', textAlign: 'right' }}>V. Unit</th>
                                      <th style={{ padding: '4px 6px', textAlign: 'right' }}>Subtotal</th>
                                      <th style={{ padding: '4px 6px', textAlign: 'left' }}>Partida Presup.</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {ext.items.map((it, idx) => (
                                      <tr key={idx}>
                                        <td style={{ padding: '3px 6px' }}>{it.cpc}</td>
                                        <td style={{ padding: '3px 6px', maxWidth: 300, whiteSpace: 'normal', wordBreak: 'break-word' }}>{it.descripcion}</td>
                                        <td style={{ padding: '3px 6px', textAlign: 'right' }}>{it.cantidad}</td>
                                        <td style={{ padding: '3px 6px', textAlign: 'right' }}>${it.v_unitario.toFixed(2)}</td>
                                        <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 600 }}>${it.subtotal.toFixed(2)}</td>
                                        <td style={{ padding: '3px 6px', fontSize: 11 }}>{it.partida_presupuestaria}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
