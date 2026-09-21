import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const ROLE_COLORS = {
  light: {
    manager: '#1B3A6B',
    nurse: '#0F5040',
    caregiver: '#6B4200',
    family: '#2E7D32',
  },
  // Lighter/more saturated tints so each role accent still reads clearly on a dark surface.
  dark: {
    manager: '#6B8CC7',
    nurse: '#4F9A82',
    caregiver: '#C79A5B',
    family: '#66BB6A',
  },
} as const;

export const STATUS_COLORS = {
  stable:    { bg: '#D1FAE5', text: '#065F46' },
  done:      { bg: '#D1FAE5', text: '#065F46' },
  completed: { bg: '#D1FAE5', text: '#065F46' },
  clean:     { bg: '#D1FAE5', text: '#065F46' },
  TAKEN:     { bg: '#D1FAE5', text: '#065F46' },
  full:      { bg: '#D1FAE5', text: '#065F46' },
  confirmed: { bg: '#D1FAE5', text: '#065F46' },
  resolved:  { bg: '#D1FAE5', text: '#065F46' },
  published: { bg: '#DBEAFE', text: '#1E40AF' },

  monitoring:  { bg: '#FFEDD5', text: '#92400E' },
  pending:     { bg: '#FFEDD5', text: '#92400E' },
  in_progress: { bg: '#FFEDD5', text: '#92400E' },
  PENDING:     { bg: '#FFEDD5', text: '#92400E' },
  OVERDUE:     { bg: '#FFEDD5', text: '#92400E' },
  partial:     { bg: '#FFEDD5', text: '#92400E' },
  draft:       { bg: '#FFEDD5', text: '#92400E' },
  open:        { bg: '#FFEDD5', text: '#92400E' },
  investigating: { bg: '#FFEDD5', text: '#92400E' },

  critical: { bg: '#FEE2E2', text: '#991B1B' },
  missed:   { bg: '#FEE2E2', text: '#991B1B' },
  skipped:  { bg: '#FEE2E2', text: '#991B1B' },
  refused:  { bg: '#FEE2E2', text: '#991B1B' },
  MISSED:   { bg: '#FEE2E2', text: '#991B1B' },
  SKIPPED:  { bg: '#FEE2E2', text: '#991B1B' },
  cancelled:{ bg: '#FEE2E2', text: '#991B1B' },
  closed:   { bg: '#FEE2E2', text: '#991B1B' },

  upcoming:    { bg: '#DBEAFE', text: '#1E40AF' },
  LATE_TAKEN:  { bg: '#DBEAFE', text: '#1E40AF' },
  assisted:    { bg: '#DBEAFE', text: '#1E40AF' },
  available:   { bg: '#DBEAFE', text: '#1E40AF' },
} as const;

export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1B3A6B',
    secondary: '#0F5040',
    tertiary: '#6B4200',
    error: '#991B1B',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    surfaceVariant: '#F0F0F0',
  },
};

export const paperDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#6B8CC7',
    secondary: '#4F9A82',
    tertiary: '#C79A5B',
    error: '#F87171',
    background: '#121212',
    surface: '#1E1E1E',
    surfaceVariant: '#2A2A2A',
  },
};

export const shadeColor = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

export const getRoleColor = (role?: string, scheme: 'light' | 'dark' = 'light'): string => {
  const palette = ROLE_COLORS[scheme];
  if (role === 'manager' || role === 'admin') return palette.manager;
  if (role === 'nurse' || role === 'doctor') return palette.nurse;
  if (role === 'caregiver') return palette.caregiver;
  if (role === 'family') return palette.family;
  return palette.manager;
};
