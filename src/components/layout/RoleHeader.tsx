import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type StatItem = { value: string | number; label: string };

type Props = {
  title: string;
  subtitle?: string;
  stats?: StatItem[];
  roleColor: string;
};

export const RoleHeader: React.FC<Props> = ({ title, subtitle, stats, roleColor }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: roleColor, paddingTop: insets.top + 12 }]}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {stats && stats.length > 0 ? (
        <View style={styles.statsRow}>
          {stats.map((s, i) => (
            <View key={i} style={styles.statPill}>
              <Text style={[styles.statValue, { color: roleColor }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: roleColor }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingBottom: 16 },
  title: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  statsRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
  statPill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 8,
    alignItems: 'center',
  },
  statValue: { fontSize: 16, fontWeight: '700' },
  statLabel: { fontSize: 10, marginTop: 2, opacity: 0.7 },
});
