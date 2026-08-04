import { type ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoginPage from '../pages/LoginPage';

interface Props {
  children: ReactNode;
  requiredRole?: string[];
}

export default function ProtectedRoute({ children, requiredRole }: Props) {
  const { isAuth, loading, user } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: 'var(--text-muted)' }}>Cargando...</p>
      </div>
    );
  }

  if (!isAuth) {
    return <LoginPage />;
  }

  if (requiredRole && user && !requiredRole.includes(user.role)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <h2>Acceso Denegado</h2>
          <p style={{ color: 'var(--text-muted)' }}>No tiene permisos para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
