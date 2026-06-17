import { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius, Shadow } from '@/constants/theme';

type NotifType = 'health' | 'payment' | 'visit' | 'info';

type Notif = {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
};

const NOTIFS: Notif[] = [
  { id: '1', type: 'health', title: 'Cập nhật sức khỏe', body: 'Kết quả đo huyết áp của bà Nguyễn Thị Lan hôm nay: 120/80 mmHg — bình thường.', time: '08:30', read: false },
  { id: '2', type: 'payment', title: 'Hóa đơn tháng 6', body: 'Hóa đơn #HD-2026-06 đã được xuất. Tổng tiền: 4.500.000₫. Hạn thanh toán: 30/06/2026.', time: 'Hôm qua', read: false },
  { id: '3', type: 'visit', title: 'Lịch thăm đã xác nhận', body: 'Lịch thăm ngày 20/06/2026 lúc 14:00 đã được xác nhận. Phòng tiếp khách A.', time: '2 ngày trước', read: true },
  { id: '4', type: 'health', title: 'Nhắc uống thuốc', body: 'Bà Nguyễn Thị Lan đã uống đầy đủ thuốc hôm nay. Điều dưỡng Trần Thị B xác nhận lúc 08:15.', time: '3 ngày trước', read: true },
  { id: '5', type: 'info', title: 'Thông báo từ viện dưỡng lão', body: 'Viện An Nhiên tổ chức hoạt động văn nghệ ngày 25/06/2026. Gia đình được mời tham dự.', time: '4 ngày trước', read: true },
];

const TYPE_CONFIG: Record<NotifType, { icon: string; color: string; bg: string }> = {
  health: { icon: '❤️', color: Colors.error, bg: '#FFEBEE' },
  payment: { icon: '💰', color: Colors.warning, bg: '#FFF8E1' },
  visit: { icon: '📅', color: Colors.primary, bg: '#E8F5E9' },
  info: { icon: 'ℹ️', color: Colors.info, bg: '#E3F2FD' },
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

export default function NotificationsScreen() {
  const [notifs, setNotifs] = useState<Notif[]>(NOTIFS);
  const unread = notifs.filter(n => !n.read).length;

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  const markRead = (id: string) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      <AnimCard delay={0}>
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.headerTitle}>Thông báo</ThemedText>
            {unread > 0 && (
              <ThemedText style={styles.headerSub}>{unread} thông báo chưa đọc</ThemedText>
            )}
          </View>
          {unread > 0 && (
            <Pressable style={styles.markAllBtn} onPress={markAllRead}>
              <ThemedText style={styles.markAllText}>Đọc tất cả</ThemedText>
            </Pressable>
          )}
        </View>
      </AnimCard>

      {notifs.map((n, i) => {
        const cfg = TYPE_CONFIG[n.type];
        return (
          <AnimCard key={n.id} delay={60 + i * 60}>
            <Pressable style={[styles.card, !n.read && styles.cardUnread]} onPress={() => markRead(n.id)}>
              {!n.read && <View style={styles.unreadDot} />}
              <View style={[styles.iconBox, { backgroundColor: cfg.bg }]}>
                <ThemedText style={styles.iconText}>{cfg.icon}</ThemedText>
              </View>
              <View style={styles.info}>
                <View style={styles.topRow}>
                  <ThemedText style={[styles.notifTitle, !n.read && styles.notifTitleUnread]}>{n.title}</ThemedText>
                  <ThemedText style={styles.time}>{n.time}</ThemedText>
                </View>
                <ThemedText style={styles.body} numberOfLines={2}>{n.body}</ThemedText>
              </View>
            </Pressable>
          </AnimCard>
        );
      })}

      {notifs.every(n => n.read) && (
        <AnimCard delay={200}>
          <View style={styles.emptyBox}>
            <ThemedText style={styles.emptyIcon}>🔔</ThemedText>
            <ThemedText style={styles.emptyText}>Tất cả đã được đọc</ThemedText>
          </View>
        </AnimCard>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: Colors.family, borderRadius: Radius.lg, padding: Spacing.four, marginBottom: Spacing.one, ...Shadow.md },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 3 },
  markAllBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: Spacing.one, paddingHorizontal: Spacing.two, borderRadius: Radius.full },
  markAllText: { fontSize: 12, color: '#fff', fontWeight: '600' },

  card: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.two, position: 'relative', ...Shadow.sm },
  cardUnread: { backgroundColor: '#F1F8E9', borderWidth: 1, borderColor: `${Colors.primary}30` },
  unreadDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  iconBox: { width: 44, height: 44, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
  iconText: { fontSize: 22 },
  info: { flex: 1, gap: 4 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  notifTitle: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary, flex: 1, marginRight: Spacing.two },
  notifTitleUnread: { fontWeight: '700', color: Colors.textPrimary },
  time: { fontSize: 11, color: Colors.textMuted },
  body: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },

  emptyBox: { alignItems: 'center', paddingVertical: Spacing.six },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.two },
  emptyText: { fontSize: 15, color: Colors.textMuted, fontWeight: '500' },
});
