import { Upload, Table2, FileSpreadsheet, LayoutDashboard, Users } from 'lucide-react';

interface Props {
  onNavigate: (page: string) => void;
}

export default function CEDashboard({ onNavigate }: Props) {
  const cards = [
    { id: 'ce-admin', label: 'Administrador Orden', icon: Users, desc: 'Órdenes agrupadas por administrador con exportación a Excel' },
    { id: 'ce-upload', label: 'Cargar PDF', icon: Upload, desc: 'Subir y procesar órdenes de compra desde PDF' },
    { id: 'ce-table', label: 'Datos Extraídos', icon: Table2, desc: 'Ver, filtrar y editar datos extraídos' },
    { id: 'ce-export', label: 'Exportar a Excel', icon: FileSpreadsheet, desc: 'Exportar órdenes a formato .xlsx' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>Catálogo Electrónico</h2>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
          Módulo de extracción de datos de Órdenes de Compra por Catálogo Electrónico (SERCOP Ecuador)
        </p>
      </div>
      <div className="grid-4">
        {cards.map((card) => (
          <div
            key={card.id}
            className="card"
            style={{ cursor: 'pointer', padding: 24 }}
            onClick={() => onNavigate(card.id)}
          >
            <card.icon size={32} style={{ color: 'var(--primary)', marginBottom: 12 }} />
            <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>{card.label}</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
