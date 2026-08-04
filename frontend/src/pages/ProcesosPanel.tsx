import { ClipboardList, List, Upload, FileText, Users } from 'lucide-react';

interface Props {
  onNavigate: (page: string) => void;
}

export default function ProcesosPanel({ onNavigate }: Props) {
  return (
    <div>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Procesos de Contratación</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Gestión de procesos de contratación</p>
      </div>

      <div className="grid-3">
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('procesos-listado')}>
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <List size={28} color="#2563eb" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Listado de Procesos</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Visualice y administre todos los procesos de contratación registrados.</p>
          </div>
        </div>
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('procesos-administradores')}>
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Users size={28} color="#059669" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Administradores</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Administradores de contrato y sus procesos asociados.</p>
          </div>
        </div>
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('procesos-cam-extract')}>
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Upload size={28} color="#d97706" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>CAM - Extraer Datos</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Extraiga datos de documentos PDF de Cambio de Administrador de Contrato.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
