import { useEffect, useRef, useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Pressable, Modal, TextInput } from 'react-native';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/hooks/use-auth';
import {
  FAMILY_WALLET_BALANCE_URL,
  FAMILY_WALLET_TOPUP_URL,
  FAMILY_WALLET_TOPUP_VERIFY_URL,
} from '@/constants/api';
import { Colors, Spacing, Radius, Shadow } from '@/constants/theme';

type Wallet = { balance: number; totalTopup: number; totalSpent: number };
type TopupStep = 'idle' | 'enter-amount' | 'pick-method' | 'show-qr' | 'success' | 'expired';

const QR_POLL_MS = 3000;
const QR_EXPIRE_MS = 10 * 60 * 1000;

const PAYMENT_METHODS = [
  { id: 'qr',      icon: '📷', title: 'Quét mã QR',          subtitle: 'Dùng app ngân hàng bất kỳ',     color: '#0ea5e9' },
  { id: 'momo',    icon: '🔴', title: 'Ví MoMo',             subtitle: 'Thanh toán qua ứng dụng MoMo',  color: '#ae2070' },
  { id: 'zalopay', icon: '🔵', title: 'ZaloPay',             subtitle: 'Thanh toán qua ZaloPay',        color: '#005ae0' },
  { id: 'card',    icon: '💳', title: 'Thẻ ngân hàng / ATM', subtitle: 'Visa, Mastercard, thẻ nội địa', color: '#7c3aed' },
] as const;

const QUICK_AMOUNTS = [50_000, 100_000, 200_000, 500_000];

const HISTORY = [
  { type: 'topup',   label: 'Nạp tiền',        amount: 200_000, date: '15/06/2026', color: Colors.success },
  { type: 'payment', label: 'Thanh toán HĐ #06', amount: -4_500_000, date: '10/06/2026', color: Colors.error },
  { type: 'topup',   label: 'Nạp tiền',        amount: 500_000, date: '01/06/2026', color: Colors.success },
];

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

