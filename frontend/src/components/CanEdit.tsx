import { type ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function CanEdit({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user || user.role === 'viewer') return null;
  return <>{children}</>;
}
