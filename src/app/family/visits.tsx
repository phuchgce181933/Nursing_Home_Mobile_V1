import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius, Shadow } from '@/constants/theme';

export default function VisitsScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ThemedText style={styles.backText}>‹</ThemedText>
        </Pressable>
        <ThemedText style={styles.headerTitle}>Lịch thăm</ThemedText>
        <View style={{ width: 36 }} />
      </View>
      <View style={styles.body}>
        <ThemedText style={styles.icon}>📅</ThemedText>
        <ThemedText style={styles.title}>Sắp ra mắt</ThemedText>
        <ThemedText style={styles.sub}>Chức năng đặt lịch thăm đang được phát triển.</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0277BD', padding: Spacing.three, gap: Spacing.two, margin: Spacing.three, borderRadius: Radius.lg, ...Shadow.md },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 30, color: '#fff', lineHeight: 36 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#fff' },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.two, padding: Spacing.four },
  icon: { fontSize: 56 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  sub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
});
