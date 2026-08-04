import { ShieldCheck, Search, FileSearch } from 'lucide-react';

interface Props {
  onNavigate: (page: string) => void;
}

export default function PACCPCDashboard({ onNavigate }: Props) {
  return (
    <div>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Módulo CPC</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Clasificador Central de Productos</p>
      </div>

      <div className="grid-2">
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('pac-cpc-verificacion')}>
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <ShieldCheck size={28} color="#059669" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Verificación Catálogo</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Verifique códigos CPC en el catálogo oficial.</p>
          </div>
        </div>

        <div className="card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('pac-cpc-buscador')}>
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <FileSearch size={28} color="#2563eb" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Buscador de Códigos CPC</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Suba archivos Excel, busque y seleccione códigos CPC.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
