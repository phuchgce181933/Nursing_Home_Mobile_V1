import '@/global.css';
import { Platform } from 'react-native';

export const Colors = {
  primary: '#2E7D32',
  primaryLight: '#4CAF50',
  primaryDark: '#1B5E20',
  primaryMid: '#388E3C',
  secondary: '#4FC3F7',
  secondaryDark: '#0288D1',
  accent: '#C8B560',          // gold from logo
  background: '#F8F9FA',
  card: '#FFFFFF',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#E53935',
  info: '#2196F3',
  textPrimary: '#212121',
  textSecondary: '#757575',
  textMuted: '#BDBDBD',
  textWhite: '#FFFFFF',
  border: '#E0E0E0',
  borderLight: '#F5F5F5',
  divider: '#EEEEEE',
  overlay: 'rgba(0,0,0,0.4)',

  light: {
    text: '#212121',
    background: '#F8F9FA',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E8F5E9',
    textSecondary: '#757575',
    card: '#FFFFFF',
    border: '#E0E0E0',
  },
  dark: {
    text: '#FFFFFF',
    background: '#121212',
    backgroundElement: '#1E1E1E',
    backgroundSelected: '#1B5E20',
    textSecondary: '#9E9E9E',
    card: '#1E1E1E',
    border: '#333333',
  },

  // Role colors
  nurse: '#1565C0',
  caregiver: '#E65100',
  family: '#2E7D32',
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const Shadow = {
  sm: {
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    elevation: 2,
  },
  md: {
    boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
    elevation: 4,
  },
  lg: {
    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
    elevation: 8,
  },
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

export type ThemeColor = keyof typeof Colors.light;
