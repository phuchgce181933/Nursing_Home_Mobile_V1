import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'nursing_home_auth_token';
const isWeb = Platform.OS === 'web';

export async function getAuthToken(): Promise<string | null> {
  if (isWeb) {
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  }
  return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

export async function setAuthToken(token: string) {
  if (isWeb) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

export async function removeAuthToken() {
  if (isWeb) {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}
