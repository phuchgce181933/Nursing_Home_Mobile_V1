import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Device from 'expo-device';

// Physical device (real phone/tablet): đổi IP này thành IP LAN của máy chạy backend.
const LAN_DEV_IP = '192.168.1.12';
const PORT = 3000;

const resolveBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'web') return `http://localhost:${PORT}`;
  if (Platform.OS === 'android') {
    return Device.isDevice ? `http://${LAN_DEV_IP}:${PORT}` : `http://10.0.2.2:${PORT}`;
  }
  // iOS: simulator dùng localhost, thiết bị thật dùng IP LAN
  return Device.isDevice ? `http://${LAN_DEV_IP}:${PORT}` : `http://localhost:${PORT}`;
};

const BASE_URL = resolveBaseUrl();

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

let logoutCallback: (() => void) | null = null;

export const setLogoutCallback = (cb: () => void) => {
  logoutCallback = cb;
};

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      logoutCallback?.();
    }
    return Promise.reject(error);
  },
);

export default api;
