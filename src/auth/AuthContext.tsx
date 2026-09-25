import React, { createContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setLogoutCallback } from '../api/axiosInstance';
import { AUTH } from '../api/endpoints';
import { unregisterPushToken } from '../hooks/usePushNotifications';
import socketService from '../hooks/useSocket';

export type AppUser = {
  _id: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  staffProfile?: {
    _id: string;
    staffCode: string;
    roleCategory: string;
    specialty?: string;
    responsibleAreaIds?: string[];
    responsibleRoomIds?: string[];
    assignedResidentIds?: string[];
  } | null;
};

type AuthState = {
  user: AppUser | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: AppUser) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthState>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    // Must run before clearing the stored token — the request interceptor reads it from
    // AsyncStorage on every call, so unregistering after removal would go out unauthenticated.
    await unregisterPushToken();
    // Socket.IO là singleton ở tầng module và `connect()` trả về ngay instance đã có, nên nếu
    // không ngắt ở đây thì kết nối vẫn sống sau khi đăng xuất VỚI TOKEN CỦA NGƯỜI DÙNG CŨ —
    // và lần đăng nhập sau sẽ tái sử dụng đúng socket đó, khiến tài khoản mới nhận sự kiện
    // realtime dưới danh tính tài khoản cũ (rò rỉ phiên trên máy dùng chung).
    socketService.disconnect();
    await AsyncStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setLogoutCallback(logout);
  }, [logout]);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        if (!storedToken) return;
        setToken(storedToken);
        const res = await api.get(AUTH.ME, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        setUser(res.data);
      } catch {
        await AsyncStorage.removeItem('token');
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (newToken: string, _newUser: AppUser) => {
    await AsyncStorage.setItem('token', newToken);
    setToken(newToken);
    try {
      const res = await api.get(AUTH.ME, {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      setUser(res.data);
    } catch {
      setUser(_newUser);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await api.get(AUTH.ME);
    setUser(res.data);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
