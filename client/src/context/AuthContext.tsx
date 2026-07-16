import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { setUnauthorizedHandler } from '../services/apiClient';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (payload: Record<string, string>) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (payload: Record<string, string>) => Promise<void>;
  updateProfile: (payload: Partial<User>) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(() => authService.getUser());
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  const login = useCallback(async (payload: Record<string, string>) => {
    const data = await authService.login(payload);
    const { token: _token, ...userData } = data;
    setUser(userData);
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const data = await authService.loginWithGoogle(idToken);
    const { token: _token, ...userData } = data;
    setUser(userData);
  }, []);

  const register = useCallback(async (payload: Record<string, string>) => {
    const data = await authService.register(payload);
    const { token: _token, ...userData } = data;
    setUser(userData);
  }, []);

  const updateProfile = useCallback(async (payload: Partial<User>) => {
    const userData = await authService.updateProfile(payload);
    setUser(userData);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    const token = authService.getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    authService
      .getMe()
      .then((profile) => {
        setUser(profile);
        localStorage.setItem('invoico_user', JSON.stringify(profile));
      })
      .catch(() => {
        authService.logout();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user && !!authService.getToken(),
      loading,
      login,
      loginWithGoogle,
      register,
      updateProfile,
      logout,
    }),
    [user, loading, login, loginWithGoogle, register, updateProfile, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
