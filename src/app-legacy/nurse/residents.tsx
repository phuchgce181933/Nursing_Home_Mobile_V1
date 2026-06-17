import { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet, Pressable, TextInput } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius, Shadow } from '@/constants/theme';

const RESIDENTS = [
  { id: '1', name: 'Nguyễn Thị Lan', age: 78, room: 'P.101', condition: 'Ổn định', nurse: 'ĐD. Trần Thị B', avatar: 'NL', risk: 'low' },
  { id: '2', name: 'Trần Văn Hùng', age: 82, room: 'P.203', condition: 'Cần theo dõi', nurse: 'ĐD. Lê Thị C', avatar: 'TH', risk: 'medium' },
  { id: '3', name: 'Lê Thị Hoa', age: 75, room: 'P.105', condition: 'Ổn định', nurse: 'ĐD. Trần Thị B', avatar: 'LH', risk: 'low' },
  { id: '4', name: 'Phạm Văn Nam', age: 89, room: 'P.302', condition: 'Chú ý', nurse: 'ĐD. Nguyễn A', avatar: 'PN', risk: 'high' },
  { id: '5', name: 'Nguyễn Thị Mai', age: 71, room: 'P.208', condition: 'Ổn định', nurse: 'ĐD. Lê Thị C', avatar: 'NM', risk: 'low' },
  { id: '6', name: 'Hoàng Văn Tú', age: 84, room: 'P.110', condition: 'Cần theo dõi', nurse: 'ĐD. Trần Thị B', avatar: 'HT', risk: 'medium' },
];

const RISK_COLOR = { low: Colors.success, medium: Colors.warning, high: Colors.error };
const RISK_LABEL = { low: 'Ổn định', medium: 'Theo dõi', high: 'Khẩn cấp' };

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

export default function NurseResidents() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');

  const filtered = RESIDENTS.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.room.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || r.risk === filter;
    return matchSearch && matchFilter;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      <AnimCard delay={0}>
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Danh sách cư dân</ThemedText>
          <ThemedText style={styles.headerSub}>{RESIDENTS.length} cư dân đang chăm sóc</ThemedText>
        </View>
      </AnimCard>

      <AnimCard delay={60}>
        <View style={styles.searchBar}>
          <ThemedText style={styles.searchIcon}>🔍</ThemedText>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo tên hoặc phòng..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </AnimCard>

      <AnimCard delay={100}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {(['all', 'low', 'medium', 'high'] as const).map(f => (
            <Pressable
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <ThemedText style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'all' ? 'Tất cả' : RISK_LABEL[f]}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </AnimCard>

      <View style={styles.list}>
        {filtered.map((r, i) => (
          <AnimCard key={r.id} delay={140 + i * 50}>
            <Pressable style={styles.card}>
              <View style={[styles.avatar, { borderColor: RISK_COLOR[r.risk as keyof typeof RISK_COLOR] }]}>
                <ThemedText style={styles.avatarText}>{r.avatar}</ThemedText>
              </View>
              <View style={styles.info}>
                <View style={styles.topRow}>
                  <ThemedText style={styles.name}>{r.name}</ThemedText>
                  <View style={[styles.riskBadge, { backgroundColor: `${RISK_COLOR[r.risk as keyof typeof RISK_COLOR]}18` }]}>
                    <ThemedText style={[styles.riskText, { color: RISK_COLOR[r.risk as keyof typeof RISK_COLOR] }]}>
                      {RISK_LABEL[r.risk as keyof typeof RISK_LABEL]}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.detail}>🛏️ {r.room} · {r.age} tuổi</ThemedText>
                <ThemedText style={styles.detail}>👩‍⚕️ {r.nurse}</ThemedText>
              </View>
              <ThemedText style={styles.arrow}>›</ThemedText>
            </Pressable>
          </AnimCard>
        ))}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },

  header: { backgroundColor: Colors.nurse, borderRadius: Radius.lg, padding: Spacing.four, ...Shadow.md },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 3 },

  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.lg, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, gap: Spacing.two, borderWidth: 1, borderColor: Colors.border },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary, paddingVertical: 4 },

  filterRow: { marginBottom: Spacing.one },
  filterBtn: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.three, marginRight: Spacing.two, borderRadius: Radius.full, backgroundColor: Colors.borderLight, borderWidth: 1.5, borderColor: Colors.border },
  filterBtnActive: { backgroundColor: Colors.nurse, borderColor: Colors.nurse },
  filterText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  filterTextActive: { color: '#fff', fontWeight: '700' },

  list: { gap: Spacing.two },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.three, ...Shadow.sm },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  avatarText: { fontSize: 16, fontWeight: '700', color: Colors.nurse },
  info: { flex: 1, gap: 4 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  riskBadge: { paddingVertical: 3, paddingHorizontal: Spacing.two, borderRadius: Radius.full },
  riskText: { fontSize: 11, fontWeight: '700' },
  detail: { fontSize: 12, color: Colors.textSecondary },
  arrow: { fontSize: 20, color: Colors.textMuted },
});
