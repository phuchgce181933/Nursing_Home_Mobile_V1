import { useMemo } from 'react';
import { useThemeMode } from './ThemeContext';
import { Colors, type AppColors } from '../constants/theme';
import { getRoleColor } from './theme';
import { getHueColors } from '../utils/statusMap';

/** Màu chữ/viền cho hành động trên nền `colors.surface`, đã hợp tương phản ở cả 2 chế độ. */
export type SemanticColors = {
  danger: string;
  success: string;
  warning: string;
  info: string;
  /** Nền nhạt cùng tông, dùng cho chip/viền mảng lớn. */
  dangerSoft: string;
  successSoft: string;
};

export type AppTheme = {
  scheme: 'light' | 'dark';
  isDark: boolean;
  colors: AppColors;
  roleColor: string;
  semantic: SemanticColors;
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
  const semantic = useMemo<SemanticColors>(() => ({
    danger: getHueColors('danger', effectiveScheme).text,
    success: getHueColors('success', effectiveScheme).text,
    warning: getHueColors('warning', effectiveScheme).text,
    info: getHueColors('info', effectiveScheme).text,
    dangerSoft: getHueColors('danger', effectiveScheme).bg,
    successSoft: getHueColors('success', effectiveScheme).bg,
  }), [effectiveScheme]);

  return { scheme: effectiveScheme, isDark: effectiveScheme === 'dark', colors, roleColor, semantic };
};
