import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View, StyleSheet, Linking } from 'react-native';
import { Text, Card, Button, Dialog, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { BackHeader } from '../../components/layout/BackHeader';
import { useWalletOtpPayment } from '../../components/family/WalletOtpDialog';
import { useToast } from '../../utils/toast';
import { getStatusEntry } from '../../utils/statusMap';
import { InvoicePayosQrView, type InvoicePayosResult } from './InvoicePayosQrView';

const COLOR = '#2E7D32';
const NS = 'family.invoiceDetail';

const CostRow: React.FC<{ icon: string; label: string; amount: number; color?: string }> = ({ icon, label, amount, color }) => {
  if (!amount || amount <= 0) return null;
  return (
    <View style={styles.costRow}>
      <MaterialCommunityIcons name={icon as any} size={20} color={color ?? '#6B7280'} />
      <Text style={styles.costLabel}>{label}</Text>
      <Text style={styles.costAmount}>{amount.toLocaleString('vi-VN')} ₫</Text>
    </View>
  );
};

export const InvoiceDetailScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const toast = useToast();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const invoice = route.params?.invoice;
  const residentId = route.params?.residentId;

  const [showPayDialog, setShowPayDialog] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);

  // Thanh toán online PayOS ngay trong app (giống luồng nạp ví): tạo checkout →
  // hiện QR/thông tin chuyển khoản → poll xác thực server-to-server → chỉ báo
  // thành công sau khi backend xác nhận PAID.
  const [payosData, setPayosData] = useState<InvoicePayosResult | null>(null);
  const [payosStatus, setPayosStatus] = useState<'polling' | 'success' | 'failed'>('polling');
  const [creatingPayos, setCreatingPayos] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Số lần poll trả về PENDING liên tiếp trước khi coi là hết hạn (~5 phút @3s).
  const pollTicksRef = useRef(0);
  const MAX_POLL_TICKS = 100;
  // Chốt "đã xử lý thành công" đúng MỘT lần: kể cả khi có nhịp poll trùng hoặc
  // request verify về PAID hai lần, điều hướng quay lại chỉ chạy một lần.
  const successHandledRef = useRef(false);
  const successNavTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  // Dọn interval + timer khi rời màn hình để tránh rò rỉ / gọi API / điều hướng
  // sau khi unmount.
  useEffect(() => () => {
    stopPolling();
    if (successNavTimerRef.current) { clearTimeout(successNavTimerRef.current); successNavTimerRef.current = null; }
  }, []);

  const invalidateInvoiceQueries = () => {
    qc.invalidateQueries({ queryKey: ['familyInvoices'] });
    qc.invalidateQueries({ queryKey: ['billingSummary'] });
  };

  const startPolling = () => {
    stopPolling();
    pollTicksRef.current = 0;
    pollRef.current = setInterval(async () => {
      pollTicksRef.current += 1;
      try {
        const res = await api.post(FAMILY.INVOICE_PAYOS_VERIFY(residentId, invoice._id));
        const status = String(res.data?.data?.status ?? res.data?.status ?? '').toUpperCase();
        if (status === 'PAID') {
          // Chỉ backend xác nhận PAID mới được coi là thành công; xử lý đúng một lần.
          if (successHandledRef.current) return;
          successHandledRef.current = true;
          stopPolling();
          setPayosStatus('success');
          invalidateInvoiceQueries();
          // Hiện màn "Thanh toán thành công" khoảng 1.5s rồi tự quay lại danh sách
          // hoá đơn (đã làm mới) — không để người dùng kẹt ở màn QR. goBack() gỡ
          // InvoiceDetail khỏi stack nên nút Back cũng không quay lại màn QR cũ.
          successNavTimerRef.current = setTimeout(() => {
            successNavTimerRef.current = null;
            navigation.goBack();
          }, 1500);
        } else if (status === 'CANCELLED' || status === 'EXPIRED') {
          stopPolling();
          setPayosStatus('failed');
        } else if (pollTicksRef.current >= MAX_POLL_TICKS) {
          // Hết thời gian chờ: dừng poll, hiển thị trạng thái "chưa nhận được".
          stopPolling();
          setPayosStatus('failed');
        }
      } catch {
        // Lỗi mạng tạm thời khi poll — bỏ qua nhịp này, lần sau thử lại.
      }
    }, 3000);
  };

  const statusLabel = (status?: string | null) =>
    t(getStatusEntry(status).i18nKey, { defaultValue: status ?? '' });

  const totalAmount = invoice?.totalAmount ?? invoice?.total ?? invoice?.amount ?? 0;

  // "Thanh toán bằng ví" KHÔNG trừ tiền ngay: hook gửi mã OTP tới số điện thoại
  // của tài khoản rồi mở hộp thoại xác thực; backend chỉ trừ ví sau khi mã đúng.
  const { start: startWalletOtp, starting: otpLoading, dialog: otpDialog } = useWalletOtpPayment({
    onSuccess: () => {
      setPaySuccess(true);
      toast(t(`${NS}.toastPaySuccess`), 'success');
    },
    onError: (message) => toast(message, 'error'),
  });

  // Tạo checkout PayOS THẬT rồi hiện QR trong app — không quăng người dùng ra
  // trình duyệt ngay. Mở trang thanh toán ngoài chỉ là hành động phụ trong màn QR.
  const handlePayOnline = async () => {
    setShowPayDialog(false);
    setCreatingPayos(true);
    try {
      const res = await api.post(FAMILY.INVOICE_PAYOS(residentId, invoice._id));
      const data: InvoicePayosResult | undefined = res.data?.data ?? res.data;
      if (data && (data.qrCode || data.checkoutUrl)) {
        setPayosData(data);
        setPayosStatus('polling');
        startPolling();
      } else {
        toast(t(`${NS}.toastNoPaymentUrl`), 'error');
      }
    } catch {
      toast(t(`${NS}.toastPaymentCreateError`), 'error');
    } finally {
      setCreatingPayos(false);
    }
  };

  const closePayosView = () => {
    stopPolling();
    if (successNavTimerRef.current) { clearTimeout(successNavTimerRef.current); successNavTimerRef.current = null; }
    successHandledRef.current = false;
    setPayosData(null);
    setPayosStatus('polling');
  };

  const openPayosCheckoutPage = async () => {
    if (payosData?.checkoutUrl) {
      try { await Linking.openURL(payosData.checkoutUrl); } catch { /* trình duyệt không mở được */ }
    }
  };

  const isPending = ['issued', 'ISSUED', 'overdue', 'partially_paid', 'PARTIALLY_PAID'].includes(invoice?.status);

  if (payosData) {
    return (
      <InvoicePayosQrView
        data={payosData}
        pollingStatus={payosStatus}
        onCancel={closePayosView}
        onOpenPaymentPage={openPayosCheckoutPage}
      />
    );
  }

  if (paySuccess) {
    return (
      <View style={styles.flex}>
        <BackHeader title={t(`${NS}.paymentTitle`)} color={COLOR} onBack={() => navigation.goBack()} />
        <View style={styles.successBox}>
          <MaterialCommunityIcons name="check-circle" size={64} color="#065F46" />
          <Text style={styles.successText}>{t(`${NS}.paySuccessText`)}</Text>
          <Text style={styles.successAmount}>{totalAmount.toLocaleString('vi-VN')} ₫</Text>
          <Button mode="contained" buttonColor={COLOR} onPress={() => navigation.goBack()} style={{ marginTop: 24, borderRadius: 8 }}>
            {t(`${NS}.back`)}
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.title`)} color={COLOR} onBack={() => navigation.goBack()} />

      <ScrollView style={styles.flex} contentContainerStyle={styles.body}>
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.invoiceNumber}>{invoice?.invoiceNumber ?? `#${invoice?._id?.slice(-6)}`}</Text>
                <Text style={styles.statusText}>{statusLabel(invoice?.status)}</Text>
              </View>
              <StatusBadge status={invoice?.status} size="md" />
            </View>
            <Text style={styles.totalAmount}>{totalAmount.toLocaleString('vi-VN')} ₫</Text>
          </Card.Content>
        </Card>

        <SectionHeader title={t(`${NS}.infoTitle`)} roleColor={COLOR} />
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            {invoice?.createdAt && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t(`${NS}.createdDate`)}</Text>
                <Text style={styles.infoValue}>{new Date(invoice.createdAt).toLocaleDateString('vi-VN')}</Text>
              </View>
            )}
            {invoice?.dueDate && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t(`${NS}.dueDate`)}</Text>
                <Text style={styles.infoValue}>{new Date(invoice.dueDate).toLocaleDateString('vi-VN')}</Text>
              </View>
            )}
            {(invoice?.periodStart || invoice?.billingPeriodStart) && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t(`${NS}.billingPeriod`)}</Text>
                <Text style={styles.infoValue}>
                  {new Date(invoice.periodStart ?? invoice.billingPeriodStart).toLocaleDateString('vi-VN')} — {new Date(invoice.periodEnd ?? invoice.billingPeriodEnd).toLocaleDateString('vi-VN')}
                </Text>
              </View>
            )}
            {invoice?.type && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t(`${NS}.typeLabel`)}</Text>
                <Text style={styles.infoValue}>
                  {invoice.type === 'SERVICE' ? t(`${NS}.typeService`) : invoice.type === 'MEDICATION' ? t(`${NS}.typeMedication`) : invoice.type === 'COMBINED' ? t(`${NS}.typeCombined`) : invoice.type}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        <SectionHeader title={t(`${NS}.costBreakdownTitle`)} roleColor={COLOR} />
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <CostRow icon="bed-outline" label={t(`${NS}.costRoom`)} amount={invoice?.roomCost} color="#1565C0" />
            <CostRow icon="pill" label={t(`${NS}.costMedication`)} amount={invoice?.medicationCost} color="#E65100" />
            <CostRow icon="hand-heart-outline" label={t(`${NS}.costCare`)} amount={invoice?.careServiceCost} color="#2E7D32" />
            <CostRow icon="dots-horizontal" label={t(`${NS}.costOther`)} amount={invoice?.otherCost} color="#6B7280" />
            {(invoice?.roomCost > 0 || invoice?.medicationCost > 0 || invoice?.careServiceCost > 0 || invoice?.otherCost > 0) && (
              <View style={[styles.costRow, { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 8, marginTop: 4 }]}>
                <MaterialCommunityIcons name="sigma" size={20} color={COLOR} />
                <Text style={[styles.costLabel, { fontWeight: '700' }]}>{t(`${NS}.total`)}</Text>
                <Text style={[styles.costAmount, { fontWeight: '700', color: COLOR }]}>{totalAmount.toLocaleString('vi-VN')} ₫</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {invoice?.items?.length > 0 && (
          <>
            <SectionHeader title={t(`${NS}.itemsTitle`)} roleColor={COLOR} />
            <Card style={styles.card} mode="outlined">
              <Card.Content>
                {invoice.items.map((item: any, i: number) => (
                  <View key={i} style={styles.lineItem}>
                    <Text style={styles.lineDesc} numberOfLines={2}>{item.description ?? t(`${NS}.defaultItem`, { index: i + 1 })}</Text>
                    <Text style={styles.lineAmount}>{(item.amount ?? 0).toLocaleString('vi-VN')} ₫</Text>
                  </View>
                ))}
              </Card.Content>
            </Card>
          </>
        )}

        {isPending && (
          <View style={styles.paySection}>
            <Button mode="contained" buttonColor={COLOR} icon="wallet-outline"
              style={styles.payBtn} contentStyle={{ height: 48 }}
              onPress={() => setShowPayDialog(true)}>
              {t(`${NS}.payNow`)}
            </Button>
          </View>
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={showPayDialog} onDismiss={() => setShowPayDialog(false)} style={{ borderRadius: 16 }}>
          <Dialog.Title>{t(`${NS}.chooseMethodTitle`)}</Dialog.Title>
          <Dialog.Content>
            <Text style={{ fontSize: 14, color: '#374151', marginBottom: 16 }}>
              {t(`${NS}.amountLabel`, { amount: totalAmount.toLocaleString('vi-VN') })}
            </Text>
            <Button mode="outlined" icon="wallet-outline" style={styles.methodBtn}
              loading={otpLoading} disabled={otpLoading}
              onPress={() => { setShowPayDialog(false); startWalletOtp([invoice._id], totalAmount); }}>
              {t(`${NS}.payWithWallet`)}
            </Button>
            <Button mode="outlined" icon="qrcode" style={styles.methodBtn}
              loading={creatingPayos} disabled={creatingPayos}
              onPress={handlePayOnline}>
              {t(`${NS}.payOnline`)}
            </Button>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowPayDialog(false)}>{t('common.cancel')}</Button>
          </Dialog.Actions>
        </Dialog>

      </Portal>

      {otpDialog}
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 12, backgroundColor: '#fff' },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  invoiceNumber: { fontSize: 18, fontWeight: '700', color: '#111827' },
  statusText: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  totalAmount: { fontSize: 28, fontWeight: '700', color: COLOR, marginTop: 12, textAlign: 'center' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  infoLabel: { fontSize: 13, color: '#9CA3AF' },
  infoValue: { fontSize: 13, color: '#111827', fontWeight: '500' },
  costRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  costLabel: { flex: 1, fontSize: 14, color: '#374151' },
  costAmount: { fontSize: 14, color: '#111827', fontWeight: '600' },
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  lineDesc: { flex: 1, fontSize: 13, color: '#374151', marginRight: 12 },
  lineAmount: { fontSize: 13, fontWeight: '600', color: '#111827' },
  paySection: { marginTop: 8 },
  payBtn: { borderRadius: 8 },
  methodBtn: { borderRadius: 8, marginBottom: 8, borderColor: COLOR },
  successBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  successText: { fontSize: 20, fontWeight: '600', color: '#065F46', marginTop: 12 },
  successAmount: { fontSize: 28, fontWeight: '700', color: COLOR, marginTop: 4 },
});
