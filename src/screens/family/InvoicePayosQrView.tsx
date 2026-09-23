import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Button, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { BackHeader } from '../../components/layout/BackHeader';
import { resolveBankName } from '../../utils/vietqrBanks';

const COLOR = '#2E7D32';
const NS = 'family.invoiceDetail';

/**
 * Kết quả checkout PayOS THẬT do backend trả về
 * (`familyPortalService.createInvoicePayosCheckout`) — không có trường nào bịa.
 * `qrCode` là chuỗi VietQR thật, client tự vẽ QR trong app.
 */
export type InvoicePayosResult = {
  invoiceId: string;
  invoiceNumber?: string | null;
  amount: number;
  qrCode?: string | null;
  checkoutUrl?: string | null;
  orderCode?: number | null;
  bankBin?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
  description?: string | null;
  payerName?: string | null;
  createdAt?: string | null;
};

type Props = {
  data: InvoicePayosResult;
  // 'polling' = chờ PayOS xác nhận; 'success' chỉ đặt sau khi backend xác thực PAID.
  pollingStatus: 'polling' | 'success' | 'failed';
  onCancel: () => void;
  onOpenPaymentPage: () => void;
};

const InfoRow: React.FC<{ label: string; value?: string | null; selectable?: boolean }> = ({ label, value, selectable }) => {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} selectable={selectable} numberOfLines={2}>{value}</Text>
    </View>
  );
};

export const InvoicePayosQrView: React.FC<Props> = ({ data, pollingStatus, onCancel, onOpenPaymentPage }) => {
  const { t } = useTranslation();

  if (pollingStatus === 'success') {
    return (
      <View style={styles.flex}>
        <BackHeader title={t(`${NS}.payosQrTitle`)} color={COLOR} onBack={onCancel} />
        <Animated.View entering={FadeInUp.springify()} style={styles.resultBox}>
          <View style={[styles.resultIconCircle, { backgroundColor: '#D1FAE5' }]}>
            <MaterialCommunityIcons name="check-circle" size={56} color="#065F46" />
          </View>
          <Text style={styles.resultAmount}>{data.amount?.toLocaleString('vi-VN')} ₫</Text>
          <Text style={[styles.resultText, { color: '#065F46' }]}>{t(`${NS}.payosSuccessText`)}</Text>
        </Animated.View>
      </View>
    );
  }

  if (pollingStatus === 'failed') {
    return (
      <View style={styles.flex}>
        <BackHeader title={t(`${NS}.payosQrTitle`)} color={COLOR} onBack={onCancel} />
        <Animated.View entering={FadeInUp.springify()} style={styles.resultBox}>
          <View style={[styles.resultIconCircle, { backgroundColor: '#FEF3C7' }]}>
            <MaterialCommunityIcons name="clock-alert-outline" size={56} color="#92400E" />
          </View>
          <Text style={[styles.resultText, { color: '#92400E' }]}>{t(`${NS}.payosPendingText`)}</Text>
          {data.checkoutUrl ? (
            <Button mode="outlined" icon="open-in-new" onPress={onOpenPaymentPage} textColor={COLOR} style={styles.pageBtn}>
              {t(`${NS}.openPaymentPage`)}
            </Button>
          ) : null}
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.payosQrTitle`)} color={COLOR} onBack={onCancel} />

      <ScrollView style={styles.flex} contentContainerStyle={styles.qrBody}>
        <Card style={styles.qrCard} mode="elevated">
          <Card.Content style={styles.qrContent}>
            <Text style={styles.qrTitle}>{t(`${NS}.scanQrTitle`)}</Text>
            <Text style={styles.qrAmount}>{data.amount?.toLocaleString('vi-VN')} ₫</Text>

            <View style={styles.qrFrame}>
              {data.qrCode ? (
                <QRCode value={data.qrCode} size={210} backgroundColor="#FFFFFF" color="#000000" />
              ) : (
                <View style={styles.qrLoading}>
                  <ActivityIndicator size="large" color={COLOR} />
                  <Text style={styles.qrLoadingText}>{t(`${NS}.loadingQr`)}</Text>
                </View>
              )}
            </View>

            {data.orderCode ? (
              <Text style={styles.orderCode}>{t(`${NS}.orderCode`, { code: data.orderCode })}</Text>
            ) : null}
          </Card.Content>
        </Card>

        {(data.bankAccountNumber || data.bankAccountName || data.bankBin) ? (
          <>
            <SectionHeader title={t(`${NS}.bankInfoTitle`)} roleColor={COLOR} />
            <Card style={styles.infoCard} mode="outlined">
              <Card.Content>
                <InfoRow label={t(`${NS}.bankName`)} value={data.bankBin ? resolveBankName(data.bankBin) : null} />
                <InfoRow label={t(`${NS}.bankAccountNumber`)} value={data.bankAccountNumber} selectable />
                <InfoRow label={t(`${NS}.bankAccountName`)} value={data.bankAccountName} />
                <InfoRow label={t(`${NS}.transferContent`)} value={data.description} selectable />
              </Card.Content>
            </Card>
          </>
        ) : null}

        <Animated.View entering={FadeIn} style={styles.pollingRow}>
          <ActivityIndicator size="small" color="#92400E" />
          <Text style={styles.pollingText}>{t(`${NS}.waitingPayment`)}</Text>
        </Animated.View>

        {data.checkoutUrl ? (
          <Button mode="outlined" icon="open-in-new" onPress={onOpenPaymentPage} textColor={COLOR}
            style={styles.pageBtn} contentStyle={styles.pageBtnContent}>
            {t(`${NS}.openPaymentPage`)}
          </Button>
        ) : null}

        <Button mode="text" textColor="#991B1B" onPress={onCancel} style={styles.cancelBtn}>
          {t(`${NS}.cancelPayment`)}
        </Button>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  qrBody: { padding: 16, paddingBottom: 32, alignItems: 'center' },

  qrCard: { borderRadius: 20, width: '100%', marginBottom: 12, elevation: 3 },
  qrContent: { alignItems: 'center', paddingVertical: 24 },
  qrTitle: { fontSize: 14, fontWeight: '500', color: '#6B7280', letterSpacing: 0.2 },
  qrAmount: { fontSize: 32, fontWeight: '800', color: COLOR, marginTop: 6, marginBottom: 20, letterSpacing: -0.5 },
  qrFrame: {
    width: 250, height: 250, borderRadius: 20, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center',
  },
  qrLoading: { alignItems: 'center' },
  qrLoadingText: { fontSize: 13, color: '#9CA3AF', marginTop: 8 },
  orderCode: { fontSize: 12, color: '#9CA3AF', marginTop: 16, fontWeight: '500' },

  infoCard: { borderRadius: 12, width: '100%', marginBottom: 12, backgroundColor: '#fff' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, gap: 12 },
  infoLabel: { fontSize: 13, color: '#9CA3AF' },
  infoValue: { flex: 1, fontSize: 13, color: '#111827', fontWeight: '500', textAlign: 'right' },

  pollingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4,
    backgroundColor: '#FFFBEB', paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 12, width: '100%', justifyContent: 'center',
  },
  pollingText: { fontSize: 13, color: '#92400E', fontWeight: '500' },

  pageBtn: { borderRadius: 24, borderColor: COLOR, borderWidth: 1.5, width: '100%', marginTop: 16 },
  pageBtnContent: { height: 48 },
  cancelBtn: { marginTop: 8 },

  resultBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  resultIconCircle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  resultAmount: { fontSize: 30, fontWeight: '800', color: COLOR, marginBottom: 8 },
  resultText: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
});
