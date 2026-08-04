import { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle } from 'lucide-react';
import { pacAPI } from '../../services/pacApi';

export default function PACVerificacion() {
  const [catalog, setCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationResult, setVerificationResult] = useState<{ found: boolean; item?: any } | null>(null);

  useEffect(() => {
    pacAPI.getCPCCatalog().then(data => {
      setCatalog(data.map((item: any) => ({
        codigo: item.cpc,
        descripcion: item.descripcion,
        precio: item.umbral || 0,
        estado: 'Vigente'
      })));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filteredCatalog = catalog.filter(item =>
    item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const verifyItem = (e: React.FormEvent) => {
    e.preventDefault();
    const found = catalog.find(item => item.codigo === verificationCode);
    setVerificationResult(found ? { found: true, item: found } : { found: false });
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Search size={22} color="#059669" /> Verificación de Catálogo
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: 14 }}>
          Ingrese el código CPC para verificar si está registrado en el catálogo oficial.
        </p>
        <form onSubmit={verifyItem} style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label>Código CPC</label>
            <input className="form-input" placeholder="Ej: 24101" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} />
          </div>
          <button className="btn btn-success" type="submit"><Search size={16} /> Verificar</button>
        </form>

        {verificationResult && (
          <div style={{ marginTop: 16, padding: 16, borderRadius: 8, border: '1px solid', background: verificationResult.found ? '#f0fdf4' : '#fef2f2', borderColor: verificationResult.found ? '#bbf7d0' : '#fecaca', display: 'flex', gap: 12 }}>
            {verificationResult.found ? (
              <CheckCircle size={24} color="#16a34a" style={{ flexShrink: 0 }} />
            ) : (
              <XCircle size={24} color="#dc2626" style={{ flexShrink: 0 }} />
            )}
            <div>
              {verificationResult.found ? (
                <>
                  <h4 style={{ fontWeight: 600, color: '#166534' }}>Producto encontrado en catálogo</h4>
                  <p style={{ color: '#15803d', fontSize: 13 }}>{verificationResult.item?.descripcion}</p>
                  <p style={{ color: '#16a34a', fontSize: 12 }}>Precio: ${Number(verificationResult.item?.precio).toFixed(2)}</p>
                </>
              ) : (
                <>
                  <h4 style={{ fontWeight: 600, color: '#991b1b' }}>No encontrado en catálogo</h4>
                  <p style={{ color: '#b91c1c', fontSize: 13 }}>El código CPC {verificationCode} no está registrado.</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Catálogo de Productos y Servicios</h3>
        <div className="search-bar" style={{ marginBottom: 16, maxWidth: '100%' }}>
          <Search size={16} />
          <input type="text" placeholder="Buscar por código o descripción..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 32 }}>Cargando...</div>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr><th>Código CPC</th><th>Descripción</th><th>Precio Ref.</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {filteredCatalog.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>No se encontraron productos.</td></tr>
                ) : (
                  filteredCatalog.map(item => (
                    <tr key={item.codigo}>
                      <td style={{ fontFamily: 'monospace' }}>{item.codigo}</td>
                      <td>{item.descripcion}</td>
                      <td>${Number(item.precio).toFixed(2)}</td>
                      <td><span className="badge badge-primary">{item.estado}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
