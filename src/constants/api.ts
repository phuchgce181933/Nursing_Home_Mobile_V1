import { Platform } from 'react-native';
import * as Device from 'expo-device';

// Physical device (real phone/tablet): đổi IP này thành IP LAN của máy chạy backend.
const LAN_DEV_IP = '192.168.1.12';
const PORT = 3000;

const resolveBackendHost = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'web') return `http://localhost:${PORT}`;
  if (Platform.OS === 'android') {
    return Device.isDevice ? `http://${LAN_DEV_IP}:${PORT}` : `http://10.0.2.2:${PORT}`;
  }
  return Device.isDevice ? `http://${LAN_DEV_IP}:${PORT}` : `http://localhost:${PORT}`;
};

export const API_BASE_URL = resolveBackendHost();
export const AUTH_BASE_URL = `${API_BASE_URL}/api/auth`;
export const AUTH_LOGIN_URL = `${API_BASE_URL}/api/auth/login`;
export const AUTH_ME_URL = `${API_BASE_URL}/api/auth/me`;
export const FAMILY_RESIDENTS_URL = `${API_BASE_URL}/api/family/residents`;
export const getFamilyResidentInvoicesUrl = (residentId: string) =>
  `${API_BASE_URL}/api/family/residents/${encodeURIComponent(residentId)}/invoices`;
export const getFamilyInvoicePaymentUrl = (residentId: string, invoiceId: string) =>
  `${API_BASE_URL}/api/family/residents/${encodeURIComponent(residentId)}/invoices/${encodeURIComponent(invoiceId)}/payment-url`;
export const FAMILY_WALLET_BALANCE_URL = `${API_BASE_URL}/api/family/wallet/balance`;
export const FAMILY_WALLET_TOPUP_URL = `${API_BASE_URL}/api/family/wallet/topup`;
export const FAMILY_WALLET_TOPUP_VERIFY_URL = `${API_BASE_URL}/api/family/wallet/topup/verify`;
