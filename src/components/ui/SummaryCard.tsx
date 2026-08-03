import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppCard } from './AppCard';
import { COLORS, SPACING } from '../../theme/designSystem';

type Props = {
  icon: string;
  value: string | number;
  label: string;
  color?: string;
  onPress?: () => void;
};

// One of the two large floating cards that overlap the Home hero header —
// same shape for every role, only the icon/value/label content changes.
export const SummaryCard: React.FC<Props> = ({ icon, value, label, color = COLORS.primary, onPress }) => (
  <AppCard floating style={styles.card} onPress={onPress}>
    <View style={[styles.iconWrap, { backgroundColor: color + '18' }]}>
      <MaterialCommunityIcons name={icon as any} size={22} color={color} />
    </View>
    <Text style={styles.value} numberOfLines={1}>{value}</Text>
    <Text style={styles.label} numberOfLines={1}>{label}</Text>
  </AppCard>
);

const styles = StyleSheet.create({
  card: { flex: 1 },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm,
  },
  value: { fontSize: 19, fontWeight: '800', color: COLORS.dark },
  label: { fontSize: 12, color: COLORS.gray500, marginTop: 2 },
});
