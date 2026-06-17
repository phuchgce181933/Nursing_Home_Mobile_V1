import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = {
  message: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp?: string;
};

const SEVERITY_MAP = {
  critical: { bg: '#FEF2F2', border: '#EF4444', icon: 'alert-outline' as const, iconColor: '#DC2626' },
  warning:  { bg: '#FFFBEB', border: '#F59E0B', icon: 'clock-outline' as const, iconColor: '#D97706' },
  info:     { bg: '#EFF6FF', border: '#3B82F6', icon: 'information-outline' as const, iconColor: '#2563EB' },
};

export const AlertBanner: React.FC<Props> = ({ message, severity, timestamp }) => {
  const config = SEVERITY_MAP[severity];

  return (
    <View style={[styles.container, { backgroundColor: config.bg, borderLeftColor: config.border }]}>
      <MaterialCommunityIcons name={config.icon} size={20} color={config.iconColor} />
      <Text style={styles.message} numberOfLines={2}>{message}</Text>
      {timestamp ? <Text style={styles.time}>{timestamp}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    marginBottom: 8,
    gap: 8,
  },
  message: { flex: 1, fontSize: 13, color: '#374151' },
  time: { fontSize: 11, color: '#9CA3AF' },
});
