import { useState } from 'react';
import {
  LayoutDashboard, FileUp, Users, History, Settings, Sun, Moon,
  FileText, Menu, X, BarChart3, ChevronDown, ChevronRight,
  Upload, Table2, CalendarDays, Award, ShieldCheck, Search, Edit3,
  DollarSign, ShoppingCart, LogOut, Package, ClipboardList, List
} from 'lucide-react';
import { useTheme } from './hooks/useTheme';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Process from './pages/Process';
import ProvidersPage from './pages/ProvidersPage';
import HistoryPage from './pages/HistoryPage';
import ConfigPage from './pages/ConfigPage';
import ReportsPage from './pages/ReportsPage';
import AdministradoresPage from './pages/AdministradoresPage';
import ProductosPage from './pages/ProductosPage';
import PACDashboard from './pages/pac/PACDashboard';
import PACUpload from './pages/pac/PACUpload';
import PACDataTable from './pages/pac/PACDataTable';
import PACAnalisis from './pages/pac/PACAnalisis';
import PACCertDashboard from './pages/pac/PACCertDashboard';
import PACCertGenerate from './pages/pac/PACCertGenerate';
import PACCertManual from './pages/pac/PACCertManual';
import PACVerificacion from './pages/pac/PACVerificacion';
import PACCPCDashboard from './pages/pac/PACCPCDashboard';
import PACCPCBuscador from './pages/pac/PACCPCBuscador';
import CEDashboard from './pages/ce/CEDashboard';
import CEUpload from './pages/ce/CEUpload';
import CEDataView from './pages/ce/CEDataView';
import CEAdmin from './pages/ce/CEAdmin';
import ProcesosPanel from './pages/ProcesosPanel';
import ProcesosListado from './pages/ProcesosListado';
import ProcesosAdministradoresPage from './pages/ProcesosAdministradoresPage';
import UsersPage from './pages/UsersPage';
import './styles/global.css';

type Page = 'dashboard' | 'config' | 'users'
  | 'pac-dashboard' | 'pac-upload' | 'pac-table' | 'pac-analisis'
  | 'pac-cert' | 'pac-cert-generate' | 'pac-cert-manual' | 'pac-cert-verificacion'
  | 'pac-cpc' | 'pac-cpc-buscador' | 'pac-cpc-verificacion'
  | 'infima-cuantia' | 'process' | 'providers' | 'administradores' | 'reports' | 'history' | 'productos'
  | 'ce-dashboard' | 'ce-upload' | 'ce-table' | 'ce-export' | 'ce-admin'
  | 'procesos-panel' | 'procesos-listado' | 'procesos-cam-extract' | 'procesos-administradores';

interface NavItem {
  id: Page;
  label: string;
  icon: typeof LayoutDashboard;
  parent?: string;
}

