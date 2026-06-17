import React from 'react';
import { Chip } from 'react-native-paper';
import { getStatusEntry } from '../../utils/statusMap';

type Props = {
  status?: string | null;
  size?: 'sm' | 'md';
};

export const StatusBadge: React.FC<Props> = ({ status, size = 'md' }) => {
  const entry = getStatusEntry(status);
  const fontSize = size === 'sm' ? 10 : 11;
  const paddingH = size === 'sm' ? 8 : 10;

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
      {entry.label || status || ''}
    </Chip>
  );
};
