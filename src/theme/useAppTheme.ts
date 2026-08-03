import { useMemo } from 'react';
import { useThemeMode } from './ThemeContext';
import { Colors, type AppColors } from '../constants/theme';
import { getRoleColor } from './theme';

export type AppTheme = {
  scheme: 'light' | 'dark';
  isDark: boolean;
  colors: AppColors;
  roleColor: string;
};

/**
 * Central hook for screen styling. Returns the resolved color palette for the
 * current light/dark scheme plus the caller's role accent, already adjusted
 * for contrast on a dark background. Pair with a `createStyles(colors)`
 * factory + `useMemo` so `StyleSheet.create` stays static per render:
 *
 *   const { colors, roleColor } = useAppTheme('nurse');
 *   const styles = useMemo(() => createStyles(colors), [colors]);
 */
export const useAppTheme = (role?: string): AppTheme => {
  const { effectiveScheme } = useThemeMode();
  const colors = Colors[effectiveScheme];
  const roleColor = useMemo(() => getRoleColor(role, effectiveScheme), [role, effectiveScheme]);

  return { scheme: effectiveScheme, isDark: effectiveScheme === 'dark', colors, roleColor };
};