const navItems: (NavItem & { children?: NavItem[] })[] = [
  { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
  { id: 'infima-cuantia', label: 'Ínfima Cuantía', icon: DollarSign,
    children: [
      { id: 'process', label: 'Procesar Documentos', icon: FileUp, parent: 'infima' },
      { id: 'providers', label: 'Proveedores', icon: Users, parent: 'infima' },
      { id: 'administradores', label: 'Administradores', icon: Users, parent: 'infima' },
      { id: 'productos', label: 'Productos', icon: Package, parent: 'infima' },
      { id: 'reports', label: 'Reportes', icon: BarChart3, parent: 'infima' },
      { id: 'history', label: 'Historial', icon: History, parent: 'infima' },
    ]
  },
  { id: 'pac-dashboard', label: 'Módulo PAC', icon: FileText,
    children: [
      { id: 'pac-dashboard', label: 'Panel PAC', icon: LayoutDashboard, parent: 'pac' },
      { id: 'pac-upload', label: 'Cargar Archivos', icon: Upload, parent: 'pac' },
      { id: 'pac-table', label: 'Tabla de Datos', icon: Table2, parent: 'pac' },
      { id: 'pac-analisis', label: 'Análisis Períodos', icon: CalendarDays, parent: 'pac' },
      { id: 'pac-cert', label: 'Certificados', icon: Award, parent: 'pac' },
    ]
  },
  { id: 'pac-cpc', label: 'Módulo CPC', icon: ShieldCheck,
    children: [
      { id: 'pac-cpc', label: 'Panel CPC', icon: LayoutDashboard, parent: 'cpc' },
      { id: 'pac-cpc-buscador', label: 'Buscador de Códigos', icon: Search, parent: 'cpc' },
      { id: 'pac-cpc-verificacion', label: 'Verificación Catálogo', icon: ShieldCheck, parent: 'cpc' },
    ]
  },
      { id: 'ce-dashboard', label: 'Catálogo Electrónico', icon: ShoppingCart,
        children: [
          { id: 'ce-dashboard', label: 'Panel CE', icon: LayoutDashboard, parent: 'ce' },
          { id: 'ce-upload', label: 'Cargar PDF', icon: Upload, parent: 'ce' },
          { id: 'ce-table', label: 'Datos Extraídos', icon: Table2, parent: 'ce' },
          { id: 'ce-admin', label: 'Administrador Orden', icon: Users, parent: 'ce' },
        ]
      },
      { id: 'procesos-panel', label: 'Procesos de Contratación', icon: ClipboardList,
        children: [
          { id: 'procesos-panel', label: 'Panel Procesos', icon: LayoutDashboard, parent: 'procesos' },
          { id: 'procesos-listado', label: 'Listado', icon: List, parent: 'procesos' },
          { id: 'procesos-administradores', label: 'Administradores', icon: Users, parent: 'procesos' },
          { id: 'procesos-cam-extract', label: 'CAM - Extraer Datos', icon: Upload, parent: 'procesos' },
        ]
      },
  { id: 'users', label: 'Usuarios', icon: ShieldCheck },
  { id: 'config', label: 'Configuración', icon: Settings },
];

const pageTitles: Record<string, string> = {
  'dashboard': 'Inicio',
  'infima-cuantia': 'Ínfima Cuantía',
  'process': 'Procesar Documentos',
  'providers': 'Proveedores',
  'administradores': 'Administradores',
  'reports': 'Reportes',
  'history': 'Historial',
  'productos': 'Productos',
  'config': 'Configuración',
  'users': 'Usuarios',
  'pac-dashboard': 'PAC - Panel Principal',
  'pac-upload': 'PAC - Cargar Archivos',
  'pac-table': 'PAC - Tabla de Datos',
  'pac-analisis': 'PAC - Análisis de Períodos',
  'pac-cert': 'PAC - Certificados',
  'pac-cert-generate': 'PAC - Generar Certificado',
  'pac-cert-manual': 'PAC - Certificación Manual',
  'pac-cert-verificacion': 'PAC - Verificación Catálogo',
  'pac-cpc': 'Panel CPC',
  'pac-cpc-buscador': 'CPC - Buscador de Códigos',
  'pac-cpc-verificacion': 'CPC - Verificación Catálogo',
  'ce-dashboard': 'CE - Panel Principal',
  'ce-upload': 'CE - Cargar PDF',
  'ce-table': 'CE - Datos Extraídos',
  'ce-export': 'CE - Exportar a Excel',
  'ce-admin': 'CE - Administrador Orden',
  'procesos-panel': 'Procesos - Panel Principal',
  'procesos-listado': 'Procesos - Listado',
  'procesos-administradores': 'Procesos - Administradores',
  'procesos-cam-extract': 'CAM - Extraer Datos',
};

function AppContent() {
  const [page, setPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pacOpen, setPacOpen] = useState(false);
  const [cpcOpen, setCpcOpen] = useState(false);
  const [infimaOpen, setInfimaOpen] = useState(false);
  const [ceOpen, setCeOpen] = useState(false);
  const [procesosOpen, setProcesosOpen] = useState(false);
  const { dark, toggle } = useTheme();
  const { isAuth, loading, logout, user } = useAuth();

  const restrictedPages: Page[] = ['users', 'config'];
  const filteredNavItems = user?.role === 'viewer'
    ? navItems.filter((item) => !restrictedPages.includes(item.id))
    : navItems;

  const infimaPages = ['process', 'providers', 'administradores', 'productos', 'reports', 'history'];
  const isPacPage = page.startsWith('pac-') && !page.startsWith('pac-cpc');
  const isCpcPage = page.startsWith('pac-cpc');
  const isInfimaPage = infimaPages.includes(page);
  const isCePage = page.startsWith('ce-');
  const isProcesosPage = page.startsWith('procesos-');

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard />;
      case 'process': return <Process />;
      case 'providers': return <ProvidersPage />;
      case 'administradores': return <AdministradoresPage />;
      case 'reports': return <ReportsPage />;
      case 'productos': return <ProductosPage />;
      case 'history': return <HistoryPage />;
      case 'config': return <ProtectedRoute requiredRole={['admin']}><ConfigPage /></ProtectedRoute>;
      case 'users': return <ProtectedRoute requiredRole={['admin']}><UsersPage /></ProtectedRoute>;

      // PAC pages
      case 'pac-dashboard': return <PACDashboard onNavigate={(p) => setPage(p as Page)} />;
      case 'pac-upload': return <PACUpload />;
      case 'pac-table': return <PACDataTable />;
      case 'pac-analisis': return <PACAnalisis />;
      case 'pac-cert': return <PACCertDashboard onNavigate={(p) => setPage(p as Page)} />;
      case 'pac-cert-generate': return <PACCertGenerate />;
      case 'pac-cert-manual': return <PACCertManual />;
      case 'pac-cert-verificacion': return <PACVerificacion />;
      case 'pac-cpc': return <PACCPCDashboard onNavigate={(p) => setPage(p as Page)} />;
      case 'pac-cpc-buscador': return <PACCPCBuscador />;
      case 'pac-cpc-verificacion': return <PACVerificacion />;

      // CE pages
      case 'ce-dashboard': return <CEDashboard onNavigate={(p) => setPage(p as Page)} />;
      case 'ce-upload': return <CEUpload onExtractionsChange={() => {}} />;
      case 'ce-table': return <CEDataView />;
      case 'ce-admin': return <CEAdmin />;

      // Procesos pages
      case 'procesos-panel': return <ProcesosPanel onNavigate={(p) => setPage(p as Page)} />;
      case 'procesos-listado': return <ProcesosListado />;
      case 'procesos-administradores': return <ProcesosAdministradoresPage />;
      case 'procesos-cam-extract': return <ProcesosListado />;
      default: return <Dashboard />;
    }
  };

  const handleNav = (id: Page) => {
    setPage(id);
    setSidebarOpen(false);
    if (id.startsWith('pac-') && !id.startsWith('pac-cpc')) setPacOpen(true);
    if (id.startsWith('pac-cpc')) setCpcOpen(true);
    if (infimaPages.includes(id)) setInfimaOpen(true);
    if (id.startsWith('ce-')) setCeOpen(true);
    if (id.startsWith('procesos-')) setProcesosOpen(true);
  };

  if (!isAuth) {
    return <LoginPage />;
  }

  const pageTitle = pageTitles[page] || 'SupervisorPRO';

  return (
    <div className="layout">
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-header">
          <FileText size={24} className="logo-icon" />
          <h2>SupervisorPRO</h2>
        </div>
        <nav className="sidebar-nav">
          {filteredNavItems.map((item) => {
            if (item.children) {
              const accordionMap: Record<string, { open: boolean; toggle: () => void; active: boolean }> = {
                'infima-cuantia': { open: infimaOpen, toggle: () => setInfimaOpen(!infimaOpen), active: isInfimaPage },
                'pac-dashboard': { open: pacOpen, toggle: () => setPacOpen(!pacOpen), active: isPacPage },
                'pac-cpc': { open: cpcOpen, toggle: () => setCpcOpen(!cpcOpen), active: isCpcPage },
                'ce-dashboard': { open: ceOpen, toggle: () => setCeOpen(!ceOpen), active: isCePage },
                'procesos-panel': { open: procesosOpen, toggle: () => setProcesosOpen(!procesosOpen), active: isProcesosPage },
              };
              const acc = accordionMap[item.id];
              return (
                <div key={item.id}>
                  <button
                    className={acc.active ? 'active' : ''}
                    onClick={() => { acc.toggle(); if (!acc.active) handleNav(item.id); }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <item.icon size={18} />
                      {item.label}
                    </span>
                    {acc.open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  {acc.open && (
                    <div style={{ paddingLeft: 12 }}>
                      {item.children.map((child) => (
                        <button
                          key={child.id}
                          className={page === child.id ? 'active' : ''}
                          onClick={() => handleNav(child.id)}
                          style={{ fontSize: 13, padding: '6px 14px' }}
                        >
                          <child.icon size={15} />
                          {child.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <button
                key={item.id}
                className={page === item.id ? 'active' : ''}
                onClick={() => { handleNav(item.id); if ((isPacPage || isCpcPage || isInfimaPage || isCePage || isProcesosPage) && !item.id.startsWith('pac-') && !infimaPages.includes(item.id) && !item.id.startsWith('ce-') && !item.id.startsWith('procesos-')) { setPacOpen(false); setCpcOpen(false); setInfimaOpen(false); setCeOpen(false); setProcesosOpen(false); } }}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <button
            style={{ color: 'var(--text-sidebar)', gap: 10, padding: '10px 14px', width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: 14, borderRadius: 6 }}
            onClick={() => window.open('https://github.com/anomalyco/opencode', '_blank')}
          >
            <Settings size={18} />
            Acerca de
          </button>
          <button
            style={{ color: 'var(--text-sidebar)', gap: 10, padding: '10px 14px', width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: 14, borderRadius: 6 }}
            onClick={logout}
            title="Cerrar sesión"
          >
            <LogOut size={18} />
            Salir
          </button>
        </div>
      </aside>

      <div className="main-content">
        <nav className="navbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span className="navbar-title">{pageTitle}</span>
          </div>
          <div className="navbar-actions">
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {user?.username} ({user?.role})
            </span>
            <button className="theme-btn" onClick={toggle}>
              {dark ? <Sun size={16} /> : <Moon size={16} />}
              {dark ? 'Claro' : 'Oscuro'}
            </button>
            <button className="btn-secondary" onClick={logout} style={{ padding: '6px 12px', fontSize: 13 }}>
              <LogOut size={14} /> Salir
            </button>
          </div>
        </nav>
        <main className="page-content">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
