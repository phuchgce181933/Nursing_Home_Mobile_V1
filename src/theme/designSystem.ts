// Shared Enterprise Healthcare Mobile Design System — spacing, radius, color and
// shadow tokens used by src/components/ui/* and the redesigned Home screens.
// Brand color stays the project's existing green; nothing here changes branding,
// only makes the existing values consistent and reusable across screens.

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export const RADIUS = {
  card: 20,
  button: 16,
  input: 16,
  sm: 12,
  pill: 999,
} as const;

export const COLORS = {
  primary: '#2E7D32',
  primaryDark: '#1B5E20',
  primaryLight: '#4CAF50',
  primarySoft: '#E8F5E9',
  white: '#FFFFFF',
  gray50: '#FAFAFA',
  gray100: '#F3F4F6',
  gray300: '#D1D5DB',
  gray500: '#6B7280',
  dark: '#111827',
  border: '#E5E7EB',
  success: '#2E7D32',
  warning: '#F59E0B',
  danger: '#DC2626',
} as const;

export const TYPE = {
  h1: { fontSize: 24, fontWeight: '800' as const },
  h2: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  bodyStrong: { fontSize: 14, fontWeight: '600' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
};

// react-native's `shadow*` style props (used here) work on both iOS and Android
// via the Paper/RN Elements interop already relied on elsewhere in this app;
// `elevation` covers plain Android Views that don't go through Paper.
export const SHADOW = {
  card: {
    shadowColor: '#0F2A12',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  floating: {
    shadowColor: '#0F2A12',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

export const BUTTON_HEIGHT = 52;
export const ICON_SIZE = 24;
