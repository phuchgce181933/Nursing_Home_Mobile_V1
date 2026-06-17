import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/hooks/use-auth';
import {
  FAMILY_RESIDENTS_URL,
  getFamilyResidentInvoicesUrl,
  getFamilyInvoicePaymentUrl,
} from '@/constants/api';
import { Colors, Spacing, Radius, Shadow } from '@/constants/theme';

type Invoice = {
  _id: string;
  invoiceNumber: string;
  status: string;
  issuedAt: string;
  dueDate?: string;
  totalAmount: number;
};
type Resident = { _id: string; fullName: string };

const STATUS_COLOR: Record<string, string> = {
  issued: Colors.error,
  paid: Colors.success,
  partially_paid: Colors.warning,
  overdue: Colors.error,
};
const STATUS_LABEL: Record<string, string> = {
  issued: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
  partially_paid: 'Thanh toán một phần',
  overdue: 'Quá hạn',
};

function AnimCard({ children, delay }: { children: React.ReactNode; delay: number }) {
  const opacity = useSharedValue(0);
  const ty = useSharedValue(16);
  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 380 }));
    ty.value = withDelay(delay, withTiming(0, { duration: 380 }));
  }, []);
  const s = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: ty.value }] }));
  return <Animated.View style={s}>{children}</Animated.View>;
}

