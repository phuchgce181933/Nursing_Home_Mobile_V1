import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useThemeMode, ThemeMode } from '../../theme/ThemeContext';

type Props = { color?: string };

export const ThemeSwitcher: React.FC<Props> = ({ color = '#1B3A6B' }) => {
  const { t } = useTranslation();
  const { mode, setMode } = useThemeMode();

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
            style={mode === opt.value ? { backgroundColor: color } : undefined}
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

const styles = StyleSheet.create({
  row: { marginTop: 16 },
  label: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
