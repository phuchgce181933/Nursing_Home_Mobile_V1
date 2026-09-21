import '@/global.css';
import { Platform } from 'react-native';

// Flat legacy palette — kept for any remaining call sites; prefer AppColors (Colors.light/Colors.dark) for anything screen-facing.
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

  // Semantic tokens every screen should read through `useAppTheme()` (src/theme/useAppTheme.ts)
  // instead of hardcoding hex values, so the whole app responds to the light/dark toggle.
  light: {
    // surfaces
    background: '#F5F5F5',
    surface: '#FFFFFF',
    surfaceAlt: '#F9FAFB',
    surfaceMuted: '#E5E7EB',
    // text
    text: '#111827',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    textOnPrimary: '#FFFFFF',
    // borders / dividers
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    divider: '#EEEEEE',
    // overlays / misc
    overlay: 'rgba(0,0,0,0.4)',
    skeleton: '#E5E7EB',
    placeholder: '#9CA3AF',
    // legacy aliases kept so existing `Colors.light.xxx` call sites don't break
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E8F5E9',
    card: '#FFFFFF',
  },
  dark: {
    // surfaces
    background: '#121212',
    surface: '#1E1E1E',
    surfaceAlt: '#262626',
    surfaceMuted: '#2A2A2A',
    // text
    text: '#F3F4F6',
    textSecondary: '#B0B0B0',
    textMuted: '#7A7A7A',
    textOnPrimary: '#FFFFFF',
    // borders / dividers
    border: '#333333',
    borderLight: '#2A2A2A',
    divider: '#2A2A2A',
    // overlays / misc
    overlay: 'rgba(0,0,0,0.6)',
    skeleton: '#2A2A2A',
    placeholder: '#7A7A7A',
    // legacy aliases kept so existing `Colors.dark.xxx` call sites don't break
    backgroundElement: '#1E1E1E',
    backgroundSelected: '#1B5E20',
    card: '#1E1E1E',
  },

  // Role colors (light-mode accents; dark-mode variants live in ROLE_COLORS in theme/theme.ts)
  nurse: '#1565C0',
  caregiver: '#E65100',
  family: '#2E7D32',
} as const;

export type AppColors = { [K in keyof typeof Colors.light]: string };

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