export default function InvoicesScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const res = await fetch(FAMILY_RESIDENTS_URL, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Lỗi tải người thân');
        const data: Resident[] = await res.json();
        setResidents(data);
        if (data.length > 0) setSelectedId(data[0]._id);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Lỗi không xác định');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [token]);

  useEffect(() => {
    if (!selectedId || !token) return;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const res = await fetch(getFamilyResidentInvoicesUrl(selectedId), { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Lỗi tải hóa đơn');
        setInvoices((await res.json()).data || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Lỗi không xác định');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [selectedId, token]);

  const handlePay = async (residentId: string, invoiceId: string) => {
    if (!token) return;
    try {
      const res = await fetch(getFamilyInvoicePaymentUrl(residentId, invoiceId), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Không lấy được URL');
      const url = (await res.json()).data?.paymentUrl;
      if (!url) throw new Error('Không nhận được URL thanh toán');
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Lỗi khi mở thanh toán');
    }
  };

  const unpaid = invoices.filter(i => i.status !== 'paid').length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      <AnimCard delay={0}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ThemedText style={styles.backText}>‹</ThemedText>
          </Pressable>
          <View style={styles.headerCenter}>
            <ThemedText style={styles.headerTitle}>Hóa đơn</ThemedText>
            {unpaid > 0 && (
              <View style={styles.unpaidBadge}>
                <ThemedText style={styles.unpaidText}>{unpaid} chưa thanh toán</ThemedText>
              </View>
            )}
          </View>
          <View style={{ width: 36 }} />
        </View>
      </AnimCard>

      {/* Resident selector */}
      {residents.length > 1 && (
        <AnimCard delay={60}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {residents.map(r => (
              <Pressable
                key={r._id}
                style={[styles.residentBtn, r._id === selectedId && styles.residentBtnActive]}
                onPress={() => setSelectedId(r._id)}
              >
                <ThemedText style={[styles.residentBtnText, r._id === selectedId && styles.residentBtnTextActive]}>
                  {r.fullName}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </AnimCard>
      )}

      {/* Content */}
      {loading ? (
        <AnimCard delay={100}>
          <View style={styles.emptyBox}>
            <ThemedText style={styles.emptyText}>Đang tải...</ThemedText>
          </View>
        </AnimCard>
      ) : error ? (
        <AnimCard delay={100}>
          <View style={[styles.emptyBox, { backgroundColor: '#FFEBEE' }]}>
            <ThemedText style={{ color: Colors.error, fontWeight: '600' }}>{error}</ThemedText>
          </View>
        </AnimCard>
      ) : invoices.length === 0 ? (
        <AnimCard delay={100}>
          <View style={styles.emptyBox}>
            <ThemedText style={styles.emptyIcon}>🧾</ThemedText>
            <ThemedText style={styles.emptyText}>Không có hóa đơn nào</ThemedText>
          </View>
        </AnimCard>
      ) : (
        <View style={styles.invoiceList}>
          {invoices.map((inv, i) => (
            <AnimCard key={inv._id} delay={100 + i * 60}>
              <View style={[styles.invoiceCard, inv.status !== 'paid' && styles.invoiceCardUnpaid]}>
                <View style={styles.invoiceHeader}>
                  <ThemedText style={styles.invoiceNumber}>{inv.invoiceNumber}</ThemedText>
                  <View style={[styles.badge, { backgroundColor: `${STATUS_COLOR[inv.status] ?? Colors.textMuted}18` }]}>
                    <ThemedText style={[styles.badgeText, { color: STATUS_COLOR[inv.status] ?? Colors.textMuted }]}>
                      {STATUS_LABEL[inv.status] ?? inv.status}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.invoiceRows}>
                  <View style={styles.row}>
                    <ThemedText style={styles.rowLabel}>📅 Ngày xuất</ThemedText>
                    <ThemedText style={styles.rowValue}>{new Date(inv.issuedAt).toLocaleDateString('vi-VN')}</ThemedText>
                  </View>
                  {inv.dueDate && (
                    <View style={styles.row}>
                      <ThemedText style={styles.rowLabel}>⏰ Hạn trả</ThemedText>
                      <ThemedText style={styles.rowValue}>{new Date(inv.dueDate).toLocaleDateString('vi-VN')}</ThemedText>
                    </View>
                  )}
                  <View style={[styles.row, styles.totalRow]}>
                    <ThemedText style={styles.totalLabel}>Tổng tiền</ThemedText>
                    <ThemedText style={styles.totalAmount}>{inv.totalAmount.toLocaleString('vi-VN')}₫</ThemedText>
                  </View>
                </View>
                {inv.status !== 'paid' && selectedId && (
                  <Pressable style={styles.payBtn} onPress={() => handlePay(selectedId, inv._id)}>
                    <ThemedText style={styles.payBtnText}>💳 Thanh toán ngay</ThemedText>
                  </Pressable>
                )}
              </View>
            </AnimCard>
          ))}
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },

  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#6A1B9A', borderRadius: Radius.lg, padding: Spacing.three, ...Shadow.md },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 30, color: '#fff', lineHeight: 36 },
  headerCenter: { flex: 1, alignItems: 'center', gap: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  unpaidBadge: { backgroundColor: 'rgba(255,255,255,0.25)', paddingVertical: 2, paddingHorizontal: Spacing.two, borderRadius: Radius.full },
  unpaidText: { fontSize: 11, color: '#fff', fontWeight: '600' },

  residentBtn: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.three, marginRight: Spacing.two, borderRadius: Radius.full, backgroundColor: Colors.borderLight, borderWidth: 1.5, borderColor: Colors.border },
  residentBtnActive: { backgroundColor: '#6A1B9A', borderColor: '#6A1B9A' },
  residentBtnText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  residentBtnTextActive: { color: '#fff', fontWeight: '700' },

  emptyBox: { padding: Spacing.five, borderRadius: Radius.lg, backgroundColor: Colors.card, alignItems: 'center', gap: Spacing.two },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 14, color: Colors.textMuted },

  invoiceList: { gap: Spacing.three },
  invoiceCard: { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.four, borderWidth: 1, borderColor: Colors.border, gap: Spacing.three, ...Shadow.sm },
  invoiceCardUnpaid: { borderColor: `${Colors.error}30`, borderLeftWidth: 4, borderLeftColor: Colors.error },
  invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invoiceNumber: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  badge: { paddingVertical: 3, paddingHorizontal: Spacing.two, borderRadius: Radius.full },
  badgeText: { fontSize: 11, fontWeight: '700' },

  invoiceRows: { gap: Spacing.two },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontSize: 13, color: Colors.textSecondary },
  rowValue: { fontSize: 13, color: Colors.textPrimary, fontWeight: '500' },
  totalRow: { paddingTop: Spacing.two, borderTopWidth: 1, borderTopColor: Colors.divider, marginTop: Spacing.one },
  totalLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  totalAmount: { fontSize: 16, fontWeight: '800', color: '#6A1B9A' },

  payBtn: { backgroundColor: Colors.success, borderRadius: Radius.md, paddingVertical: Spacing.two, alignItems: 'center' },
  payBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
