import { Platform } from 'react-native';

const backendHost =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'
    : 'http://localhost:3000';

export const API_BASE_URL = backendHost;
export const AUTH_LOGIN_URL = `${API_BASE_URL}/api/auth/login`;
export const AUTH_ME_URL = `${API_BASE_URL}/api/auth/me`;
export const FAMILY_RESIDENTS_URL = `${API_BASE_URL}/api/family/residents`;
export const getFamilyResidentInvoicesUrl = (residentId: string) =>
  `${API_BASE_URL}/api/family/residents/${encodeURIComponent(residentId)}/invoices`;
export const getFamilyInvoicePaymentUrl = (residentId: string, invoiceId: string) =>
  `${API_BASE_URL}/api/family/residents/${encodeURIComponent(residentId)}/invoices/${encodeURIComponent(invoiceId)}/payment-url`;
export const FAMILY_WALLET_BALANCE_URL = `${API_BASE_URL}/api/family/wallet/balance`;
export const FAMILY_WALLET_TOPUP_URL = `${API_BASE_URL}/api/family/wallet/topup`;
