import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { shadeColor } from '../../theme/theme';
import { COLORS } from '../../theme/designSystem';

type StatItem = { value: string | number; label: string; icon?: string };

type Props = {
  title: string;
  subtitle?: string;
  stats?: StatItem[];
  roleColor: string;
  // Chuông thông báo (mẫu dùng chung mọi vai trò): số chưa đọc lấy từ dữ liệu
  // thật, chỉ hiện khi có `onPressNotifications`.
  unreadCount?: number;
  onPressNotifications?: () => void;
};

export const RoleHeader: React.FC<Props> = ({ title, subtitle, stats, roleColor, unreadCount = 0, onPressNotifications }) => {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[shadeColor(roleColor, -25), roleColor, shadeColor(roleColor, 25)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top + 12 }]}
    >
      <View pointerEvents="none" style={styles.glowLarge} />
      <View pointerEvents="none" style={styles.glowSmall} />

      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {onPressNotifications ? (
          <Pressable onPress={onPressNotifications} style={styles.bellWrap} hitSlop={8}>
            <MaterialCommunityIcons name="bell-outline" size={22} color="#FFFFFF" />
            {unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
      </View>
      {stats && stats.length > 0 ? (
        <View style={styles.statsRow}>
          {stats.map((s, i) => (
            <View key={i} style={styles.statPill}>
              {s.icon ? (
                <View style={[styles.statIconWrap, { backgroundColor: roleColor + '15' }]}>
                  <MaterialCommunityIcons name={s.icon as any} size={16} color={roleColor} />
                </View>
              ) : null}
              <Text style={[styles.statValue, { color: roleColor }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: roleColor }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    // Screens that overlap this header with a rounded content sheet below it (via a
    // negative marginTop) need clearance so the sheet's rounded corner lands below the
    // stat pills instead of cutting across their bottom edge — see FamilyDashboardScreen.
    paddingBottom: 40,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  glowLarge: {
    position: 'absolute',
    top: -60,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  glowSmall: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerText: { flex: 1, marginRight: 12 },
  title: { color: '#FFFFFF', fontSize: 19, fontWeight: '700' },
  subtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 3 },
  bellWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: -2, right: -2,
    minWidth: 17, height: 17, borderRadius: 9,
    backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#FFFFFF',
  },
  badgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  statsRow: { flexDirection: 'row', marginTop: 16, gap: 10 },
  statPill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statIconWrap: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: { fontSize: 17, fontWeight: '700' },
  statLabel: { fontSize: 10.5, marginTop: 2, opacity: 0.7 },
});
