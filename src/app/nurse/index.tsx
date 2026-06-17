import { useEffect } from 'react';
import { ScrollView, View, StyleSheet, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/hooks/use-auth';
import { Colors, Spacing, Radius, Shadow } from '@/constants/theme';

const STAT_CARDS = [
  { icon: '🛏️', label: 'Cư dân', value: '24', sub: 'đang chăm sóc', color: '#1565C0', bg: '#E3F2FD' },
  { icon: '💊', label: 'Thuốc hôm nay', value: '8', sub: 'lịch trình', color: '#6A1B9A', bg: '#F3E5F5' },
  { icon: '📋', label: 'Báo cáo', value: '3', sub: 'chờ xử lý', color: '#E65100', bg: '#FFF3E0' },
  { icon: '⚠️', label: 'Cảnh báo', value: '1', sub: 'khẩn cấp', color: '#C62828', bg: '#FFEBEE' },
];

const TODAY_MEDS = [
  { time: '08:00', name: 'Amlodipin 5mg', resident: 'Bà Nguyễn Thị Lan', room: 'P.101', status: 'done' },
  { time: '10:00', name: 'Metformin 500mg', resident: 'Ông Trần Văn Hùng', room: 'P.203', status: 'pending' },
  { time: '12:00', name: 'Atorvastatin 10mg', resident: 'Bà Lê Thị Hoa', room: 'P.105', status: 'pending' },
  { time: '14:00', name: 'Bisoprolol 2.5mg', resident: 'Ông Phạm Văn Nam', room: 'P.302', status: 'upcoming' },
];

function AnimCard({ children, delay, style }: { children: React.ReactNode; delay: number; style?: any }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 400 }));
  }, []);
  const anim = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: translateY.value }] }));
  return <Animated.View style={[anim, style]}>{children}</Animated.View>;
}

export default function NurseDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Chào buổi sáng';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <AnimCard delay={0}>
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.greeting}>{greeting()},</ThemedText>
            <ThemedText style={styles.userName}>{user?.fullName ?? 'Điều dưỡng'} 👩‍⚕️</ThemedText>
            <ThemedText style={styles.dateText}>
              {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </ThemedText>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.notifBtn}>
              <ThemedText style={styles.notifIcon}>🔔</ThemedText>
              <View style={styles.notifBadge}><ThemedText style={styles.notifBadgeText}>2</ThemedText></View>
            </Pressable>
            <Pressable style={styles.avatarBtn} onPress={logout}>
              <ThemedText style={styles.avatarText}>{(user?.fullName ?? 'N')[0]}</ThemedText>
            </Pressable>
          </View>
        </View>
      </AnimCard>

      {/* Stat cards */}
      <AnimCard delay={100}>
        <View style={styles.statsGrid}>
          {STAT_CARDS.map((s, i) => (
            <Pressable key={i} style={[styles.statCard, { backgroundColor: s.bg }]}>
              <ThemedText style={styles.statIcon}>{s.icon}</ThemedText>
              <ThemedText style={[styles.statValue, { color: s.color }]}>{s.value}</ThemedText>
              <ThemedText style={styles.statLabel}>{s.label}</ThemedText>
              <ThemedText style={styles.statSub}>{s.sub}</ThemedText>
            </Pressable>
          ))}
        </View>
      </AnimCard>

      {/* Quick actions */}
      <AnimCard delay={200}>
        <SectionHeader title="Thao tác nhanh" />
        <View style={styles.actionRow}>
          {[
            { icon: '👥', label: 'Cư dân', color: '#1565C0' },
            { icon: '💊', label: 'Thuốc', color: '#6A1B9A' },
            { icon: '📋', label: 'Báo cáo', color: '#E65100' },
            { icon: '📊', label: 'Chỉ số', color: '#2E7D32' },
          ].map((a, i) => (
            <Pressable key={i} style={styles.actionBtn}>
              <View style={[styles.actionIcon, { backgroundColor: `${a.color}18` }]}>
                <ThemedText style={styles.actionIconText}>{a.icon}</ThemedText>
              </View>
              <ThemedText style={styles.actionLabel}>{a.label}</ThemedText>
            </Pressable>
          ))}
        </View>
      </AnimCard>

      {/* Medication timeline */}
      <AnimCard delay={300}>
        <SectionHeader title="Lịch dùng thuốc hôm nay" action="Xem tất cả" />
        <View style={styles.timelineCard}>
          {TODAY_MEDS.map((med, i) => (
            <View key={i} style={[styles.timelineRow, i < TODAY_MEDS.length - 1 && styles.timelineRowBorder]}>
              <View style={styles.timelineLeft}>
                <ThemedText style={styles.timelineTime}>{med.time}</ThemedText>
                <View style={[styles.timelineDot, {
                  backgroundColor: med.status === 'done' ? Colors.success : med.status === 'pending' ? Colors.warning : Colors.border,
                }]} />
                {i < TODAY_MEDS.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.timelineContent}>
                <ThemedText style={styles.timelineMed}>{med.name}</ThemedText>
                <ThemedText style={styles.timelineResident}>{med.resident} · {med.room}</ThemedText>
                <View style={[styles.statusTag, {
                  backgroundColor: med.status === 'done' ? '#E8F5E9' : med.status === 'pending' ? '#FFF3E0' : Colors.borderLight,
                }]}>
                  <ThemedText style={[styles.statusTagText, {
                    color: med.status === 'done' ? Colors.success : med.status === 'pending' ? Colors.warning : Colors.textMuted,
                  }]}>
                    {med.status === 'done' ? '✓ Đã cho uống' : med.status === 'pending' ? '⏳ Chờ xử lý' : '🕐 Sắp tới'}
                  </ThemedText>
                </View>
              </View>
            </View>
          ))}
        </View>
      </AnimCard>

    </ScrollView>
  );
}

function SectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      {action && <Pressable><ThemedText style={styles.sectionAction}>{action}</ThemedText></Pressable>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: Colors.nurse, borderRadius: Radius.lg, padding: Spacing.four, ...Shadow.md },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 2 },
  userName: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  dateText: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  notifBtn: { position: 'relative', padding: Spacing.one },
  notifIcon: { fontSize: 24 },
  notifBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: Colors.error, borderRadius: Radius.full, width: 16, height: 16, justifyContent: 'center', alignItems: 'center' },
  notifBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  avatarBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  statCard: { flex: 1, minWidth: '45%', borderRadius: Radius.lg, padding: Spacing.three, gap: 2, ...Shadow.sm },
  statIcon: { fontSize: 24, marginBottom: Spacing.one },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  statSub: { fontSize: 11, color: Colors.textSecondary },

  actionRow: { flexDirection: 'row', gap: Spacing.two },
  actionBtn: { flex: 1, alignItems: 'center', gap: Spacing.one },
  actionIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  actionIconText: { fontSize: 26 },
  actionLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500', textAlign: 'center' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.two },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  sectionAction: { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  timelineCard: { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.three, ...Shadow.sm },
  timelineRow: { flexDirection: 'row', gap: Spacing.two, paddingBottom: Spacing.three, marginBottom: Spacing.three },
  timelineRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  timelineLeft: { alignItems: 'center', width: 50 },
  timelineTime: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: Spacing.one },
  timelineDot: { width: 12, height: 12, borderRadius: 6 },
  timelineLine: { width: 2, flex: 1, backgroundColor: Colors.divider, marginTop: Spacing.one },
  timelineContent: { flex: 1, gap: 3 },
  timelineMed: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  timelineResident: { fontSize: 12, color: Colors.textSecondary },
  statusTag: { alignSelf: 'flex-start', paddingVertical: 2, paddingHorizontal: Spacing.one, borderRadius: Radius.sm },
  statusTagText: { fontSize: 11, fontWeight: '600' },
});
