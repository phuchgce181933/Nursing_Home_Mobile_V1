import { useEffect } from 'react';
import { ScrollView, View, StyleSheet, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/hooks/use-auth';
import { Colors, Spacing, Radius, Shadow } from '@/constants/theme';

const TASKS = [
  { icon: '🍽️', title: 'Hỗ trợ bữa ăn sáng', resident: 'Bà Nguyễn Thị Lan', time: '07:30', priority: 'high', done: true },
  { icon: '🛁', title: 'Vệ sinh cá nhân', resident: 'Ông Trần Văn Hùng', time: '09:00', priority: 'high', done: false },
  { icon: '🏃', title: 'Tập vật lý trị liệu', resident: 'Bà Lê Thị Hoa', time: '10:30', priority: 'medium', done: false },
  { icon: '💤', title: 'Kiểm tra giấc ngủ', resident: 'Ông Phạm Văn Nam', time: '13:00', priority: 'low', done: false },
  { icon: '❤️', title: 'Hỗ trợ tinh thần', resident: 'Bà Nguyễn Thị Mai', time: '15:00', priority: 'medium', done: false },
];

const PRIORITY_COLOR = { high: Colors.error, medium: Colors.warning, low: Colors.success };
const PRIORITY_LABEL = { high: 'Cao', medium: 'Trung bình', low: 'Thấp' };

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

export default function CaregiverDashboard() {
  const { user, logout } = useAuth();
  const done = TASKS.filter(t => t.done).length;
  const total = TASKS.length;
  const pct = Math.round((done / total) * 100);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <AnimCard delay={0}>
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.greeting}>Xin chào,</ThemedText>
            <ThemedText style={styles.userName}>{user?.fullName ?? 'Người chăm sóc'} 🤲</ThemedText>
            <ThemedText style={styles.dateText}>
              {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </ThemedText>
          </View>
          <Pressable style={styles.logoutBtn} onPress={logout}>
            <ThemedText style={styles.logoutText}>Đăng xuất</ThemedText>
          </Pressable>
        </View>
      </AnimCard>

      {/* Progress */}
      <AnimCard delay={100}>
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <ThemedText style={styles.progressTitle}>Tiến độ hôm nay</ThemedText>
              <ThemedText style={styles.progressSub}>{done}/{total} nhiệm vụ hoàn thành</ThemedText>
            </View>
            <View style={styles.progressCircle}>
              <ThemedText style={styles.progressPct}>{pct}%</ThemedText>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
        </View>
      </AnimCard>

      {/* Stats row */}
      <AnimCard delay={150}>
        <View style={styles.statsRow}>
          {[
            { icon: '👥', label: 'Cư dân', value: '5', color: Colors.caregiver },
            { icon: '✅', label: 'Xong', value: String(done), color: Colors.success },
            { icon: '⏳', label: 'Còn lại', value: String(total - done), color: Colors.warning },
          ].map((s, i) => (
            <View key={i} style={[styles.statBox, { borderTopColor: s.color }]}>
              <ThemedText style={styles.statIcon}>{s.icon}</ThemedText>
              <ThemedText style={[styles.statVal, { color: s.color }]}>{s.value}</ThemedText>
              <ThemedText style={styles.statLabel}>{s.label}</ThemedText>
            </View>
          ))}
        </View>
      </AnimCard>

      {/* Tasks */}
      <AnimCard delay={200}>
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Nhiệm vụ hôm nay</ThemedText>
          <View style={[styles.badge, { backgroundColor: `${Colors.caregiver}20` }]}>
            <ThemedText style={[styles.badgeText, { color: Colors.caregiver }]}>{total - done} còn lại</ThemedText>
          </View>
        </View>

        <View style={styles.taskList}>
          {TASKS.map((task, i) => (
            <Pressable key={i} style={[styles.taskCard, task.done && styles.taskCardDone]}>
              <View style={[styles.taskIconBox, { backgroundColor: task.done ? Colors.borderLight : '#FFF3E0' }]}>
                <ThemedText style={styles.taskIcon}>{task.icon}</ThemedText>
              </View>
              <View style={styles.taskInfo}>
                <ThemedText style={[styles.taskTitle, task.done && styles.taskTitleDone]}>{task.title}</ThemedText>
                <ThemedText style={styles.taskResident}>👤 {task.resident}</ThemedText>
                <View style={styles.taskMeta}>
                  <View style={styles.taskTime}>
                    <ThemedText style={styles.taskTimeText}>🕐 {task.time}</ThemedText>
                  </View>
                  <View style={[styles.priorityTag, { backgroundColor: `${PRIORITY_COLOR[task.priority as keyof typeof PRIORITY_COLOR]}18` }]}>
                    <ThemedText style={[styles.priorityText, { color: PRIORITY_COLOR[task.priority as keyof typeof PRIORITY_COLOR] }]}>
                      {PRIORITY_LABEL[task.priority as keyof typeof PRIORITY_LABEL]}
                    </ThemedText>
                  </View>
                </View>
              </View>
              <View style={[styles.checkBox, task.done && styles.checkBoxDone]}>
                {task.done && <ThemedText style={styles.checkMark}>✓</ThemedText>}
              </View>
            </Pressable>
          ))}
        </View>
      </AnimCard>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: Colors.caregiver, borderRadius: Radius.lg, padding: Spacing.four, ...Shadow.md },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  userName: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginVertical: 2 },
  dateText: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: Spacing.one, paddingHorizontal: Spacing.two, borderRadius: Radius.md },
  logoutText: { fontSize: 12, color: '#FFFFFF', fontWeight: '600' },

  progressCard: { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.four, ...Shadow.sm },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.three },
  progressTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  progressSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  progressCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, borderColor: Colors.caregiver, justifyContent: 'center', alignItems: 'center' },
  progressPct: { fontSize: 14, fontWeight: '800', color: Colors.caregiver },
  progressBar: { height: 8, backgroundColor: Colors.borderLight, borderRadius: Radius.full },
  progressFill: { height: 8, backgroundColor: Colors.caregiver, borderRadius: Radius.full },

  statsRow: { flexDirection: 'row', gap: Spacing.two },
  statBox: { flex: 1, backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.three, alignItems: 'center', borderTopWidth: 3, ...Shadow.sm },
  statIcon: { fontSize: 20, marginBottom: Spacing.one },
  statVal: { fontSize: 24, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.two },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  badge: { paddingVertical: 3, paddingHorizontal: Spacing.two, borderRadius: Radius.full },
  badgeText: { fontSize: 11, fontWeight: '700' },

  taskList: { gap: Spacing.two },
  taskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.two, ...Shadow.sm },
  taskCardDone: { opacity: 0.6 },
  taskIconBox: { width: 48, height: 48, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
  taskIcon: { fontSize: 24 },
  taskInfo: { flex: 1, gap: 3 },
  taskTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  taskTitleDone: { textDecorationLine: 'line-through', color: Colors.textMuted },
  taskResident: { fontSize: 12, color: Colors.textSecondary },
  taskMeta: { flexDirection: 'row', gap: Spacing.one, marginTop: 2 },
  taskTime: { backgroundColor: Colors.borderLight, paddingVertical: 2, paddingHorizontal: Spacing.one, borderRadius: Radius.sm },
  taskTimeText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  priorityTag: { paddingVertical: 2, paddingHorizontal: Spacing.one, borderRadius: Radius.sm },
  priorityText: { fontSize: 11, fontWeight: '600' },
  checkBox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  checkBoxDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  checkMark: { fontSize: 14, color: '#fff', fontWeight: '700' },
});
