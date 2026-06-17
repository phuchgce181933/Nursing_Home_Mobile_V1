import React, { createContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axiosInstance';
import { setLogoutCallback } from '../api/axiosInstance';
import { AUTH } from '../api/endpoints';

export type AppUser = {
  _id: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl?: string;
  phone?: string;
  gender?: string;
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
};

export const AuthContext = createContext<AuthState>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
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

  const login = useCallback(async (newToken: string, newUser: AppUser) => {
    await AsyncStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
