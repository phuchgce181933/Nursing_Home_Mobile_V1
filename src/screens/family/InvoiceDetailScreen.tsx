import React, { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet, Linking } from 'react-native';
import { Text, Card, Button, Dialog, Portal, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { BackHeader } from '../../components/layout/BackHeader';
import { useToast } from '../../utils/toast';
import { getStatusEntry } from '../../utils/statusMap';

const COLOR = '#2E7D32';
const NS = 'family.invoiceDetail';
const OTP_RESEND_COOLDOWN_SECONDS = 30;

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
  const qc = useQueryClient();
  const { t } = useTranslation();
  const invoice = route.params?.invoice;
  const residentId = route.params?.residentId;

  const [showPayDialog, setShowPayDialog] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);

  const [otpLoading, setOtpLoading] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpId, setOtpId] = useState<string | null>(null);
  const [maskedRecipient, setMaskedRecipient] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpResending, setOtpResending] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const id = setTimeout(() => setOtpCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [otpCooldown]);

  const statusLabel = (status?: string | null) =>
    t(getStatusEntry(status).i18nKey, { defaultValue: status ?? '' });

  const totalAmount = invoice?.totalAmount ?? invoice?.total ?? invoice?.amount ?? 0;

  // Matches web's dashboard wallet-payment flow: send OTP → user enters the code → verify
  // (which performs the actual deduction+payment server-side). Replaces the old direct
  // `POST .../pay` call, which skipped OTP entirely.
  const sendOtp = async () => {
    const res = await api.post(FAMILY.WALLET_PAYMENT_INITIATE, { amount: totalAmount, invoiceIds: [invoice._id] });
    const data = res.data?.data ?? res.data;
    setOtpId(data?.otpId ?? null);
    setMaskedRecipient(data?.maskedRecipient ?? '');
    setOtpCooldown(OTP_RESEND_COOLDOWN_SECONDS);
  };

  const handleInitiateOtp = async () => {
    setOtpLoading(true);
    try {
      await sendOtp();
      setOtpCode('');
      setOtpError(null);
      setShowOtpDialog(true);
    } catch {
      toast(t(`${NS}.toastOtpSendError`), 'error');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpCooldown > 0) return;
    setOtpResending(true);
    try {
      await sendOtp();
      setOtpError(null);
    } catch {
      setOtpError(t(`${NS}.toastOtpSendError`));
    } finally {
      setOtpResending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || !otpId) {
      setOtpError(t(`${NS}.otpCodeRequired`));
      return;
    }
    setOtpVerifying(true);
    setOtpError(null);
    try {
      await api.post(FAMILY.WALLET_PAYMENT_VERIFY, { otpId, code: otpCode.trim() });
      qc.invalidateQueries({ queryKey: ['familyInvoices'] });
      qc.invalidateQueries({ queryKey: ['familyWallet'] });
      setShowOtpDialog(false);
      setPaySuccess(true);
      toast(t(`${NS}.toastPaySuccess`), 'success');
    } catch (e: any) {
      setOtpError(e.response?.status === 400 ? t(`${NS}.toastInsufficientBalance`) : t(`${NS}.otpInvalid`));
    } finally {
      setOtpVerifying(false);
    }
  };

  const handlePayOnline = async () => {
    setShowPayDialog(false);
    try {
      const res = await api.get(FAMILY.PAYMENT_URL(residentId, invoice._id));
      const url = res.data?.data?.paymentUrl ?? res.data?.checkoutUrl ?? res.data?.paymentUrl ?? res.data?.data?.checkoutUrl;
      if (url) await Linking.openURL(url);
      else toast(t(`${NS}.toastNoPaymentUrl`), 'error');
    } catch {
      toast(t(`${NS}.toastPaymentCreateError`), 'error');
    }
  };

  const isPending = ['issued', 'ISSUED', 'overdue', 'partially_paid', 'PARTIALLY_PAID'].includes(invoice?.status);

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
              onPress={() => { setShowPayDialog(false); handleInitiateOtp(); }}>
              {t(`${NS}.payWithWallet`)}
            </Button>
            <Button mode="outlined" icon="credit-card-outline" style={styles.methodBtn}
              onPress={handlePayOnline}>
              {t(`${NS}.payOnline`)}
            </Button>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowPayDialog(false)}>{t('common.cancel')}</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={showOtpDialog} onDismiss={() => setShowOtpDialog(false)} dismissable={false}>
          <Dialog.Title>{t(`${NS}.otpTitle`)}</Dialog.Title>
          <Dialog.Content>
            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>
              {t(`${NS}.otpSentTo`, { recipient: maskedRecipient })}
            </Text>
            <TextInput mode="outlined" keyboardType="number-pad" maxLength={6}
              value={otpCode} onChangeText={setOtpCode}
              label={t(`${NS}.otpCodeLabel`)} error={!!otpError} />
            {otpError ? <Text style={{ color: '#B91C1C', fontSize: 12, marginTop: 4 }}>{otpError}</Text> : null}
            <Button mode="text" textColor={COLOR} onPress={handleResendOtp} loading={otpResending}
              disabled={otpResending || otpCooldown > 0} style={{ alignSelf: 'flex-end', marginTop: 4 }}>
              {otpCooldown > 0 ? t(`${NS}.otpResendCooldown`, { seconds: otpCooldown }) : t(`${NS}.otpResend`)}
            </Button>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowOtpDialog(false)}>{t('common.cancel')}</Button>
            <Button mode="contained" buttonColor={COLOR} onPress={handleVerifyOtp} loading={otpVerifying}>
              {t(`${NS}.otpVerify`)}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
