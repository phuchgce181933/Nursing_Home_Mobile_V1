import { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/hooks/use-auth';
import { Colors, Spacing, Radius, Shadow } from '@/constants/theme';

const VITALS = [
  { icon: '❤️', label: 'Nhịp tim', value: '72', unit: 'bpm', status: 'normal', trend: '→' },
  { icon: '🩸', label: 'Huyết áp', value: '120/80', unit: 'mmHg', status: 'normal', trend: '↓' },
  { icon: '🌡️', label: 'Nhiệt độ', value: '36.8', unit: '°C', status: 'normal', trend: '→' },
  { icon: '🫁', label: 'SpO2', value: '98', unit: '%', status: 'normal', trend: '→' },
  { icon: '⚖️', label: 'Cân nặng', value: '58', unit: 'kg', status: 'normal', trend: '↑' },
  { icon: '🩺', label: 'Đường huyết', value: '5.6', unit: 'mmol/L', status: 'caution', trend: '↑' },
];

const HISTORY = [
  { date: '15/06/2026', type: 'Đo huyết áp', result: '120/80 mmHg', doctor: 'BS. Nguyễn Văn A', ok: true },
  { date: '14/06/2026', type: 'Kiểm tra đường huyết', result: '5.6 mmol/L', doctor: 'ĐD. Trần Thị B', ok: true },
  { date: '12/06/2026', type: 'Đo nhiệt độ', result: '37.2 °C', doctor: 'ĐD. Lê Thị C', ok: false },
  { date: '10/06/2026', type: 'Cân nặng', result: '58 kg', doctor: 'ĐD. Trần Thị B', ok: true },
];

const STATUS_COLOR = { normal: Colors.success, caution: Colors.warning, alert: Colors.error };

function AnimCard({ children, delay }: { children: React.ReactNode; delay: number }) {
  const opacity = useSharedValue(0);
  const ty = useSharedValue(20);
  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    ty.value = withDelay(delay, withTiming(0, { duration: 400 }));
  }, []);
  const s = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: ty.value }] }));
  return <Animated.View style={s}>{children}</Animated.View>;
}

export default function HealthScreen() {
  const { user } = useAuth();
  const [selectedResident] = useState('Bà Nguyễn Thị Lan');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      <AnimCard delay={0}>
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.headerSub}>Sức khỏe của</ThemedText>
            <ThemedText style={styles.headerName}>{selectedResident}</ThemedText>
          </View>
          <View style={styles.statusBadge}>
            <ThemedText style={styles.statusText}>✓ Ổn định</ThemedText>
          </View>
        </View>
      </AnimCard>

      <AnimCard delay={80}>
        <ThemedText style={styles.sectionTitle}>Chỉ số hiện tại</ThemedText>
        <View style={styles.vitalsGrid}>
          {VITALS.map((v, i) => (
            <View key={i} style={[styles.vitalCard, { borderTopColor: STATUS_COLOR[v.status as keyof typeof STATUS_COLOR] }]}>
              <ThemedText style={styles.vitalIcon}>{v.icon}</ThemedText>
              <ThemedText style={styles.vitalLabel}>{v.label}</ThemedText>
              <View style={styles.vitalRow}>
                <ThemedText style={[styles.vitalValue, { color: STATUS_COLOR[v.status as keyof typeof STATUS_COLOR] }]}>
                  {v.value}
                </ThemedText>
                <ThemedText style={styles.vitalTrend}>{v.trend}</ThemedText>
              </View>
              <ThemedText style={styles.vitalUnit}>{v.unit}</ThemedText>
            </View>
          ))}
        </View>
      </AnimCard>

      <AnimCard delay={160}>
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Lịch sử đo lường</ThemedText>
          <ThemedText style={styles.sectionSub}>7 ngày gần nhất</ThemedText>
        </View>
        <View style={styles.historyList}>
          {HISTORY.map((h, i) => (
            <View key={i} style={styles.historyCard}>
              <View style={[styles.historyDot, { backgroundColor: h.ok ? Colors.success : Colors.warning }]} />
              <View style={styles.historyInfo}>
                <View style={styles.historyTop}>
                  <ThemedText style={styles.historyType}>{h.type}</ThemedText>
                  <ThemedText style={styles.historyDate}>{h.date}</ThemedText>
                </View>
                <ThemedText style={[styles.historyResult, { color: h.ok ? Colors.textPrimary : Colors.warning }]}>
                  {h.result}
                </ThemedText>
                <ThemedText style={styles.historyDoctor}>👩‍⚕️ {h.doctor}</ThemedText>
              </View>
            </View>
          ))}
        </View>
      </AnimCard>

      <AnimCard delay={240}>
        <View style={styles.noteCard}>
          <ThemedText style={styles.noteTitle}>📋 Ghi chú y tế</ThemedText>
          <ThemedText style={styles.noteText}>
            Cư dân đang trong giai đoạn ổn định. Huyết áp được kiểm soát tốt với thuốc hiện tại. Theo dõi đường huyết hàng ngày.
          </ThemedText>
          <ThemedText style={styles.noteDoctor}>— BS. Nguyễn Văn A, 15/06/2026</ThemedText>
        </View>
      </AnimCard>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.family, borderRadius: Radius.lg, padding: Spacing.four, ...Shadow.md },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  headerName: { fontSize: 18, fontWeight: '700', color: '#fff', marginTop: 2 },
  statusBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: Spacing.one, paddingHorizontal: Spacing.two, borderRadius: Radius.full },
  statusText: { fontSize: 12, color: '#fff', fontWeight: '700' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.two },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.two },
  sectionSub: { fontSize: 12, color: Colors.textSecondary },

  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  vitalCard: { width: '47%', backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.three, borderTopWidth: 3, ...Shadow.sm },
  vitalIcon: { fontSize: 22, marginBottom: Spacing.one },
  vitalLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500', marginBottom: 4 },
  vitalRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  vitalValue: { fontSize: 20, fontWeight: '800' },
  vitalTrend: { fontSize: 16, color: Colors.textMuted, marginBottom: 1 },
  vitalUnit: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  historyList: { gap: Spacing.two },
  historyCard: { flexDirection: 'row', gap: Spacing.two, backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.three, ...Shadow.sm },
  historyDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  historyInfo: { flex: 1, gap: 3 },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between' },
  historyType: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  historyDate: { fontSize: 11, color: Colors.textMuted },
  historyResult: { fontSize: 14, fontWeight: '700' },
  historyDoctor: { fontSize: 11, color: Colors.textSecondary },

  noteCard: { backgroundColor: '#E8F5E9', borderRadius: Radius.lg, padding: Spacing.four, borderLeftWidth: 4, borderLeftColor: Colors.primary },
  noteTitle: { fontSize: 14, fontWeight: '700', color: Colors.primaryDark, marginBottom: Spacing.two },
  noteText: { fontSize: 13, color: Colors.textPrimary, lineHeight: 20, marginBottom: Spacing.two },
  noteDoctor: { fontSize: 12, color: Colors.textSecondary, fontStyle: 'italic' },
});
