import { useState, useEffect } from 'react';
import { Settings, Server, Database, HardDrive, Globe, Shield, AlertTriangle, X, RotateCcw, Save, Clock, FolderOpen, Play, Square, Undo2 } from 'lucide-react';
import { getAccessToken } from '../services/auth';

const API_BASE = 'http://127.0.0.1:8000';

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export default function ConfigPage() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [done, setDone] = useState(false);
  const [backupInfo, setBackupInfo] = useState<any>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [backupMsg, setBackupMsg] = useState('');
  const [showRestore, setShowRestore] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState('');
  const [restoreMsg, setRestoreMsg] = useState('');

  const loadBackupInfo = async () => {
    try {
      const res = await fetch(`${API_BASE}/backup/info`, { headers: authHeaders() });
      if (res.ok) setBackupInfo(await res.json());
    } catch {}
  };

  useEffect(() => { loadBackupInfo(); }, []);

  const handleBackup = async () => {
    setBackingUp(true);
    setBackupMsg('');
    try {
      const res = await fetch(`${API_BASE}/backup`, { method: 'POST', headers: authHeaders() });
      if (!res.ok) throw new Error((await res.json()).detail || 'Error');
      const data = await res.json();
      setBackupMsg(`Backup creado: ${data.backup.filename}`);
      loadBackupInfo();
    } catch (err: any) {
      alert(err.message);
    }
    setBackingUp(false);
  };

  const toggleAutoBackup = async (enabled: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/backup/auto-toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) loadBackupInfo();
    } catch {}
  };

  const handleRestore = async () => {
    if (!restoreFile) return;
    if (!confirm(`¿Restaurar la base de datos desde ${restoreFile}? Se creará un backup previo automático.`)) return;
    setRestoring(true);
    setRestoreMsg('');
    try {
      const res = await fetch(`${API_BASE}/backup/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ filename: restoreFile }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Error');
      const data = await res.json();
      setRestoreMsg(`Restaurado desde ${data.restored_from}. Backup previo: ${data.backup_previo}`);
      setShowRestore(false);
      loadBackupInfo();
    } catch (err: any) {
      alert(err.message);
    }
    setRestoring(false);
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await fetch(`${API_BASE}/reset-db`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).detail || 'Error');
      setDone(true);
      setTimeout(() => { setShowConfirm(false); setDone(false); }, 2000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setResetting(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div className="card-header"><Settings size={18} /> Configuración del Sistema</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
          SupervisorPDF funciona completamente offline. Todos los datos se almacenan localmente.
        </p>
        <div className="grid-2">
          <div className="card" style={{ padding: 16 }}>
            <div className="card-header" style={{ fontSize: 14, marginBottom: 8 }}><Server size={16} /> Backend</div>
            <dl className="detail-grid" style={{ fontSize: 13 }}>
              <dt>Servidor</dt><dd>FastAPI (Python)</dd>
              <dt>Puerto</dt><dd>8000</dd>
              <dt>Base de Datos</dt><dd>SQLite</dd>
              <dt>Estado</dt><dd style={{ color: 'var(--success)' }}>● Operativo</dd>
            </dl>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div className="card-header" style={{ fontSize: 14, marginBottom: 8 }}><Save size={16} /> Backup</div>
            <dl className="detail-grid" style={{ fontSize: 13 }}>
              <dt>Último backup</dt>
              <dd>{backupInfo?.last_backup ? formatDate(backupInfo.last_backup.timestamp) : 'Nunca'}</dd>
              <dt>Backups totales</dt><dd>{backupInfo?.total_backups ?? 0}</dd>
              <dt>Directorio</dt><dd style={{ fontSize: 11, wordBreak: 'break-all' }}>{backupInfo?.backup_dir || 'backup/'}</dd>
            </dl>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={handleBackup} disabled={backingUp} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Play size={14} /> {backingUp ? 'Respaldando...' : 'Realizar Backup Ahora'}
              </button>
              {backupMsg && <span style={{ fontSize: 12, color: 'var(--success)' }}>{backupMsg}</span>}
              {restoreMsg && <span style={{ fontSize: 12, color: 'var(--success)' }}>{restoreMsg}</span>}
              {backupInfo && backupInfo.files.length > 0 && (
                <button className="btn btn-secondary btn-sm" onClick={() => { setShowRestore(true); setRestoreFile(backupInfo.files[0]?.filename || ''); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Undo2 size={14} /> Restaurar desde backup
                </button>
              )}
              {backupInfo && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={backupInfo.auto_backup_enabled}
                    onChange={(e) => toggleAutoBackup(e.target.checked)}
                  />
                  Backup automático diario
                </label>
              )}
            </div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div className="card-header" style={{ fontSize: 14, marginBottom: 8 }}><Database size={16} /> Base de Datos</div>
            <dl className="detail-grid" style={{ fontSize: 13 }}>
              <dt>Motor</dt><dd>SQLite 3</dd>
              <dt>Ubicación</dt><dd>data/supervisor.db</dd>
              <dt>ORM</dt><dd>SQLAlchemy</dd>
              <dt>Migraciones</dt><dd>Automáticas (init_db)</dd>
            </dl>
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-danger btn-sm" onClick={() => setShowConfirm(true)}>
                <RotateCcw size={14} /> Reiniciar Base de Datos
              </button>
            </div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div className="card-header" style={{ fontSize: 14, marginBottom: 8 }}><HardDrive size={16} /> Almacenamiento</div>
            <dl className="detail-grid" style={{ fontSize: 13 }}>
              <dt>Documentos</dt><dd>backend/uploads/</dd>
              <dt>Exportaciones</dt><dd>exports/</dd>
              <dt>Formatos</dt><dd>PDF, DOCX</dd>
              <dt>Límite</dt><dd>Sin límite</dd>
            </dl>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div className="card-header" style={{ fontSize: 14, marginBottom: 8 }}><Shield size={16} /> Seguridad</div>
            <dl className="detail-grid" style={{ fontSize: 13 }}>
              <dt>Offline</dt><dd>100% local</dd>
              <dt>Validación</dt><dd>Pydantic + frontend</dd>
              <dt>Archivos</dt><dd>Solo PDF/DOCX</dd>
              <dt>CORS</dt><dd>Permisivo (dev)</dd>
            </dl>
          </div>
        </div>
      </div>

      {backupInfo && backupInfo.files.length > 0 && (
        <div className="card">
          <div className="card-header"><Clock size={18} /> Historial de Backups</div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Archivo</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Fecha</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Tamaño</th>
                </tr>
              </thead>
              <tbody>
                {backupInfo.files.slice(0, 20).map((f: any) => (
                  <tr key={f.filename}>
                    <td style={{ padding: '4px 8px', fontSize: 12 }}>{f.filename}</td>
                    <td style={{ padding: '4px 8px', fontSize: 12 }}>{formatDate(f.timestamp)}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', fontSize: 12 }}>{formatSize(f.size_bytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header" style={{ justifyContent: 'space-between' }}>
          <span><Globe size={18} /> Información del Sistema</span>
        </div>
        <dl className="detail-grid" style={{ fontSize: 14 }}>
          <dt>Aplicación</dt><dd>SupervisorPDF v1.0.0</dd>
          <dt>Framework Frontend</dt><dd>React 19 + TypeScript + Vite</dd>
          <dt>Framework Backend</dt><dd>FastAPI + SQLAlchemy + SQLite</dd>
          <dt>Parseo PDF</dt><dd>pdfplumber</dd>
          <dt>Parseo Word</dt><dd>python-docx</dd>
          <dt>Exportación</dt><dd>openpyxl (Excel .xlsx)</dd>
          <dt>Iconos</dt><dd>Lucide React</dd>
          <dt>Empaquetado</dt><dd>PyInstaller (Windows .exe)</dd>
        </dl>
      </div>
      {showConfirm && (
        <div className="modal-overlay" onClick={() => !resetting && setShowConfirm(false)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><AlertTriangle size={18} style={{ color: 'var(--danger)', verticalAlign: 'middle', marginRight: 8 }} />Reiniciar Base de Datos</h3>
              <button className="btn-icon" onClick={() => setShowConfirm(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 12 }}>¿Estás seguro de que deseas eliminar <strong>todos los registros</strong>?</p>
              <p style={{ fontSize: 13, color: 'var(--danger)' }}>Esta acción no se puede deshacer. Se eliminarán todas las órdenes de compra, productos y proveedores.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowConfirm(false)} disabled={resetting}>Cancelar</button>
              <button className="btn btn-danger btn-sm" onClick={handleReset} disabled={resetting}>
                {resetting ? 'Reiniciando...' : done ? '¡Listo!' : 'Sí, reiniciar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRestore && backupInfo && (
        <div className="modal-overlay" onClick={() => !restoring && setShowRestore(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Undo2 size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Restaurar desde Backup</h3>
              <button className="btn-icon" onClick={() => setShowRestore(false)} disabled={restoring}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 12, fontSize: 14 }}>Seleccione un archivo de backup para restaurar:</p>
              <select
                className="form-input"
                value={restoreFile}
                onChange={(e) => setRestoreFile(e.target.value)}
                style={{ width: '100%', marginBottom: 12 }}
                disabled={restoring}
              >
                {backupInfo.files.map((f: any) => (
                  <option key={f.filename} value={f.filename}>
                    {f.filename} ({formatDate(f.timestamp)} - {formatSize(f.size_bytes)})
                  </option>
                ))}
              </select>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Se creará un backup automático de la base de datos actual antes de restaurar.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowRestore(false)} disabled={restoring}>Cancelar</button>
              <button className="btn btn-primary btn-sm" onClick={handleRestore} disabled={restoring || !restoreFile}>
                {restoring ? 'Restaurando...' : 'Restaurar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
