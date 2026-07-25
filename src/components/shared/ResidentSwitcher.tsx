import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip } from 'react-native-paper';

type Resident = { _id: string; fullName: string };

type Props = {
  residents: Resident[];
  activeId?: string | null;
  onChange: (id: string) => void;
  color?: string;
};

export const ResidentSwitcher: React.FC<Props> = ({ residents, activeId, onChange, color = '#2E7D32' }) => {
  if (!residents || residents.length <= 1) return null;

  return (
    <View style={styles.chipRow}>
      {residents.map((r) => (
        <Chip
          key={r._id}
          selected={activeId === r._id}
          onPress={() => onChange(r._id)}
          style={activeId === r._id ? { backgroundColor: color } : undefined}
          textStyle={activeId === r._id ? { color: '#fff' } : undefined}
          compact
        >
          {r.fullName}
        </Chip>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', gap: 6, padding: 12, flexWrap: 'wrap' },
});
