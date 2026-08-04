import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { login as apiLogin, getMe, getAccessToken, getRefreshToken, setTokens, clearTokens, getUser, setUser, isAuthenticated, type UserInfo } from '../services/auth';

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
      const token = getAccessToken();
      if (token) {
        try {
          const me = await getMe(token);
          setUserState(me);
          setUser(me);
        } catch {
          clearTokens();
          setUserState(null);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = async (username: string, password: string) => {
    const res = await apiLogin(username, password);
    setTokens(res.access_token, res.refresh_token);
    setUser(res.user);
    setUserState(res.user);
  };

  const logout = () => {
    clearTokens();
    setUserState(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuth: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