export default function WalletScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [wallet, setWallet] = useState<Wallet | null>(null);

  const [step, setStep] = useState<TopupStep>('idle');
  const [topupAmount, setTopupAmount] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [qrAmount, setQrAmount] = useState(0);
  const [pendingTopupId, setPendingTopupId] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expireRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (expireRef.current) { clearTimeout(expireRef.current); expireRef.current = null; }
  };

  const closeAll = () => {
    clearTimers();
    setStep('idle');
    setQrCode(null);
    setCheckoutUrl(null);
    setPendingTopupId(null);
    setTopupAmount('');
  };

  const refreshWallet = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(FAMILY_WALLET_BALANCE_URL, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setWallet((await res.json()).data || { balance: 0, totalTopup: 0, totalSpent: 0 });
    } catch { /* silent */ }
  }, [token]);

  useEffect(() => { void refreshWallet(); }, [refreshWallet]);

  // QR polling
  useEffect(() => {
    if (step !== 'show-qr' || !token || !pendingTopupId) { clearTimers(); return; }

    const check = async () => {
      try {
        const res = await fetch(FAMILY_WALLET_TOPUP_VERIFY_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ topupId: pendingTopupId }),
        });
        if (!res.ok) return;
        const json = await res.json();
        const status: string = json.data?.status ?? 'PENDING';
        if (status === 'PAID') {
          clearTimers();
          if (json.data?.wallet) setWallet(json.data.wallet);
          setStep('success');
          setTimeout(closeAll, 2500);
        } else if (status === 'CANCELLED' || status === 'EXPIRED') {
          clearTimers(); setStep('expired');
        }
      } catch { /* keep polling */ }
    };

    pollRef.current = setInterval(() => { void check(); }, QR_POLL_MS);
    expireRef.current = setTimeout(() => { clearTimers(); setStep('expired'); }, QR_EXPIRE_MS);
    return clearTimers;
  }, [step, token, pendingTopupId]);

  useEffect(() => () => clearTimers(), []);

  const createTopupOrder = async (amount: number) => {
    const res = await fetch(FAMILY_WALLET_TOPUP_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Không tạo được yêu cầu');
    const data = (await res.json()).data;
    return {
      qrCode: (data?.qrCode as string) || null,
      checkoutUrl: (data?.checkoutUrl as string) || null,
      topupId: (data?.topupId as string) || null,
    };
  };

  const handleAmountConfirm = () => {
    const amount = parseInt(topupAmount || '0', 10);
    if (amount < 10_000) { alert('Số tiền tối thiểu là 10.000₫'); return; }
    setQrAmount(amount);
    setStep('pick-method');
  };

  const handlePickMethod = async (methodId: string) => {
    if (!token) return;
    try {
      const order = await createTopupOrder(qrAmount);
      setQrCode(order.qrCode);
      setCheckoutUrl(order.checkoutUrl);
      setPendingTopupId(order.topupId);

      if (methodId === 'qr') {
        if (order.qrCode) { setStep('show-qr'); return; }
        if (order.checkoutUrl) {
          await WebBrowser.openBrowserAsync(order.checkoutUrl);
          void refreshWallet(); closeAll(); return;
        }
      } else {
        if (order.checkoutUrl) {
          setStep('idle');
          await WebBrowser.openBrowserAsync(order.checkoutUrl, {
            presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
          });
          void refreshWallet();
        } else { alert('Không nhận được link thanh toán'); }
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi khi nạp tiền');
      closeAll();
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <AnimCard delay={0}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ThemedText style={styles.backText}>‹</ThemedText>
          </Pressable>
          <View style={styles.headerCenter}>
            <ThemedText style={styles.headerTitle}>Ví tiền</ThemedText>
          </View>
          <Pressable style={styles.refreshBtn} onPress={refreshWallet}>
            <ThemedText style={styles.refreshText}>↻</ThemedText>
          </Pressable>
        </View>
      </AnimCard>

      {/* Balance card */}
      <AnimCard delay={80}>
        <View style={styles.balanceCard}>
          <ThemedText style={styles.balanceLabel}>Số dư hiện tại</ThemedText>
          <ThemedText style={styles.balanceAmount}>
            {wallet ? wallet.balance.toLocaleString('vi-VN') + '₫' : '—'}
          </ThemedText>
          <View style={styles.balanceStats}>
            <View style={styles.statItem}>
              <ThemedText style={styles.statVal}>
                {wallet ? wallet.totalTopup.toLocaleString('vi-VN') + '₫' : '—'}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Tổng đã nạp</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <ThemedText style={styles.statVal}>
                {wallet ? wallet.totalSpent.toLocaleString('vi-VN') + '₫' : '—'}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Tổng đã dùng</ThemedText>
            </View>
          </View>
        </View>
      </AnimCard>

      {/* Topup button */}
      <AnimCard delay={140}>
        <Pressable style={styles.topupBtn} onPress={() => setStep('enter-amount')}>
          <ThemedText style={styles.topupBtnText}>+ Nạp tiền vào ví</ThemedText>
        </Pressable>
      </AnimCard>

      {/* Transaction history */}
      <AnimCard delay={200}>
        <ThemedText style={styles.sectionTitle}>Lịch sử giao dịch</ThemedText>
        <View style={styles.historyList}>
          {HISTORY.map((h, i) => (
            <View key={i} style={styles.historyItem}>
              <View style={[styles.historyDot, { backgroundColor: h.color }]} />
              <View style={styles.historyInfo}>
                <ThemedText style={styles.historyLabel}>{h.label}</ThemedText>
                <ThemedText style={styles.historyDate}>{h.date}</ThemedText>
              </View>
              <ThemedText style={[styles.historyAmount, { color: h.color }]}>
                {h.amount > 0 ? '+' : ''}{h.amount.toLocaleString('vi-VN')}₫
              </ThemedText>
            </View>
          ))}
        </View>
      </AnimCard>

      {/* ── Modal: Nhập số tiền ───────────────────────────────────────────── */}
      <Modal visible={step === 'enter-amount'} transparent animationType="fade" onRequestClose={closeAll}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <ThemedText style={styles.modalTitle}>Nạp tiền vào ví</ThemedText>
            <ThemedText style={styles.modalSub}>Nhập số tiền muốn nạp (VND)</ThemedText>

            <View style={styles.quickAmounts}>
              {QUICK_AMOUNTS.map(a => (
                <Pressable
                  key={a}
                  style={[styles.quickBtn, topupAmount === String(a) && styles.quickBtnActive]}
                  onPress={() => setTopupAmount(String(a))}
                >
                  <ThemedText style={[styles.quickBtnText, topupAmount === String(a) && styles.quickBtnTextActive]}>
                    {(a / 1000)}k
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Hoặc nhập số tiền khác..."
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              value={topupAmount}
              onChangeText={setTopupAmount}
            />
            <View style={styles.btnRow}>
              <Pressable style={[styles.btn, styles.btnGray]} onPress={closeAll}>
                <ThemedText style={styles.btnGrayText}>Hủy</ThemedText>
              </Pressable>
              <Pressable style={[styles.btn, styles.btnGreen]} onPress={handleAmountConfirm}>
                <ThemedText style={styles.btnWhiteText}>Tiếp tục</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Chọn phương thức ───────────────────────────────────────── */}
      <Modal visible={step === 'pick-method'} transparent animationType="slide" onRequestClose={closeAll}>
        <View style={styles.overlay}>
          <View style={styles.methodBox}>
            <ThemedText style={styles.modalTitle}>Chọn phương thức</ThemedText>
            <ThemedText style={styles.modalSub}>
              Nạp <ThemedText style={{ color: Colors.primary, fontWeight: '700' }}>
                {qrAmount.toLocaleString('vi-VN')}₫
              </ThemedText>
            </ThemedText>
            <View style={styles.methodList}>
              {PAYMENT_METHODS.map(m => (
                <Pressable key={m.id} style={styles.methodCard} onPress={() => handlePickMethod(m.id)}>
                  <View style={[styles.methodIcon, { backgroundColor: `${m.color}18` }]}>
                    <ThemedText style={styles.methodIconText}>{m.icon}</ThemedText>
                  </View>
                  <View style={styles.methodInfo}>
                    <ThemedText style={styles.methodTitle}>{m.title}</ThemedText>
                    <ThemedText style={styles.methodSub}>{m.subtitle}</ThemedText>
                  </View>
                  <ThemedText style={styles.methodArrow}>›</ThemedText>
                </Pressable>
              ))}
            </View>
            <Pressable style={[styles.btn, styles.btnGray, { width: '100%', marginTop: Spacing.three }]} onPress={closeAll}>
              <ThemedText style={styles.btnGrayText}>Hủy</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Modal: QR ───────────────────────────────────────────────────── */}
      <Modal visible={step === 'show-qr'} transparent animationType="fade" onRequestClose={closeAll}>
        <View style={styles.overlay}>
          <View style={styles.qrBox}>
            <ThemedText style={styles.modalTitle}>Quét mã QR</ThemedText>
            <ThemedText style={styles.qrAmountLabel}>
              Số tiền: <ThemedText style={{ color: Colors.primary, fontWeight: '700' }}>
                {qrAmount.toLocaleString('vi-VN')}₫
              </ThemedText>
            </ThemedText>
            <View style={styles.qrFrame}>
              {qrCode ? (
                <Image
                  source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(qrCode)}` }}
                  style={styles.qrImage}
                  contentFit="contain"
                />
              ) : (
                <ThemedText style={{ color: Colors.textMuted }}>Đang tải QR...</ThemedText>
              )}
            </View>
            <View style={styles.pollRow}>
              <View style={styles.pollDot} />
              <ThemedText style={styles.pollText}>Đang chờ thanh toán...</ThemedText>
            </View>
            <ThemedText style={styles.qrHint}>
              Mở app ngân hàng → Quét QR → Xác nhận. Ví tự động cập nhật sau khi giao dịch thành công.
            </ThemedText>
            <Pressable style={[styles.btn, styles.btnGray, { width: '100%' }]} onPress={closeAll}>
              <ThemedText style={styles.btnGrayText}>Hủy</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Thành công ─────────────────────────────────────────────── */}
      <Modal visible={step === 'success'} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.qrBox}>
            <ThemedText style={styles.bigIcon}>✅</ThemedText>
            <ThemedText style={styles.successTitle}>Nạp tiền thành công!</ThemedText>
            <ThemedText style={styles.successAmount}>+{qrAmount.toLocaleString('vi-VN')}₫</ThemedText>
            <ThemedText style={{ color: Colors.textSecondary, marginTop: Spacing.two }}>Số dư đã được cập nhật</ThemedText>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Hết hạn ─────────────────────────────────────────────── */}
      <Modal visible={step === 'expired'} transparent animationType="fade" onRequestClose={closeAll}>
        <View style={styles.overlay}>
          <View style={styles.qrBox}>
            <ThemedText style={styles.bigIcon}>⏱️</ThemedText>
            <ThemedText style={styles.expiredTitle}>QR đã hết hạn</ThemedText>
            <ThemedText style={{ color: Colors.textSecondary, marginBottom: Spacing.four }}>
              Vui lòng tạo yêu cầu nạp tiền mới
            </ThemedText>
            <Pressable style={[styles.btn, styles.btnGreen, { paddingHorizontal: Spacing.five }]} onPress={closeAll}>
              <ThemedText style={styles.btnWhiteText}>Đóng</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },

  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.family, borderRadius: Radius.lg, padding: Spacing.three, ...Shadow.md },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 30, color: '#fff', lineHeight: 36 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  refreshBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  refreshText: { fontSize: 22, color: '#fff' },

  balanceCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    alignItems: 'center',
    ...Shadow.md,
  },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: Spacing.two },
  balanceAmount: { fontSize: 38, fontWeight: '800', color: '#fff', marginBottom: Spacing.three },
  balanceStats: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  statItem: { alignItems: 'center' },
  statVal: { fontSize: 15, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.3)' },

  topupBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    ...Shadow.sm,
  },
  topupBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.one },
  historyList: { backgroundColor: Colors.card, borderRadius: Radius.lg, overflow: 'hidden', ...Shadow.sm },
  historyItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.three, borderBottomWidth: 1, borderBottomColor: Colors.divider, gap: Spacing.two },
  historyDot: { width: 10, height: 10, borderRadius: 5 },
  historyInfo: { flex: 1 },
  historyLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  historyDate: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  historyAmount: { fontSize: 15, fontWeight: '700' },

  // Modals
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: Colors.card, borderRadius: Radius.xl, padding: Spacing.four, width: '88%', maxWidth: 380, ...Shadow.lg },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.one },
  modalSub: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.three, textAlign: 'center' },

  quickAmounts: { flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.three },
  quickBtn: { flex: 1, paddingVertical: Spacing.two, borderRadius: Radius.md, backgroundColor: Colors.borderLight, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  quickBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  quickBtnText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  quickBtnTextActive: { color: '#fff' },

  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, fontSize: 16, marginBottom: Spacing.four, color: Colors.textPrimary, backgroundColor: Colors.background },
  btnRow: { flexDirection: 'row', gap: Spacing.two, justifyContent: 'flex-end' },
  btn: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, borderRadius: Radius.md, minWidth: 80, alignItems: 'center' },
  btnGray: { backgroundColor: Colors.borderLight },
  btnGrayText: { color: Colors.textSecondary, fontWeight: '600' },
  btnGreen: { backgroundColor: Colors.primary },
  btnWhiteText: { color: '#fff', fontWeight: '700' },

  methodBox: { backgroundColor: Colors.card, borderRadius: Radius.xl, padding: Spacing.four, width: '92%', maxWidth: 420, ...Shadow.lg },
  methodList: { gap: Spacing.two, marginTop: Spacing.two },
  methodCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.three, borderRadius: Radius.md, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, gap: Spacing.three },
  methodIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  methodIconText: { fontSize: 24 },
  methodInfo: { flex: 1 },
  methodTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  methodSub: { fontSize: 12, color: Colors.textSecondary },
  methodArrow: { fontSize: 22, color: Colors.textMuted },

  qrBox: { backgroundColor: Colors.card, borderRadius: Radius.xl, padding: Spacing.four, width: '90%', maxWidth: 360, alignItems: 'center', ...Shadow.lg },
  qrAmountLabel: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.three, textAlign: 'center' },
  qrFrame: { width: 280, height: 280, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, borderRadius: Radius.md, marginBottom: Spacing.two, borderWidth: 1, borderColor: Colors.border },
  qrImage: { width: 260, height: 260 },
  pollRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, marginBottom: Spacing.two },
  pollDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  pollText: { fontSize: 12, color: Colors.success, fontWeight: '600' },
  qrHint: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginBottom: Spacing.three, lineHeight: 18 },

  bigIcon: { fontSize: 56, marginBottom: Spacing.three, textAlign: 'center' },
  successTitle: { fontSize: 20, fontWeight: '700', color: Colors.primaryDark, marginBottom: Spacing.two, textAlign: 'center' },
  successAmount: { fontSize: 28, fontWeight: '800', color: Colors.success, textAlign: 'center' },
  expiredTitle: { fontSize: 18, fontWeight: '700', color: Colors.error, marginBottom: Spacing.two, textAlign: 'center' },
});
