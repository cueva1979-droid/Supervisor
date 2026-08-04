import { FileText, Award, Upload, Table2, CalendarDays } from 'lucide-react';

interface Props {
  onNavigate: (page: string) => void;
}

export default function PACDashboard({ onNavigate }: Props) {
  return (
    <div>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Módulo PAC</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Plan Anual de Contratación</p>
      </div>

      <div className="grid-4">
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('pac-upload')}>
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Upload size={28} color="#2563eb" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Cargar Archivos</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Suba archivos Excel/PDF y extraiga información automáticamente.</p>
          </div>
        </div>

        <div className="card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('pac-table')}>
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Table2 size={28} color="#10b981" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Tabla de Datos</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Visualice, filtre, edite y exporte los datos extraídos.</p>
          </div>
        </div>

        <div className="card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('pac-analisis')}>
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CalendarDays size={28} color="#f59e0b" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Análisis de Períodos</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Analice los períodos C1, C2, C3 con alertas de estado.</p>
          </div>
        </div>

        <div className="card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('pac-cert')}>
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Award size={28} color="#d97706" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Certificados</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Gestión de certificados PAC y certificaciones manuales.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
