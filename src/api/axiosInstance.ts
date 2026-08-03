import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Device from 'expo-device';

// Physical device (real phone/tablet): set EXPO_PUBLIC_LAN_IP in .env to the LAN IP of the
// machine running the backend. Falls back to a placeholder so a missing .env doesn't crash.
const LAN_DEV_IP = process.env.EXPO_PUBLIC_LAN_IP ?? '172.20.10.2';
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

// eslint-disable-next-line import/no-named-as-default-member -- axios's default export intentionally exposes `.create`
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
    // A 401 from the `protect` middleware (invalid/expired token, deactivated account) means
    // the session itself is dead, so force a logout. But some endpoints (e.g. change-password)
    // also use 401 for a business-logic failure unrelated to the session — those responses
    // carry a specific errorCode (via apiErr/ApiError) that a raw auth-middleware 401 never
    // does, so we use that to avoid logging the user out over e.g. a wrong current password.
    if (error.response?.status === 401 && !error.response?.data?.errorCode) {
      await AsyncStorage.removeItem('token');
      logoutCallback?.();
    }

    // Axios's own `error.message` (e.g. "Request failed with status code 400",
    // "Network Error", "timeout of 15000ms exceeded") is always in English and gets
    // displayed as-is by ScreenLayout/toast() across the app. Rewrite it to the
    // backend's own (Vietnamese) message when available, or a Vietnamese fallback
    // for pure network/timeout failures that never reached the server.
    const backendMessage = error.response?.data?.message;
    if (backendMessage) {
      error.message = backendMessage;
    } else if (error.code === 'ECONNABORTED') {
      error.message = 'Yêu cầu quá thời gian chờ. Vui lòng thử lại.';
    } else if (!error.response) {
      error.message = 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng.';
    } else {
      error.message = 'Đã xảy ra lỗi. Vui lòng thử lại.';
    }

    return Promise.reject(error);
  },
);

export default api;
