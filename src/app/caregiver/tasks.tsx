import { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, withSpring } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius, Shadow } from '@/constants/theme';

type Priority = 'high' | 'medium' | 'low';
type Category = 'meal' | 'hygiene' | 'therapy' | 'social' | 'monitoring';

type Task = {
  id: string;
  icon: string;
  title: string;
  resident: string;
  room: string;
  time: string;
  priority: Priority;
  category: Category;
  done: boolean;
};

const INITIAL_TASKS: Task[] = [
  { id: '1', icon: '🍽️', title: 'Hỗ trợ bữa sáng', resident: 'Bà Nguyễn Thị Lan', room: 'P.101', time: '07:30', priority: 'high', category: 'meal', done: true },
  { id: '2', icon: '🛁', title: 'Vệ sinh cá nhân', resident: 'Ông Trần Văn Hùng', room: 'P.203', time: '09:00', priority: 'high', category: 'hygiene', done: true },
  { id: '3', icon: '🍽️', title: 'Hỗ trợ bữa trưa', resident: 'Bà Lê Thị Hoa', room: 'P.105', time: '11:30', priority: 'high', category: 'meal', done: false },
  { id: '4', icon: '🏃', title: 'Tập vật lý trị liệu', resident: 'Bà Lê Thị Hoa', room: 'P.105', time: '10:30', priority: 'medium', category: 'therapy', done: false },
  { id: '5', icon: '💤', title: 'Kiểm tra giấc ngủ trưa', resident: 'Ông Phạm Văn Nam', room: 'P.302', time: '13:00', priority: 'low', category: 'monitoring', done: false },
  { id: '6', icon: '❤️', title: 'Hỗ trợ tinh thần', resident: 'Bà Nguyễn Thị Mai', room: 'P.208', time: '15:00', priority: 'medium', category: 'social', done: false },
  { id: '7', icon: '🍽️', title: 'Hỗ trợ bữa tối', resident: 'Bà Nguyễn Thị Lan', room: 'P.101', time: '17:30', priority: 'high', category: 'meal', done: false },
];

const PRIORITY_COLOR: Record<Priority, string> = { high: Colors.error, medium: Colors.warning, low: Colors.success };
const PRIORITY_LABEL: Record<Priority, string> = { high: 'Cao', medium: 'TB', low: 'Thấp' };

const CATEGORIES = [
  { id: 'all', label: 'Tất cả', icon: '📋' },
  { id: 'meal', label: 'Bữa ăn', icon: '🍽️' },
  { id: 'hygiene', label: 'Vệ sinh', icon: '🛁' },
  { id: 'therapy', label: 'Trị liệu', icon: '🏃' },
  { id: 'social', label: 'Tinh thần', icon: '❤️' },
];

function CheckableTask({ task, onToggle }: { task: Task; onToggle: (id: string) => void }) {
  const scale = useSharedValue(1);
  const s = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    scale.value = withSpring(0.96, { damping: 8 }, () => { scale.value = withSpring(1); });
    onToggle(task.id);
  };

  return (
    <Animated.View style={s}>
      <Pressable style={[styles.taskCard, task.done && styles.taskCardDone]} onPress={handlePress}>
        <View style={[styles.taskIconBox, { backgroundColor: task.done ? Colors.borderLight : '#FFF3E0' }]}>
          <ThemedText style={styles.taskIcon}>{task.icon}</ThemedText>
        </View>
        <View style={styles.taskInfo}>
          <ThemedText style={[styles.taskTitle, task.done && styles.taskTitleDone]}>{task.title}</ThemedText>
          <ThemedText style={styles.taskResident}>👤 {task.resident} · 🛏️ {task.room}</ThemedText>
          <View style={styles.taskMeta}>
            <View style={styles.taskTime}>
              <ThemedText style={styles.taskTimeText}>🕐 {task.time}</ThemedText>
            </View>
            <View style={[styles.priorityTag, { backgroundColor: `${PRIORITY_COLOR[task.priority]}18` }]}>
              <ThemedText style={[styles.priorityText, { color: PRIORITY_COLOR[task.priority] }]}>
                {PRIORITY_LABEL[task.priority]}
              </ThemedText>
            </View>
          </View>
        </View>
        <View style={[styles.checkBox, task.done && styles.checkBoxDone]}>
          {task.done && <ThemedText style={styles.checkMark}>✓</ThemedText>}
        </View>
      </Pressable>
    </Animated.View>
  );
}

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

export default function CaregiverTasks() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [category, setCategory] = useState<string>('all');

  const done = tasks.filter(t => t.done).length;
  const total = tasks.length;

  const filtered = tasks.filter(t => category === 'all' || t.category === category);

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      <AnimCard delay={0}>
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.headerTitle}>Nhiệm vụ hôm nay</ThemedText>
            <ThemedText style={styles.headerSub}>{done}/{total} hoàn thành</ThemedText>
          </View>
          <View style={styles.progressCircle}>
            <ThemedText style={styles.progressPct}>{Math.round((done / total) * 100)}%</ThemedText>
          </View>
        </View>
      </AnimCard>

      <AnimCard delay={60}>
        <View style={styles.progressBarWrap}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${(done / total) * 100}%` }]} />
          </View>
          <ThemedText style={styles.progressLabel}>{total - done} nhiệm vụ còn lại</ThemedText>
        </View>
      </AnimCard>

      <AnimCard delay={100}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
          {CATEGORIES.map(c => (
            <Pressable
              key={c.id}
              style={[styles.catBtn, category === c.id && styles.catBtnActive]}
              onPress={() => setCategory(c.id)}
            >
              <ThemedText style={styles.catIcon}>{c.icon}</ThemedText>
              <ThemedText style={[styles.catLabel, category === c.id && styles.catLabelActive]}>{c.label}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </AnimCard>

      <View style={styles.taskList}>
        {filtered.map((t, i) => (
          <AnimCard key={t.id} delay={140 + i * 40}>
            <CheckableTask task={t} onToggle={toggleTask} />
          </AnimCard>
        ))}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.caregiver, borderRadius: Radius.lg, padding: Spacing.four, ...Shadow.md },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 3 },
  progressCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)', justifyContent: 'center', alignItems: 'center' },
  progressPct: { fontSize: 14, fontWeight: '800', color: '#fff' },

  progressBarWrap: { gap: Spacing.one },
  progressBarBg: { height: 8, backgroundColor: Colors.borderLight, borderRadius: Radius.full, overflow: 'hidden' },
  progressBarFill: { height: 8, backgroundColor: Colors.caregiver, borderRadius: Radius.full },
  progressLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },

  categoryRow: { marginBottom: Spacing.one },
  catBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: Spacing.one, paddingHorizontal: Spacing.two, marginRight: Spacing.two, borderRadius: Radius.full, backgroundColor: Colors.borderLight, borderWidth: 1.5, borderColor: Colors.border },
  catBtnActive: { backgroundColor: Colors.caregiver, borderColor: Colors.caregiver },
  catIcon: { fontSize: 14 },
  catLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  catLabelActive: { color: '#fff', fontWeight: '700' },

  taskList: { gap: Spacing.two },
  taskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.two, ...Shadow.sm },
  taskCardDone: { opacity: 0.65 },
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
  priorityText: { fontSize: 11, fontWeight: '700' },
  checkBox: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  checkBoxDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  checkMark: { fontSize: 14, color: '#fff', fontWeight: '800' },
});
