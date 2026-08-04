import { useEffect, useState } from 'react';
import { Users, Plus, Search, Edit3, Trash2, X, Save, AlertCircle, Shield, UserCheck } from 'lucide-react';
import { getUsers, createUser, updateUser, deleteUser } from '../services/api';
import CanEdit from '../components/CanEdit';

interface UserData {
  id: number;
  username: string;
  email: string | null;
  role: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  operator: 'Operador',
  viewer: 'Solo lectura',
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'operator' });
  const [error, setError] = useState('');

  const loadUsers = () => {
    setLoading(true);
    getUsers().then((res) => {
      setUsers((res || []) as UserData[]);
      setLoading(false);
    });
  };

  useEffect(() => { loadUsers(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ username: '', email: '', password: '', role: 'operator' });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (u: UserData) => {
    setEditId(u.id);
    setForm({ username: u.username, email: u.email || '', password: '', role: u.role });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.username) { setError('El nombre de usuario es obligatorio'); return; }
    if (!editId && !form.password) { setError('La contraseña es obligatoria'); return; }
    if (form.password && form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return; }
    setError('');
    try {
      if (editId) {
        const payload: any = { username: form.username, email: form.email || null, role: form.role };
        if (form.password) payload.password = form.password;
        await updateUser(editId, payload);
      } else {
        await createUser({ username: form.username, email: form.email || undefined, password: form.password, role: form.role });
      }
      setModalOpen(false);
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    }
  };

  const handleDelete = async (u: UserData) => {
    if (!confirm(`¿Eliminar usuario "${u.username}"?`)) return;
    try {
      await deleteUser(u.id);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  const handleToggleActive = async (u: UserData) => {
    try {
      await updateUser(u.id, { is_active: !u.is_active });
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado');
    }
  };

  const filtered = users.filter(
    (u) => u.username.toLowerCase().includes(search.toLowerCase()) || u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Shield size={24} />
          <h2>Usuarios</h2>
        </div>
        <CanEdit>
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} /> Nuevo Usuario
          </button>
        </CanEdit>
      </div>

      <div className="search-bar" style={{ marginBottom: 16 }}>
        <Search size={18} />
        <input
          className="form-input"
          type="text"
          placeholder="Buscar usuario..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Cargando...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No hay usuarios registrados.</p>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Último acceso</th>
                <th style={{ width: 140 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.username}</strong></td>
                  <td>{u.email || '—'}</td>
                  <td><span className={`badge badge-${u.role}`}>{ROLE_LABELS[u.role] || u.role}</span></td>
                  <td>
                    <button
                      className={`badge ${u.is_active ? 'badge-active' : 'badge-inactive'}`}
                      onClick={() => handleToggleActive(u)}
                      style={{ cursor: 'pointer', border: 'none' }}
                    >
                      {u.is_active ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {u.last_login ? new Date(u.last_login).toLocaleString() : 'Nunca'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <CanEdit>
                        <button className="btn-icon" onClick={() => openEdit(u)} title="Editar">
                          <Edit3 size={15} />
                        </button>
                      </CanEdit>
                      <CanEdit>
                        <button className="btn-icon" onClick={() => handleToggleActive(u)} title={u.is_active ? 'Desactivar' : 'Activar'}>
                          <UserCheck size={15} />
                        </button>
                      </CanEdit>
                      <CanEdit>
                        <button className="btn-icon danger" onClick={() => handleDelete(u)} title="Eliminar">
                          <Trash2 size={15} />
                        </button>
                      </CanEdit>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editId ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button className="btn-icon" onClick={() => setModalOpen(false)}><X size={18} /></button>
            </div>

            {error && (
              <div className="alert alert-error">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Usuario *</label>
                <input
                  className="form-input"
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="Nombre de usuario"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Email</label>
                <input
                  className="form-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                  {editId ? 'Nueva contraseña (dejar vacío para mantener)' : 'Contraseña *'}
                </label>
                <input
                  className="form-input"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={editId ? '••••••••' : 'Mínimo 8 caracteres'}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Rol</label>
                <select
                  className="form-input"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="admin">Admin - Acceso completo</option>
                  <option value="operator">Operador - Procesar documentos</option>
                  <option value="viewer">Solo lectura</option>
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <CanEdit>
                <button className="btn-primary" onClick={handleSave}>
                  <Save size={16} /> {editId ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </CanEdit>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
