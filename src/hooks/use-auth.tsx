import { useState, useEffect, createContext, useContext, type PropsWithChildren } from 'react';
import { getAuthToken, setAuthToken, removeAuthToken } from '@/utils/auth';
import { AUTH_LOGIN_URL, AUTH_ME_URL } from '@/constants/api';

export type User = {
  _id: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl?: string;
};

type AuthContextValue = {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      const storedToken = await getAuthToken();
      if (!storedToken) {
        setLoading(false);
        return;
      }

      setToken(storedToken);
      try {
        const response = await fetch(AUTH_ME_URL, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (!response.ok) {
          await removeAuthToken();
          setToken(null);
          setUser(null);
          setLoading(false);
          return;
        }

        const result = await response.json();
        setUser(result);
      } catch {
        await removeAuthToken();
        setToken(null);
      } finally {
        setLoading(false);
      }
    }

    void restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch(AUTH_LOGIN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.message || 'Login failed');
    }

    const result = await response.json();
    await setAuthToken(result.token);
    setToken(result.token);
    setUser(result.user);
  };

  const logout = () => {
    removeAuthToken();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
