import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl, Linking, Alert, Pressable, Platform, Share, KeyboardAvoidingView, Keyboard } from 'react-native';
import { Text, Card, Button, TextInput, Dialog, Portal, Chip, ActivityIndicator, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { useToast } from '../../utils/toast';

const COLOR = '#2E7D32';
const NS = 'family.wallet';
const AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000];
const TOPUP_MIN = 10000;
const TOPUP_MAX = 500000000;

type TopupResult = {
  checkoutUrl?: string;
  qrCode?: string;
  topupId: string;
  orderCode?: number;
  amount: number;
};

type PaymentMethod = {
  id: string;
  nameKey: string;
  icon: string;
  scheme: string;
  color: string;
};

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'bank', nameKey: `${NS}.bankName`, icon: 'bank-outline', scheme: '', color: '#1565C0' },
  { id: 'momo', nameKey: '', icon: 'cellphone', scheme: 'momo://', color: '#A50064' },
  { id: 'zalopay', nameKey: '', icon: 'wallet-outline', scheme: 'zalopay://', color: '#008FE5' },
  { id: 'vnpay', nameKey: '', icon: 'credit-card-outline', scheme: 'vnpay://', color: '#D62027' },
];
const PAYMENT_METHOD_NAMES: Record<string, string> = { momo: 'MoMo', zalopay: 'ZaloPay', vnpay: 'VNPay' };

const QrDisplay: React.FC<{ value: string; qrRef?: React.MutableRefObject<any> }> = ({ value, qrRef }) => (
  <View style={styles.qrImage}>
    <QRCode
      value={value || 'empty'}
      size={220}
      backgroundColor="#FFFFFF"
      color="#000000"
      getRef={qrRef ? (ref: any) => { qrRef.current = ref; } : undefined}
    />
  </View>
);

