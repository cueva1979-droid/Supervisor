import { FileText, Edit3, Search } from 'lucide-react';

interface Props {
  onNavigate: (page: string) => void;
}

export default function PACCertDashboard({ onNavigate }: Props) {
  return (
    <div>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Certificados PAC</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Gestión de certificados y certificaciones</p>
      </div>

      <div className="grid-3">
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('pac-cert-generate')}>
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <FileText size={28} color="#2563eb" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Certificado PAC</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Generar certificados desde documentos existentes.</p>
          </div>
        </div>

        <div className="card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('pac-cert-manual')}>
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Edit3 size={28} color="#1f2937" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Certificación Manual</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Ingreso manual de datos para nueva certificación.</p>
          </div>
        </div>

        <div className="card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('pac-cert-verificacion')}>
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Search size={28} color="#059669" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Verificación Catálogo</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Verifique códigos CPC en el catálogo oficial.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
