import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useThemeMode, ThemeMode } from '../../theme/ThemeContext';
import { useAppTheme } from '../../theme/useAppTheme';
import type { AppColors } from '../../constants/theme';

type Props = { color?: string };

export const ThemeSwitcher: React.FC<Props> = ({ color }) => {
  const { t } = useTranslation();
  const { mode, setMode } = useThemeMode();
  const { colors, roleColor } = useAppTheme();
  const accent = color ?? roleColor;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const options: { value: ThemeMode; label: string }[] = [
    { value: 'light', label: t('profile.themeLight') },
    { value: 'dark', label: t('profile.themeDark') },
    { value: 'system', label: t('profile.themeSystem') },
  ];

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{t('profile.theme')}</Text>
      <View style={styles.chips}>
        {options.map((opt) => (
          <Chip
            key={opt.value}
            selected={mode === opt.value}
            onPress={() => setMode(opt.value)}
            style={mode === opt.value ? { backgroundColor: accent } : undefined}
            textStyle={mode === opt.value ? { color: '#fff' } : undefined}
            compact
          >
            {opt.label}
          </Chip>
        ))}
      </View>
    </View>
  );
};

const createStyles = (c: AppColors) => StyleSheet.create({
  row: { marginTop: 16 },
  label: { fontSize: 13, color: c.textSecondary, marginBottom: 8 },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