export const FamilyWalletScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const { t } = useTranslation();

  const [showTopup, setShowTopup] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  const [topupData, setTopupData] = useState<TopupResult | null>(null);
  const [pollingStatus, setPollingStatus] = useState<'idle' | 'polling' | 'success' | 'failed'>('idle');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);
  const qrSvgRef = useRef<any>(null);

  const walletQ = useQuery({
    queryKey: ['familyWallet'],
    queryFn: async () => {
      const r = await api.get(FAMILY.WALLET_BALANCE);
      return r.data?.data ?? r.data;
    },
  });

  const topupMutation = useMutation({
    mutationFn: async (amount: number) => {
      const r = await api.post(FAMILY.WALLET_TOPUP, { amount });
      return (r.data?.data ?? r.data) as TopupResult;
    },
    onSuccess: async (data) => {
      setShowTopup(false);
      if (data.qrCode) {
        setTopupData(data);
        setPollingStatus('polling');
        startPolling(data.topupId);
      } else if (data.checkoutUrl) {
        await Linking.openURL(data.checkoutUrl);
        walletQ.refetch();
      } else {
        toast(t(`${NS}.toastNoPaymentInfo`), 'error');
      }
    },
    onError: () => toast(t(`${NS}.toastCreateTopupError`), 'error'),
  });

  const startPolling = useCallback((topupId: string) => {
    pollCountRef.current = 0;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      pollCountRef.current++;
      if (pollCountRef.current > 200) {
        stopPolling('failed');
        toast(t(`${NS}.toastTimeout`), 'warning');
        return;
      }
      try {
        const res = await api.post(FAMILY.WALLET_TOPUP_VERIFY, { topupId });
        const status = res.data?.data?.status ?? res.data?.status;
        if (status === 'PAID') {
          stopPolling('success');
          qc.invalidateQueries({ queryKey: ['familyWallet'] });
          toast(t(`${NS}.toastTopupSuccess`), 'success');
        } else if (status === 'CANCELLED' || status === 'EXPIRED') {
          stopPolling('failed');
          toast(t(`${NS}.toastTxCancelledExpired`), 'warning');
        }
      } catch { /* keep polling */ }
    }, 3000);
  }, [qc, toast, t]);

  const stopPolling = useCallback((status: 'idle' | 'success' | 'failed' = 'idle') => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setPollingStatus(status);
    if (status === 'success' || status === 'failed') {
      setTimeout(() => {
        setTopupData(null);
        setPollingStatus('idle');
      }, status === 'success' ? 2000 : 0);
    }
  }, []);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const saveQrToGallery = async () => {
    if (Platform.OS === 'web') {
      try {
        await Share.share({ message: t(`${NS}.toastShareCancel`, { url: topupData?.checkoutUrl || '' }) });
      } catch { /* user cancelled */ }
      return;
    }
    if (!qrSvgRef.current) {
      toast(t(`${NS}.toastNoQrYet`), 'warning');
      return;
    }
    try {
      const MediaLibrary = require('expo-media-library');
      const ExpoFS = require('expo-file-system');
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      if (status !== 'granted') {
        toast(t(`${NS}.toastNeedGalleryPermission`), 'warning');
        return;
      }
      qrSvgRef.current.toDataURL(async (base64: string) => {
        try {
          const filename = `qr_topup_${Date.now()}.png`;
          const fileUri = `${ExpoFS.cacheDirectory}${filename}`;
          await ExpoFS.writeAsStringAsync(fileUri, base64, { encoding: ExpoFS.EncodingType.Base64 });
          await MediaLibrary.saveToLibraryAsync(fileUri);
          toast(t(`${NS}.toastQrSaved`), 'success');
        } catch (err: any) {
          toast(`${t(`${NS}.toastQrSaveError`)}${err?.message ? `: ${err.message}` : ''}`, 'error');
        }
      });
    } catch (err: any) {
      toast(`${t(`${NS}.toastQrSaveError`)}${err?.message ? `: ${err.message}` : ''}`, 'error');
    }
  };

  const openPaymentApp = async (method: PaymentMethod) => {
    const name = method.nameKey ? t(method.nameKey) : PAYMENT_METHOD_NAMES[method.id];
    if (!method.scheme) {
      toast(t(`${NS}.toastOpenBankQr`), 'warning');
      return;
    }
    try {
      const canOpen = await Linking.canOpenURL(method.scheme);
      if (canOpen) {
        await Linking.openURL(method.scheme);
      } else {
        toast(t(`${NS}.toastAppNotFound`, { name }), 'warning');
      }
    } catch {
      toast(t(`${NS}.toastAppOpenError`, { name }), 'error');
    }
  };

  const wallet = walletQ.data;
  const amount = selectedAmount ?? (customAmount ? Number(customAmount) : 0);

  const handleTopup = () => {
    if (!amount || amount <= 0) {
      toast(t(`${NS}.toastEnterAmount`), 'warning');
      return;
    }
    if (amount < TOPUP_MIN) {
      toast(t(`${NS}.toastAmountTooLow`, { amount: TOPUP_MIN.toLocaleString('vi-VN') }), 'warning');
      return;
    }
    if (amount > TOPUP_MAX) {
      toast(t(`${NS}.toastAmountTooHigh`, { amount: TOPUP_MAX.toLocaleString('vi-VN') }), 'warning');
      return;
    }
    topupMutation.mutate(amount);
  };

  const cancelTopup = () => {
    stopPolling('idle');
    setTopupData(null);
  };

  if (topupData) {
    return (
      <View style={styles.flex}>
        <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
          <View style={styles.topBarRow}>
            <IconButton icon="arrow-left" iconColor="#fff" size={24} onPress={cancelTopup} />
            <Text style={styles.topTitle}>{t(`${NS}.topupTitle`)}</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>

        <ScrollView style={styles.flex} contentContainerStyle={styles.qrBody}>
          {pollingStatus === 'success' ? (
            <View style={styles.successBox}>
              <MaterialCommunityIcons name="check-circle" size={64} color="#065F46" />
              <Text style={styles.successText}>{t(`${NS}.toastTopupSuccess`)}</Text>
              <Text style={styles.successAmount}>{topupData.amount?.toLocaleString('vi-VN')} ₫</Text>
            </View>
          ) : (
            <>
              <Card style={styles.qrCard} mode="elevated">
                <Card.Content style={styles.qrContent}>
                  <Text style={styles.qrTitle}>{t(`${NS}.scanQrTitle`)}</Text>
                  <Text style={styles.qrAmount}>{topupData.amount?.toLocaleString('vi-VN')} ₫</Text>

                  {topupData.qrCode ? (
                    <QrDisplay value={topupData.qrCode} qrRef={qrSvgRef} />
                  ) : (
                    <View style={styles.qrImage}>
                      <ActivityIndicator size="large" color={COLOR} />
                      <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 8 }}>{t(`${NS}.loadingQr`)}</Text>
                    </View>
                  )}

                  {topupData.orderCode ? (
                    <Text style={styles.orderCode}>{t(`${NS}.orderCode`, { code: topupData.orderCode })}</Text>
                  ) : null}
                </Card.Content>
              </Card>

              <Button mode="outlined" icon="download" onPress={saveQrToGallery} style={styles.saveBtn} textColor={COLOR}>
                {t(`${NS}.saveQr`)}
              </Button>

              <SectionHeader title={t(`${NS}.selectPaymentMethod`)} roleColor={COLOR} />
              <View style={styles.methodGrid}>
                {PAYMENT_METHODS.map((m) => (
                  <Pressable key={m.id} style={styles.methodCard} onPress={() => openPaymentApp(m)}>
                    <View style={[styles.methodIcon, { backgroundColor: m.color + '15' }]}>
                      <MaterialCommunityIcons name={m.icon as any} size={28} color={m.color} />
                    </View>
                    <Text style={styles.methodName}>{m.nameKey ? t(m.nameKey) : PAYMENT_METHOD_NAMES[m.id]}</Text>
                  </Pressable>
                ))}
              </View>

              {pollingStatus === 'polling' ? (
                <View style={styles.pollingRow}>
                  <ActivityIndicator size="small" color={COLOR} />
                  <Text style={styles.pollingText}>{t(`${NS}.waitingConfirmation`)}</Text>
                </View>
              ) : null}

              <Button mode="text" textColor="#991B1B" onPress={cancelTopup} style={{ marginTop: 16 }}>
                {t(`${NS}.cancelTransaction`)}
              </Button>
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <LinearGradient
        colors={['#0B3D0B', '#1B5E20', '#43A047']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroGradient, { paddingTop: insets.top + 12 }]}
      >
        <Text style={styles.heroTitle}>{t(`${NS}.title`)}</Text>
        <Text style={styles.heroSubtitle}>{t(`${NS}.currentBalance`)}</Text>
        <Text style={styles.heroAmount}>
          {wallet?.balance != null ? wallet.balance.toLocaleString('vi-VN') : '0'} ₫
        </Text>

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatPill}>
            <MaterialCommunityIcons name="arrow-down-circle-outline" size={14} color="#fff" />
            <Text style={styles.heroStatText}>{t(`${NS}.totalTopupLabel`, { amount: wallet?.totalTopup?.toLocaleString('vi-VN') ?? '0' })}</Text>
          </View>
          <View style={styles.heroStatPill}>
            <MaterialCommunityIcons name="arrow-up-circle-outline" size={14} color="#fff" />
            <Text style={styles.heroStatText}>{t(`${NS}.totalSpentLabel`, { amount: wallet?.totalSpent?.toLocaleString('vi-VN') ?? '0' })}</Text>
          </View>
        </View>

        <Pressable style={styles.heroAction} onPress={() => setShowTopup(true)}>
          <View style={styles.heroActionCircle}>
            <MaterialCommunityIcons name="plus" size={26} color="#fff" />
          </View>
          <Text style={styles.heroActionLabel}>{t(`${NS}.topupButton`)}</Text>
        </Pressable>
      </LinearGradient>

      <View style={styles.contentSheet}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.body}
          refreshControl={<RefreshControl refreshing={false} onRefresh={walletQ.refetch} tintColor={COLOR} />}
        >
          <ScreenLayout loading={walletQ.isLoading} error={walletQ.error ? (walletQ.error as Error).message : null} onRetry={walletQ.refetch}>
            <SectionHeader title={t(`${NS}.transactionHistoryTitle`)} roleColor={COLOR} />
            {wallet?.transactions?.length ? (
              wallet.transactions.slice().reverse().slice(0, 30).map((tx: any, i: number) => (
                <Card key={tx._id ?? i} style={styles.txCard} mode="outlined">
                  <Card.Content style={styles.txRow}>
                    <MaterialCommunityIcons
                      name={tx.type === 'topup' ? 'arrow-down-circle' : tx.type === 'refund' ? 'arrow-left-circle' : 'arrow-up-circle'}
                      size={28}
                      color={tx.type === 'topup' || tx.type === 'refund' ? '#065F46' : '#991B1B'}
                    />
                    <View style={styles.txInfo}>
                      <Text style={styles.txDesc}>{tx.description ?? (tx.type === 'topup' ? t(`${NS}.defaultTopupDesc`) : t(`${NS}.defaultPaymentDesc`))}</Text>
                      <Text style={styles.txDate}>{tx.createdAt ? new Date(tx.createdAt).toLocaleString('vi-VN') : ''}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.txAmount, { color: tx.type === 'topup' || tx.type === 'refund' ? '#065F46' : '#991B1B' }]}>
                        {tx.type === 'topup' || tx.type === 'refund' ? '+' : '-'}{tx.amount?.toLocaleString('vi-VN')} ₫
                      </Text>
                      <Chip compact style={{ backgroundColor: tx.status === 'completed' ? '#D1FAE5' : tx.status === 'pending' ? '#FFEDD5' : '#FEE2E2', height: 20, marginTop: 2 }}>
                        <Text style={{ fontSize: 9, color: tx.status === 'completed' ? '#065F46' : tx.status === 'pending' ? '#92400E' : '#991B1B' }}>
                          {tx.status === 'completed' ? t(`${NS}.statusCompleted`) : tx.status === 'pending' ? t(`${NS}.statusPending`) : t(`${NS}.statusFailed`)}
                        </Text>
                      </Chip>
                    </View>
                  </Card.Content>
                </Card>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="receipt-text-outline" size={28} color="#9CA3AF" />
                <Text style={styles.emptyText}>{t(`${NS}.emptyTransactions`)}</Text>
              </View>
            )}
          </ScreenLayout>
        </ScrollView>
      </View>

      <Portal>
        <Dialog visible={showTopup} onDismiss={() => setShowTopup(false)} style={{ borderRadius: 16 }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Dialog.Title>{t(`${NS}.topupButton`)}</Dialog.Title>
            <Dialog.Content>
              <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>{t(`${NS}.chooseAmountText`)}</Text>
              <View style={styles.amountGrid}>
                {AMOUNTS.map((a) => (
                  <Chip
                    key={a}
                    selected={selectedAmount === a}
                    onPress={() => { setSelectedAmount(a); setCustomAmount(''); }}
                    style={[styles.amountChip, selectedAmount === a && { backgroundColor: COLOR }]}
                    textStyle={selectedAmount === a ? { color: '#fff' } : undefined}
                  >
                    {a >= 1000000 ? `${a / 1000000}tr` : `${(a / 1000).toFixed(0)}k`}
                  </Chip>
                ))}
              </View>
              <TextInput
                label={t(`${NS}.customAmountLabel`)}
                mode="outlined"
                keyboardType="numeric"
                value={customAmount}
                onChangeText={(v) => { setCustomAmount(v.replace(/[^0-9]/g, '')); setSelectedAmount(null); }}
                style={{ marginTop: 12 }}
                dense
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              <Text style={styles.amountHint}>
                {t(`${NS}.amountHint`, { min: TOPUP_MIN.toLocaleString('vi-VN'), max: TOPUP_MAX.toLocaleString('vi-VN') })}
              </Text>
              {amount > 0 ? (
                <Text style={styles.amountPreview}>{t(`${NS}.amountPreview`, { amount: amount.toLocaleString('vi-VN') })}</Text>
              ) : null}
              {amount > 0 && (amount < TOPUP_MIN || amount > TOPUP_MAX) ? (
                <Text style={styles.amountError}>
                  {amount < TOPUP_MIN
                    ? t(`${NS}.toastAmountTooLow`, { amount: TOPUP_MIN.toLocaleString('vi-VN') })
                    : t(`${NS}.toastAmountTooHigh`, { amount: TOPUP_MAX.toLocaleString('vi-VN') })}
                </Text>
              ) : null}
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowTopup(false)}>{t('common.cancel')}</Button>
              <Button
                mode="contained"
                buttonColor={COLOR}
                onPress={handleTopup}
                loading={topupMutation.isPending}
                disabled={!amount || amount < TOPUP_MIN || amount > TOPUP_MAX}
              >
                {t(`${NS}.continue`)}
              </Button>
            </Dialog.Actions>
          </KeyboardAvoidingView>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4 },
  topBarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  body: { padding: 16, paddingBottom: 32 },
  qrBody: { padding: 16, paddingBottom: 32, alignItems: 'center' },

  heroGradient: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 36,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroTitle: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '500', marginTop: 4 },
  heroSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 16 },
  heroAmount: { color: '#fff', fontSize: 40, fontWeight: '700', marginTop: 4 },
  heroStatsRow: { flexDirection: 'row', gap: 10, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' },
  heroStatPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  heroStatText: { color: '#fff', fontSize: 11, fontWeight: '500' },
  heroAction: { alignItems: 'center', marginTop: 24, gap: 6 },
  heroActionCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroActionLabel: { color: '#fff', fontSize: 13, fontWeight: '500' },

  contentSheet: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
  },
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 16,
    alignItems: 'center', paddingVertical: 28, gap: 8,
  },

  qrCard: { borderRadius: 16, width: '100%', marginBottom: 12 },
  qrContent: { alignItems: 'center', paddingVertical: 20 },
  qrTitle: { fontSize: 15, fontWeight: '500', color: '#374151' },
  qrAmount: { fontSize: 24, fontWeight: '700', color: COLOR, marginTop: 4, marginBottom: 16 },
  qrImage: { width: 240, height: 240, borderRadius: 12 },
  qrPlaceholder: { width: 240, height: 240, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F0F0', borderRadius: 12 },
  qrPlaceholderText: { fontSize: 13, color: '#9CA3AF', marginTop: 8 },
  orderCode: { fontSize: 12, color: '#9CA3AF', marginTop: 12 },

  saveBtn: { borderRadius: 8, borderColor: COLOR, width: '100%', marginBottom: 8 },

  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 4 },
  methodCard: { width: 80, alignItems: 'center', gap: 6 },
  methodIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  methodName: { fontSize: 12, fontWeight: '500', color: '#374151', textAlign: 'center' },

  pollingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, backgroundColor: '#FFFBEB', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, width: '100%', justifyContent: 'center' },
  pollingText: { fontSize: 13, color: '#92400E' },

  successBox: { alignItems: 'center', marginTop: 60 },
  successText: { fontSize: 20, fontWeight: '600', color: '#065F46', marginTop: 12 },
  successAmount: { fontSize: 28, fontWeight: '700', color: COLOR, marginTop: 4 },

  txCard: { borderRadius: 12, marginBottom: 6, backgroundColor: '#fff' },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 13, fontWeight: '500', color: '#111827' },
  txDate: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '600' },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },

  amountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amountChip: { borderRadius: 20 },
  amountPreview: { fontSize: 15, fontWeight: '600', color: COLOR, marginTop: 12, textAlign: 'center' },
  amountHint: { fontSize: 11, color: '#9CA3AF', marginTop: 8, textAlign: 'center' },
  amountError: { fontSize: 12, color: '#991B1B', marginTop: 6, textAlign: 'center' },
});
