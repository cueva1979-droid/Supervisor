import { useState } from 'react';
import { BarChart3, Package, FileText } from 'lucide-react';
import ProviderReport from '../components/ProviderReport';
import ProductReport from '../components/ProductReport';
import OrdenesReport from '../components/OrdenesReport';

type Tab = 'providers' | 'products' | 'ordenes';

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('ordenes');

  return (
    <div className="report-page" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 4, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: 4, boxShadow: 'var(--shadow)', border: '1px solid var(--border)' }}>
        <button
          className={tab === 'ordenes' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
          onClick={() => setTab('ordenes')}
          style={{ flex: 1, justifyContent: 'center', padding: '8px 16px' }}
        >
          <FileText size={16} /> Órdenes
        </button>
        <button
          className={tab === 'providers' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
          onClick={() => setTab('providers')}
          style={{ flex: 1, justifyContent: 'center', padding: '8px 16px' }}
        >
          <BarChart3 size={16} /> Reporte de Proveedores
        </button>
        <button
          className={tab === 'products' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
          onClick={() => setTab('products')}
          style={{ flex: 1, justifyContent: 'center', padding: '8px 16px' }}
        >
          <Package size={16} /> Productos y Precios
        </button>
      </div>
      {tab === 'ordenes' ? <OrdenesReport /> : tab === 'providers' ? <ProviderReport /> : <ProductReport />}
    </div>
  );
}
