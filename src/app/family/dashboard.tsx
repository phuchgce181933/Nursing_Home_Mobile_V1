import { useEffect, useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, withSpring,
} from 'react-native-reanimated';
import { useRouter, useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/hooks/use-auth';
import { FAMILY_WALLET_BALANCE_URL } from '@/constants/api';
import { Colors, Spacing, Radius, Shadow } from '@/constants/theme';

type Wallet = { balance: number; totalTopup: number; totalSpent: number };

const FEATURES = [
  { icon: '💰', label: 'Ví tiền',     sub: 'Số dư & nạp tiền',     route: '/family/wallet',        color: Colors.primary,    bg: '#E8F5E9' },
  { icon: '🧾', label: 'Hóa đơn',    sub: 'Xem & thanh toán',      route: '/family/invoices',      color: '#6A1B9A',         bg: '#F3E5F5' },
  { icon: '❤️', label: 'Sức khỏe',   sub: 'Chỉ số & lịch sử',     route: '/family/health',        color: Colors.error,      bg: '#FFEBEE' },
  { icon: '📅', label: 'Lịch thăm',  sub: 'Đặt & xem lịch thăm',  route: '/family/visits',        color: '#0277BD',         bg: '#E1F5FE' },
  { icon: '🔔', label: 'Thông báo',  sub: 'Tin tức & cập nhật',    route: '/family/notifications', color: Colors.warning,    bg: '#FFF8E1' },
  { icon: '💬', label: 'Liên hệ',    sub: 'Nhắn tin điều dưỡng',   route: '/family/contact',       color: '#00838F',         bg: '#E0F7FA' },
] as const;

function AnimCard({ children, delay, style }: { children: React.ReactNode; delay: number; style?: object }) {
  const opacity = useSharedValue(0);
  const ty = useSharedValue(20);
  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    ty.value = withDelay(delay, withTiming(0, { duration: 400 }));
  }, []);
  const s = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: ty.value }] }));
  return <Animated.View pointerEvents="box-none" style={[styles.animCard, s, style]}>{children}</Animated.View>;
}

function FeatureCard({ item, index }: { item: typeof FEATURES[number]; index: number }) {
  const router = useRouter();
  const scale = useSharedValue(1);
  const s = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    scale.value = withSpring(0.94, { damping: 10 }, () => { scale.value = withSpring(1); });
    router.push(item.route as any);
  };

  return (
    <AnimCard delay={200 + index * 60}>
      <Animated.View style={s}>
        <Pressable style={styles.featureCard} onPress={handlePress}>
          <View style={[styles.featureIconBox, { backgroundColor: item.bg }]}>
            <ThemedText style={styles.featureIcon}>{item.icon}</ThemedText>
          </View>
          <View style={styles.featureText}>
            <ThemedText style={styles.featureLabel}>{item.label}</ThemedText>
            <ThemedText style={styles.featureSub}>{item.sub}</ThemedText>
          </View>
          <View style={[styles.featureArrow, { backgroundColor: item.bg }]}>
            <ThemedText style={[styles.featureArrowText, { color: item.color }]}>›</ThemedText>
          </View>
        </Pressable>
      </Animated.View>
    </AnimCard>
  );
}

export default function FamilyDashboard() {
  const { token, user, loading: authLoading, logout } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && (!token || user?.role !== 'family')) {
      router.replace('/login');
    }
  }, [token, user, authLoading]);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const refreshWallet = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(FAMILY_WALLET_BALANCE_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()).data;
        setWallet(data || { balance: 0, totalTopup: 0, totalSpent: 0 });
      }
    } catch { /* silent */ }
  }, [token]);

  useFocusEffect(useCallback(() => { void refreshWallet(); }, [refreshWallet]));

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Chào buổi sáng';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <AnimCard delay={0}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <ThemedText style={styles.headerGreeting}>{greeting()},</ThemedText>
            <ThemedText style={styles.headerName}>{user?.fullName ?? 'Thành viên'}</ThemedText>
            <ThemedText style={styles.headerDate}>
              {new Date().toLocaleDateString('vi-VN', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </ThemedText>
          </View>
          <Pressable style={styles.logoutBtn} onPress={handleLogout}>
            <ThemedText style={styles.logoutText}>Đăng xuất</ThemedText>
          </Pressable>
        </View>
      </AnimCard>

      {/* Wallet summary */}
      <AnimCard delay={100}>
        <Pressable style={styles.walletCard} onPress={() => router.push('/family/wallet' as any)}>
          <View style={styles.walletLeft}>
            <ThemedText style={styles.walletLabel}>💰 Số dư ví</ThemedText>
            <ThemedText style={styles.walletBalance}>
              {wallet ? wallet.balance.toLocaleString('vi-VN') + '₫' : '—'}
            </ThemedText>
            <ThemedText style={styles.walletHint}>Nhấn để xem chi tiết & nạp tiền</ThemedText>
          </View>
          <View style={styles.walletRight}>
            <ThemedText style={styles.walletArrow}>›</ThemedText>
          </View>
        </Pressable>
      </AnimCard>

      {/* Feature grid */}
      <AnimCard delay={160}>
        <ThemedText style={styles.sectionTitle}>Chức năng</ThemedText>
      </AnimCard>

      <View style={styles.featureGrid}>
        {FEATURES.map((item, i) => (
          <FeatureCard key={item.route} item={item} index={i} />
        ))}
      </View>

      {/* Quick notice */}
      <AnimCard delay={560}>
        <View style={styles.noticeCard}>
          <ThemedText style={styles.noticeIcon}>📢</ThemedText>
          <View style={styles.noticeText}>
            <ThemedText style={styles.noticeTitle}>Thông báo từ viện dưỡng lão</ThemedText>
            <ThemedText style={styles.noticeSub}>
              Hoạt động văn nghệ ngày 25/06/2026 · Gia đình được mời tham dự
            </ThemedText>
          </View>
        </View>
      </AnimCard>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: Colors.family,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    ...Shadow.md,
  },
  headerLeft: { flex: 1 },
  headerGreeting: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  headerName: { fontSize: 20, fontWeight: '700', color: '#fff', marginVertical: 2 },
  headerDate: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.md,
    alignSelf: 'flex-start',
  },
  logoutText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    ...Shadow.md,
  },
  walletLeft: { flex: 1 },
  walletLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600', marginBottom: 4 },
  walletBalance: { fontSize: 28, fontWeight: '800', color: Colors.primary, marginBottom: 4 },
  walletHint: { fontSize: 11, color: Colors.textMuted },
  walletRight: { paddingLeft: Spacing.two },
  walletArrow: { fontSize: 28, color: Colors.primary, fontWeight: '300' },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },

  animCard: { width: '100%' },

  featureGrid: { gap: Spacing.two },
  featureCard: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    ...Shadow.sm,
  },
  featureIconBox: {
    width: 52, height: 52,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  featureIcon: { fontSize: 26 },
  featureText: { flex: 1, justifyContent: 'center', gap: 2 },
  featureLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  featureSub: { fontSize: 12, color: Colors.textSecondary },
  featureArrow: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  featureArrowText: { fontSize: 22, fontWeight: '600', lineHeight: 30 },

  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    backgroundColor: '#FFF8E1',
    borderRadius: Radius.lg,
    padding: Spacing.three,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  noticeIcon: { fontSize: 22 },
  noticeText: { flex: 1, gap: 3 },
  noticeTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  noticeSub: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
});
