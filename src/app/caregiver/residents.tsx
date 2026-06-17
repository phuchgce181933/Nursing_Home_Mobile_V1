import { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet, Pressable, TextInput } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius, Shadow } from '@/constants/theme';

const RESIDENTS = [
  { id: '1', name: 'Nguyễn Thị Lan', age: 78, room: 'P.101', needs: ['Hỗ trợ bữa ăn', 'Vệ sinh cá nhân'], avatar: 'NL', tasksDone: 2, tasksTotal: 3 },
  { id: '2', name: 'Trần Văn Hùng', age: 82, room: 'P.203', needs: ['Vật lý trị liệu', 'Di chuyển'], avatar: 'TH', tasksDone: 1, tasksTotal: 2 },
  { id: '3', name: 'Lê Thị Hoa', age: 75, room: 'P.105', needs: ['Hoạt động giải trí'], avatar: 'LH', tasksDone: 1, tasksTotal: 1 },
  { id: '4', name: 'Phạm Văn Nam', age: 89, room: 'P.302', needs: ['Hỗ trợ tinh thần', 'Di chuyển', 'Vệ sinh cá nhân'], avatar: 'PN', tasksDone: 0, tasksTotal: 3 },
  { id: '5', name: 'Nguyễn Thị Mai', age: 71, room: 'P.208', needs: ['Hỗ trợ bữa ăn'], avatar: 'NM', tasksDone: 1, tasksTotal: 1 },
];

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

export default function CaregiverResidents() {
  const [search, setSearch] = useState('');

  const filtered = RESIDENTS.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) || r.room.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      <AnimCard delay={0}>
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Cư dân phụ trách</ThemedText>
          <ThemedText style={styles.headerSub}>{RESIDENTS.length} cư dân</ThemedText>
        </View>
      </AnimCard>

      <AnimCard delay={60}>
        <View style={styles.searchBar}>
          <ThemedText style={styles.searchIcon}>🔍</ThemedText>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </AnimCard>

      <View style={styles.list}>
        {filtered.map((r, i) => {
          const pct = Math.round((r.tasksDone / r.tasksTotal) * 100);
          const allDone = r.tasksDone === r.tasksTotal;
          return (
            <AnimCard key={r.id} delay={100 + i * 60}>
              <Pressable style={styles.card}>
                <View style={[styles.avatar, { borderColor: allDone ? Colors.success : Colors.caregiver }]}>
                  <ThemedText style={styles.avatarText}>{r.avatar}</ThemedText>
                </View>
                <View style={styles.info}>
                  <View style={styles.topRow}>
                    <ThemedText style={styles.name}>{r.name}</ThemedText>
                    <ThemedText style={[styles.pct, { color: allDone ? Colors.success : Colors.caregiver }]}>{pct}%</ThemedText>
                  </View>
                  <ThemedText style={styles.detail}>🛏️ {r.room} · {r.age} tuổi</ThemedText>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: allDone ? Colors.success : Colors.caregiver }]} />
                  </View>
                  <View style={styles.needsRow}>
                    {r.needs.slice(0, 2).map((n, ni) => (
                      <View key={ni} style={styles.needTag}>
                        <ThemedText style={styles.needText}>{n}</ThemedText>
                      </View>
                    ))}
                    {r.needs.length > 2 && (
                      <ThemedText style={styles.moreNeeds}>+{r.needs.length - 2}</ThemedText>
                    )}
                  </View>
                </View>
                <ThemedText style={styles.arrow}>›</ThemedText>
              </Pressable>
            </AnimCard>
          );
        })}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },

  header: { backgroundColor: Colors.caregiver, borderRadius: Radius.lg, padding: Spacing.four, ...Shadow.md },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 3 },

  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.lg, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, gap: Spacing.two, borderWidth: 1, borderColor: Colors.border },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary, paddingVertical: 4 },

  list: { gap: Spacing.two },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.three, ...Shadow.sm },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  avatarText: { fontSize: 16, fontWeight: '700', color: Colors.caregiver },
  info: { flex: 1, gap: 5 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  pct: { fontSize: 14, fontWeight: '800' },
  detail: { fontSize: 12, color: Colors.textSecondary },
  progressBar: { height: 5, backgroundColor: Colors.borderLight, borderRadius: Radius.full },
  progressFill: { height: 5, borderRadius: Radius.full },
  needsRow: { flexDirection: 'row', gap: Spacing.one, flexWrap: 'wrap' },
  needTag: { backgroundColor: '#FFF3E0', paddingVertical: 2, paddingHorizontal: Spacing.one, borderRadius: Radius.sm },
  needText: { fontSize: 10, color: Colors.caregiver, fontWeight: '600' },
  moreNeeds: { fontSize: 11, color: Colors.textMuted, alignSelf: 'center' },
  arrow: { fontSize: 20, color: Colors.textMuted },
});
