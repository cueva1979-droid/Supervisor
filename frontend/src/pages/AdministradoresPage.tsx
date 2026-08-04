import { useEffect, useState } from 'react';
import { Users, Search, FileSpreadsheet } from 'lucide-react';
import { getAdministradores } from '../services/api';

const API_BASE = 'http://127.0.0.1:8000';

interface Administrador {
  administrador: string;
  numero_orden: string;
  proveedor: string;
  objeto_contratacion: string;
  fecha: string;
  monto_total: number;
  record_id: number;
  filename: string;
  ordenes?: string[];
}

export default function AdministradoresPage() {
  const [admins, setAdmins] = useState<Administrador[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getAdministradores(search || undefined).then((res) => {
      setAdmins(res as Administrador[]);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div className="card-header" style={{ justifyContent: 'space-between' }}>
          <span><Users size={18} /> Administradores de Órdenes de Compra</span>
          <button className="btn btn-primary btn-sm" onClick={() => window.open(`${API_BASE}/export/administradores`)}><FileSpreadsheet size={14} /> Exportar Excel</button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div className="search-bar">
            <Search size={16} />
            <input placeholder="Buscar administrador..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        {loading ? <div>Cargando...</div> : (
          <table>
            <thead>
              <tr>
                <th>Administrador</th>
                <th>N° Orden</th>
                <th>Proveedor</th>
                <th>Objeto de Contratación</th>
                <th>Fecha</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {admins.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24 }}>No hay administradores registrados</td></tr>
              )}
              {admins.map((a, i) => (
                <tr key={i}>
                  <td><strong>{a.administrador}</strong></td>
                  <td><span className="badge badge-primary">{a.numero_orden || '-'}</span></td>
                  <td>{a.proveedor || '-'}</td>
                  <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.objeto_contratacion || '-'}</td>
                  <td>{a.fecha || '-'}</td>
                  <td>{(a.monto_total ?? 0).toLocaleString('es-PY', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
