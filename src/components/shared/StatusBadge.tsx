import React from 'react';
import { Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { getStatusEntry } from '../../utils/statusMap';

type Props = {
  status?: string | null;
  size?: 'sm' | 'md';
};

export const StatusBadge: React.FC<Props> = ({ status, size = 'md' }) => {
  const { t } = useTranslation();
  const entry = getStatusEntry(status);
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
        height: size === 'sm' ? 24 : 28,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {label}
    </Chip>
  );
};
