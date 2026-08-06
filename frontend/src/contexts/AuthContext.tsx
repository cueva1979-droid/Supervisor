import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { login as apiLogin, getMe, logout as apiLogout, getUser, setUser, clearUser, type UserInfo } from '../services/auth';

interface AuthContextType {
  user: UserInfo | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuth: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  isAuth: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserInfo | null>(getUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const me = await getMe();
        setUserState(me);
        setUser(me);
      } catch {
        clearUser();
        setUserState(null);
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = async (username: string, password: string) => {
    const res = await apiLogin(username, password);
    setUser(res.user);
    setUserState(res.user);
  };

  const logout = async () => {
    await apiLogout();
    clearUser();
    setUserState(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuth: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
