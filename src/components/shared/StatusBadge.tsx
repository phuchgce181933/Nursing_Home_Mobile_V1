import React from 'react';
import { Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { getStatusEntry } from '../../utils/statusMap';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = {
  status?: string | null;
  size?: 'sm' | 'md';
};

export const StatusBadge: React.FC<Props> = ({ status, size = 'md' }) => {
  const { t } = useTranslation();
  const { effectiveScheme } = useThemeMode();
  const entry = getStatusEntry(status, effectiveScheme);
  const fontSize = size === 'sm' ? 10 : 11;
  const paddingH = size === 'sm' ? 8 : 10;
  const label = entry.i18nKey ? t(entry.i18nKey, { defaultValue: status ?? '' }) : (status ?? '');

  return (
    <Chip
      compact
      textStyle={{ fontSize, color: entry.textColor, fontWeight: '600' }}
      style={{
        backgroundColor: entry.bgColor,
        paddingHorizontal: paddingH,
        // minHeight (not height): a hard height can clip the label on longer status
        // strings, since Paper's Chip has its own internal vertical padding/line-height.
        minHeight: size === 'sm' ? 24 : 28,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {label}
    </Chip>
  );
};
