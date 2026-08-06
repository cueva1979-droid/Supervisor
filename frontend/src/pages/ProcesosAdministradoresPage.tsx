import { useEffect, useState } from 'react';
import { Users, Search, ChevronDown, ChevronRight, FileText, Edit3, Trash2, Save, X, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { getProcesosAdministradores, exportProcesosExcelByAdmin } from '../services/api';
import { getCsrfToken } from '../services/auth';
import CanEdit from '../components/CanEdit';
import { API_BASE } from '../services/config';

function csrfHeaders(method?: string): Record<string, string> {
  const m = (method || 'GET').toUpperCase();
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return {};
  const csrf = getCsrfToken();
  return csrf ? { 'X-CSRF-Token': csrf } : {};
}

interface Proceso {
  id: string;
  codigo_proceso: string;
  objeto_proceso: string;
  estado_proceso: string;
  filename: string;
  fecha_publicacion: string;
  fecha_procesamiento: string;
}

interface Administrador {
  administrador: string;
  procesos: Proceso[];
  total_procesos: number;
}

export default function ProcesosAdministradoresPage() {
  const [admins, setAdmins] = useState<Administrador[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () => {
    setLoading(true);
    getProcesosAdministradores(search || undefined).then((res) => {
      setAdmins(res as Administrador[]);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [search]);

  const startEdit = (proc: Proceso) => {
    setEditing(proc.id);
    setEditForm({
      administrador_contrato_actual: '',
      codigo_proceso: proc.codigo_proceso,
      objeto_proceso: proc.objeto_proceso,
      estado_proceso: proc.estado_proceso,
    });
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditForm({});
  };

  const saveEdit = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/cam/extractions/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders('PUT') },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Error al actualizar');
      }
      setSuccess('Registro actualizado exitosamente');
      setEditing(null);
      setEditForm({});
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este registro?')) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/cam/extractions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: csrfHeaders('DELETE'),
      });
      if (!res.ok) throw new Error('Error al eliminar');
      setSuccess('Registro eliminado exitosamente');
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>Administradores de Procesos</h2>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
          {admins.length} administrador(es) registrado(s)
        </p>
      </div>

      {error && (
        <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 8, background: '#fef2f2', color: '#dc2626' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 8, background: '#f0fdf4', color: '#16a34a' }}>
          <AlertCircle size={18} /> {success}
        </div>
      )}

      <div className="card">
        <div className="card-header" style={{ justifyContent: 'space-between' }}>
          <span><Users size={18} /> Administradores de Contrato</span>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div className="search-bar">
            <Search size={16} />
            <input placeholder="Buscar administrador..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        {loading ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Cargando...</div> : (
          admins.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              <Users size={32} style={{ opacity: 0.4, marginBottom: 12 }} />
              <p>No hay administradores registrados. Cargue documentos CAM primero.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {admins.map((admin) => {
                const isExpanded = expanded === admin.administrador;
                return (
                  <div key={admin.administrador} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div
                      style={{
                        padding: '14px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                      }}
                      onClick={() => setExpanded(isExpanded ? null : admin.administrador)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 10,
                          background: 'var(--primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 16, fontWeight: 700,
                        }}>
                          {admin.administrador.charAt(0)}
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{admin.administrador}</h3>
                          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                            {admin.total_procesos} proceso(s)
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn-icon"
                          onClick={async (e) => { e.stopPropagation(); try { await exportProcesosExcelByAdmin(admin.administrador); } catch (err: any) { alert(err.message); } }}
                          title="Exportar a Excel"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 12 }}
                        >
                          <FileSpreadsheet size={14} /> Excel
                        </button>
                        <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 500 }}>
                          {isExpanded ? 'Ocultar' : 'Ver procesos'}
                          {isExpanded ? <ChevronDown size={14} style={{ marginLeft: 4 }} /> : <ChevronRight size={14} style={{ marginLeft: 4 }} />}
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '12px 20px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr>
                              <th style={{ padding: '8px 6px', textAlign: 'left' }}>Código Proceso</th>
                              <th style={{ padding: '8px 6px', textAlign: 'left' }}>Objeto del Proceso</th>
                              <th style={{ padding: '8px 6px', textAlign: 'left' }}>Estado</th>
                              <th style={{ padding: '8px 6px', textAlign: 'left' }}>Archivo</th>
                              <th style={{ padding: '8px 6px', textAlign: 'left' }}>Fecha</th>
                              <th style={{ padding: '8px 6px', textAlign: 'center' }}>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {admin.procesos.map((proc) => (
                              <tr key={proc.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '8px 6px', fontFamily: 'monospace', fontSize: 12, fontWeight: 500 }}>
                                  {editing === proc.id ? (
                                    <input
                                      className="form-input"
                                      value={editForm.codigo_proceso || ''}
                                      onChange={(e) => setEditForm({ ...editForm, codigo_proceso: e.target.value })}
                                      style={{ fontSize: 12, width: 140 }}
                                    />
                                  ) : (
                                    <><FileText size={12} style={{ marginRight: 4, opacity: 0.5 }} />{proc.codigo_proceso || '-'}</>
                                  )}
                                </td>
                                <td style={{ padding: '8px 6px', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {editing === proc.id ? (
                                    <input
                                      className="form-input"
                                      value={editForm.objeto_proceso || ''}
                                      onChange={(e) => setEditForm({ ...editForm, objeto_proceso: e.target.value })}
                                      style={{ fontSize: 12, width: '100%', minWidth: 200 }}
                                    />
                                  ) : (proc.objeto_proceso || '-')}
                                </td>
                                <td style={{ padding: '8px 6px' }}>
                                  {editing === proc.id ? (
                                    <select
                                      className="form-input"
                                      value={editForm.estado_proceso || ''}
                                      onChange={(e) => setEditForm({ ...editForm, estado_proceso: e.target.value })}
                                      style={{ fontSize: 12 }}
                                    >
                                      <option value="">Seleccionar</option>
                                      <option value="Ejecución de Contrato">Ejecución de Contrato</option>
                                      <option value="Adjudicado">Adjudicado</option>
                                      <option value="Finalizado">Finalizado</option>
                                      <option value="Publicado">Publicado</option>
                                      <option value="Suspendido">Suspendido</option>
                                    </select>
                                  ) : proc.estado_proceso ? (
                                    <span className={`badge badge-${proc.estado_proceso.toLowerCase().includes('ejecuci') ? 'success' : 'info'}`}>
                                      {proc.estado_proceso}
                                    </span>
                                  ) : '-'}
                                </td>
                                <td style={{ padding: '8px 6px', fontSize: 12, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {proc.filename || '-'}
                                </td>
                                <td style={{ padding: '8px 6px', fontSize: 12, whiteSpace: 'nowrap' }}>
                                  {proc.fecha_publicacion || (proc.fecha_procesamiento ? new Date(proc.fecha_procesamiento).toLocaleDateString() : '-')}
                                </td>
                                <td style={{ padding: '8px 6px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                  {editing === proc.id ? (
                                    <span style={{ display: 'inline-flex', gap: 4 }}>
                                      <CanEdit>
                                        <button className="btn-icon" onClick={() => saveEdit(proc.id)} title="Guardar" style={{ color: '#16a34a' }}>
                                          <Save size={14} />
                                        </button>
                                      </CanEdit>
                                      <button className="btn-icon" onClick={cancelEdit} title="Cancelar" style={{ color: '#dc2626' }}>
                                        <X size={14} />
                                      </button>
                                    </span>
                                  ) : (
                                    <span style={{ display: 'inline-flex', gap: 4 }}>
                                      <CanEdit>
                                        <button className="btn-icon" onClick={() => startEdit(proc)} title="Editar">
                                          <Edit3 size={14} />
                                        </button>
                                        <button className="btn-icon" onClick={() => handleDelete(proc.id)} title="Eliminar" style={{ color: '#dc2626' }}>
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
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
