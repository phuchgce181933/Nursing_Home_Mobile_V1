import { useEffect } from 'react';
import { ScrollView, View, StyleSheet, Pressable, Alert } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/hooks/use-auth';
import { Colors, Spacing, Radius, Shadow } from '@/constants/theme';

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

function MenuItem({ icon, label, sub, onPress, danger }: {
  icon: string; label: string; sub?: string; onPress?: () => void; danger?: boolean;
}) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
        <ThemedText style={styles.menuIconText}>{icon}</ThemedText>
      </View>
      <View style={styles.menuInfo}>
        <ThemedText style={[styles.menuLabel, danger && { color: Colors.error }]}>{label}</ThemedText>
        {sub && <ThemedText style={styles.menuSub}>{sub}</ThemedText>}
      </View>
      <ThemedText style={styles.menuArrow}>›</ThemedText>
    </Pressable>
  );
}

export default function FamilyProfile() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);
  };

  const initials = (user?.fullName ?? 'GĐ').split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      <AnimCard delay={0}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <ThemedText style={styles.avatarText}>{initials}</ThemedText>
          </View>
          <ThemedText style={styles.name}>{user?.fullName ?? 'Thành viên gia đình'}</ThemedText>
          <ThemedText style={styles.email}>{user?.email ?? ''}</ThemedText>
          <View style={styles.roleBadge}>
            <ThemedText style={styles.roleText}>👨‍👩‍👧 Gia đình</ThemedText>
          </View>
        </View>
      </AnimCard>

      <AnimCard delay={100}>
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Tài khoản</ThemedText>
          <View style={styles.menuGroup}>
            <MenuItem icon="👤" label="Thông tin cá nhân" sub="Họ tên, email, số điện thoại" />
            <MenuItem icon="🔒" label="Đổi mật khẩu" sub="Cập nhật mật khẩu bảo mật" onPress={() => router.push('/forgot-password' as any)} />
            <MenuItem icon="🔔" label="Cài đặt thông báo" sub="Quản lý thông báo nhận được" />
          </View>
        </View>
      </AnimCard>

      <AnimCard delay={180}>
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Người thân</ThemedText>
          <View style={styles.menuGroup}>
            <MenuItem icon="🛏️" label="Danh sách người thân" sub="Xem và quản lý người thân đang ở viện" />
            <MenuItem icon="📅" label="Lịch thăm" sub="Đặt lịch và xem lịch thăm" />
            <MenuItem icon="💬" label="Liên hệ điều dưỡng" sub="Nhắn tin với điều dưỡng phụ trách" />
          </View>
        </View>
      </AnimCard>

      <AnimCard delay={240}>
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Hỗ trợ</ThemedText>
          <View style={styles.menuGroup}>
            <MenuItem icon="❓" label="Câu hỏi thường gặp" />
            <MenuItem icon="📞" label="Liên hệ viện dưỡng lão" sub="(028) 3456 7890" />
            <MenuItem icon="📋" label="Điều khoản & Chính sách" />
          </View>
        </View>
      </AnimCard>

      <AnimCard delay={300}>
        <View style={styles.section}>
          <View style={styles.menuGroup}>
            <MenuItem icon="🚪" label="Đăng xuất" danger onPress={handleLogout} />
          </View>
        </View>
      </AnimCard>

      <AnimCard delay={360}>
        <ThemedText style={styles.version}>Viện dưỡng lão An Nhiên · v1.0.0</ThemedText>
      </AnimCard>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },

  profileHeader: { backgroundColor: Colors.family, borderRadius: Radius.xl, padding: Spacing.five, alignItems: 'center', ...Shadow.md },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.three },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  name: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 4 },
  email: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: Spacing.two },
  roleBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: Spacing.one, paddingHorizontal: Spacing.three, borderRadius: Radius.full },
  roleText: { fontSize: 12, color: '#fff', fontWeight: '600' },

  section: { gap: Spacing.two },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, paddingLeft: Spacing.one },

  menuGroup: { backgroundColor: Colors.card, borderRadius: Radius.lg, overflow: 'hidden', ...Shadow.sm },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.three, gap: Spacing.three, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  menuIcon: { width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  menuIconDanger: { backgroundColor: '#FFEBEE' },
  menuIconText: { fontSize: 20 },
  menuInfo: { flex: 1 },
  menuLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  menuSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  menuArrow: { fontSize: 20, color: Colors.textMuted },

  version: { textAlign: 'center', fontSize: 12, color: Colors.textMuted, paddingBottom: Spacing.two },
});
