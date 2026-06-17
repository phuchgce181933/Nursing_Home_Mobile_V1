import { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius, Shadow } from '@/constants/theme';

type MedStatus = 'done' | 'pending' | 'upcoming' | 'missed';

const SCHEDULE: { time: string; meds: { name: string; dose: string; resident: string; room: string; status: MedStatus }[] }[] = [
  {
    time: '06:00',
    meds: [
      { name: 'Metformin 500mg', dose: '1 viên', resident: 'Ông Trần Văn Hùng', room: 'P.203', status: 'done' },
    ],
  },
  {
    time: '08:00',
    meds: [
      { name: 'Amlodipin 5mg', dose: '1 viên', resident: 'Bà Nguyễn Thị Lan', room: 'P.101', status: 'done' },
      { name: 'Aspirin 100mg', dose: '1 viên', resident: 'Ông Phạm Văn Nam', room: 'P.302', status: 'missed' },
    ],
  },
  {
    time: '12:00',
    meds: [
      { name: 'Atorvastatin 10mg', dose: '1 viên', resident: 'Bà Lê Thị Hoa', room: 'P.105', status: 'pending' },
      { name: 'Omeprazole 20mg', dose: '1 viên', resident: 'Bà Nguyễn Thị Mai', room: 'P.208', status: 'pending' },
    ],
  },
  {
    time: '18:00',
    meds: [
      { name: 'Bisoprolol 2.5mg', dose: '1 viên', resident: 'Ông Phạm Văn Nam', room: 'P.302', status: 'upcoming' },
      { name: 'Metformin 500mg', dose: '1 viên', resident: 'Ông Hoàng Văn Tú', room: 'P.110', status: 'upcoming' },
    ],
  },
];

const STATUS_CONFIG: Record<MedStatus, { label: string; color: string; bg: string; icon: string }> = {
  done: { label: 'Đã cho uống', color: Colors.success, bg: '#E8F5E9', icon: '✓' },
  pending: { label: 'Chờ xử lý', color: Colors.warning, bg: '#FFF3E0', icon: '⏳' },
  upcoming: { label: 'Sắp tới', color: Colors.textMuted, bg: Colors.borderLight, icon: '🕐' },
  missed: { label: 'Bỏ lỡ', color: Colors.error, bg: '#FFEBEE', icon: '✗' },
};

function AnimCard({ children, delay }: { children: React.ReactNode; delay: number }) {
  const opacity = useSharedValue(0);
  const ty = useSharedValue(16);
  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 350 }));
    ty.value = withDelay(delay, withTiming(0, { duration: 350 }));
  }, []);
  const s = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: ty.value }] }));
  return <Animated.View style={s}>{children}</Animated.View>;
}

export default function NurseMedication() {
  const totalMeds = SCHEDULE.reduce((acc, s) => acc + s.meds.length, 0);
  const doneMeds = SCHEDULE.reduce((acc, s) => acc + s.meds.filter(m => m.status === 'done').length, 0);
  const missedMeds = SCHEDULE.reduce((acc, s) => acc + s.meds.filter(m => m.status === 'missed').length, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      <AnimCard delay={0}>
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Lịch dùng thuốc</ThemedText>
          <ThemedText style={styles.headerDate}>
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </ThemedText>
        </View>
      </AnimCard>

      <AnimCard delay={60}>
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { borderTopColor: Colors.success }]}>
            <ThemedText style={[styles.statVal, { color: Colors.success }]}>{doneMeds}</ThemedText>
            <ThemedText style={styles.statLabel}>Đã cho</ThemedText>
          </View>
          <View style={[styles.statBox, { borderTopColor: Colors.warning }]}>
            <ThemedText style={[styles.statVal, { color: Colors.warning }]}>{totalMeds - doneMeds - missedMeds}</ThemedText>
            <ThemedText style={styles.statLabel}>Chờ xử lý</ThemedText>
          </View>
          <View style={[styles.statBox, { borderTopColor: Colors.error }]}>
            <ThemedText style={[styles.statVal, { color: Colors.error }]}>{missedMeds}</ThemedText>
            <ThemedText style={styles.statLabel}>Bỏ lỡ</ThemedText>
          </View>
          <View style={[styles.statBox, { borderTopColor: Colors.nurse }]}>
            <ThemedText style={[styles.statVal, { color: Colors.nurse }]}>{totalMeds}</ThemedText>
            <ThemedText style={styles.statLabel}>Tổng</ThemedText>
          </View>
        </View>
      </AnimCard>

      {SCHEDULE.map((slot, si) => (
        <AnimCard key={slot.time} delay={120 + si * 80}>
          <View style={styles.timeSlot}>
            <View style={styles.timeHeader}>
              <View style={styles.timePill}>
                <ThemedText style={styles.timeText}>{slot.time}</ThemedText>
              </View>
              <View style={styles.timeLine} />
            </View>
            <View style={styles.medList}>
              {slot.meds.map((m, mi) => {
                const cfg = STATUS_CONFIG[m.status];
                return (
                  <View key={mi} style={[styles.medCard, { borderLeftColor: cfg.color }]}>
                    <View style={styles.medTop}>
                      <ThemedText style={styles.medName}>{m.name}</ThemedText>
                      <View style={[styles.statusTag, { backgroundColor: cfg.bg }]}>
                        <ThemedText style={[styles.statusText, { color: cfg.color }]}>
                          {cfg.icon} {cfg.label}
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText style={styles.medDetail}>💊 {m.dose} · 👤 {m.resident} · 🛏️ {m.room}</ThemedText>
                    {m.status === 'pending' && (
                      <Pressable style={[styles.confirmBtn, { backgroundColor: Colors.nurse }]}>
                        <ThemedText style={styles.confirmText}>✓ Xác nhận đã cho uống</ThemedText>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </AnimCard>
      ))}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },

  header: { backgroundColor: Colors.nurse, borderRadius: Radius.lg, padding: Spacing.four, ...Shadow.md },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerDate: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 3 },

  statsRow: { flexDirection: 'row', gap: Spacing.two },
  statBox: { flex: 1, backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.two, alignItems: 'center', borderTopWidth: 3, ...Shadow.sm },
  statVal: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 10, color: Colors.textSecondary, fontWeight: '500', textAlign: 'center' },

  timeSlot: { gap: Spacing.two },
  timeHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  timePill: { backgroundColor: Colors.nurse, paddingVertical: 4, paddingHorizontal: Spacing.two, borderRadius: Radius.full },
  timeText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  timeLine: { flex: 1, height: 1, backgroundColor: Colors.divider },

  medList: { gap: Spacing.two, paddingLeft: Spacing.one },
  medCard: { backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.three, borderLeftWidth: 4, gap: Spacing.two, ...Shadow.sm },
  medTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.two },
  medName: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  statusTag: { paddingVertical: 3, paddingHorizontal: Spacing.one, borderRadius: Radius.sm },
  statusText: { fontSize: 11, fontWeight: '600' },
  medDetail: { fontSize: 12, color: Colors.textSecondary },
  confirmBtn: { paddingVertical: Spacing.two, borderRadius: Radius.md, alignItems: 'center' },
  confirmText: { fontSize: 13, color: '#fff', fontWeight: '700' },
});
