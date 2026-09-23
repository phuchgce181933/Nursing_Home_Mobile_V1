import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl, Linking, Pressable, Platform, Share, KeyboardAvoidingView, Keyboard } from 'react-native';
import { Text, Button, TextInput, Dialog, Portal, Chip } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { useToast } from '../../utils/toast';
import { WalletTopupQrView, PAYMENT_METHOD_NAMES } from './WalletTopupQrView';
import type { TopupResult, PaymentMethod } from './WalletTopupQrView';
import type { WalletQrExportCardHandle } from './WalletQrExportCard';
import { AppCard } from '../../components/ui/AppCard';
import { SummaryCard } from '../../components/ui/SummaryCard';
import { COLORS, RADIUS, SPACING } from '../../theme/designSystem';
import { WalletTx, affectsWallet, amountSign, useWalletTxLabels } from '../../utils/walletTxLabels';

const COLOR = '#2E7D32';
const NS = 'family.wallet';
const AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000];
const TOPUP_MIN = 10000;
const TOPUP_MAX = 500000000;

export const FamilyWalletScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { statusLabel, defaultDescription } = useWalletTxLabels();

  const [showTopup, setShowTopup] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  const [topupData, setTopupData] = useState<TopupResult | null>(null);
  const [pollingStatus, setPollingStatus] = useState<'idle' | 'polling' | 'success' | 'failed'>('idle');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);
  const qrSvgRef = useRef<any>(null);
  const exportCardRef = useRef<WalletQrExportCardHandle | null>(null);
  const [savingQr, setSavingQr] = useState(false);

  const walletQ = useQuery({
    queryKey: ['familyWallet'],
    queryFn: async () => {
      const r = await api.get(FAMILY.WALLET_BALANCE);
      return r.data?.data ?? r.data;
    },
  });

  // Lịch sử giao dịch LẤY TỪ endpoint sổ cái riêng (`/wallet/transactions`).
  // Endpoint `/wallet/balance` CHỈ trả về balance/totalTopup/totalSpent, KHÔNG có
  // mảng transactions — đó là lý do trước đây lịch sử luôn trống. Phạm vi luôn do
  // server suy từ phiên đăng nhập, client không gửi userId.
  const txQ = useQuery({
    queryKey: ['familyWalletTransactions', 'walletMain'],
    queryFn: async () => {
      const r = await api.get(FAMILY.WALLET_TRANSACTIONS, { params: { limit: 30 } });
      return (r.data?.data ?? []) as WalletTx[];
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

  const stopPolling = useCallback((status: 'idle' | 'success' | 'failed' = 'idle') => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setPollingStatus(status);
    if (status === 'success' || status === 'failed') {
      // Give the user a moment to actually read the success/failure state before it
      // clears back to the wallet screen — previously 'failed' cleared on the same
      // tick (0ms), so the user never saw why the transaction ended.
      setTimeout(() => {
        setTopupData(null);
        setPollingStatus('idle');
      }, 2200);
    }
  }, []);

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
          qc.invalidateQueries({ queryKey: ['familyWalletTransactions'] });
          toast(t(`${NS}.toastTopupSuccess`), 'success');
        } else if (status === 'CANCELLED' || status === 'EXPIRED') {
          stopPolling('failed');
          toast(t(`${NS}.toastTxCancelledExpired`), 'warning');
        }
      } catch { /* keep polling */ }
    }, 3000);
  }, [qc, toast, t, stopPolling]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // The native File.write() binding on this Expo Go build only accepts a single
  // argument (confirmed via a device log: "InvalidArgsNumberException: Received 2
  // arguments, but 1 was expected"), so the documented `write(content, { encoding })`
  // two-arg overload for base64 strings isn't usable here. Decoding to raw bytes
  // ourselves and calling write(bytes) with one argument sidesteps that entirely —
  // and is the only way to write real binary PNG data without corrupting it (writing
  // the base64 *text* itself, unconverted, would just save a broken, unreadable file).
  const base64ToBytes = (base64: string): Uint8Array => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
    const bytes: number[] = [];
    let buffer = 0;
    let bits = 0;
    for (let i = 0; i < clean.length; i++) {
      const value = chars.indexOf(clean[i]);
      if (value === -1) continue;
      buffer = (buffer << 6) | value;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        bytes.push((buffer >> bits) & 0xff);
      }
    }
    return new Uint8Array(bytes);
  };

  // Reads the full composite banking-style receipt (logo, QR, amount, transaction
  // and bank details, instructions, footer) as base64 PNG via the hidden export
  // card's own react-native-svg ref (toDataURL always returns bare base64, no
  // "data:image/..." prefix, on both web and native).
  const readReceiptAsBase64 = (): Promise<string> =>
    new Promise((resolve, reject) => {
      if (!exportCardRef.current) {
        reject(new Error('RECEIPT_NOT_READY'));
        return;
      }
      try {
        exportCardRef.current.toDataURL((base64: string) => resolve(base64));
      } catch (err) {
        reject(err);
      }
    });

  const saveQrToGallery = async () => {
    const log = (step: string, extra?: unknown) => {
      // eslint-disable-next-line no-console -- temporary diagnostic logging for the QR-save native bug report
      console.log(`[QRSave] ${step}`, extra !== undefined ? extra : '');
    };
    const logErr = (step: string, err: unknown) => {
      const e = err as any;
      // eslint-disable-next-line no-console -- temporary diagnostic logging for the QR-save native bug report
      console.warn(`[QRSave] ${step} FAILED`, {
        message: e?.message,
        code: e?.code,
        name: e?.name,
        stack: e?.stack,
        raw: String(e),
      });
    };

    log('button pressed', { platform: Platform.OS });

    if (Platform.OS === 'web') {
      try {
        await Share.share({ message: t(`${NS}.toastShareCancel`, { url: topupData?.checkoutUrl || '' }) });
      } catch { /* user cancelled */ }
      return;
    }
    if (savingQr) return;
    setSavingQr(true);
    let tempFile: InstanceType<typeof import('expo-file-system').File> | undefined;
    try {
      /* eslint-disable @typescript-eslint/no-require-imports -- loaded lazily so these heavy native modules aren't pulled in unless the user actually saves a QR code */
      const MediaLibrary = require('expo-media-library');
      // Expo SDK 54: expo-file-system's default export is the new File/Directory/Paths
      // API (the old EncodingType/writeAsStringAsync/cacheDirectory surface was moved to
      // 'expo-file-system/legacy'). See base64ToBytes above for why we write raw bytes
      // instead of using the documented write(content, { encoding: 'base64' }) overload.
      const { File, Paths } = require('expo-file-system');
      /* eslint-enable @typescript-eslint/no-require-imports */
      log('modules loaded', { hasFile: typeof File, hasPaths: typeof Paths, hasMediaLibrary: typeof MediaLibrary });

      let base64: string;
      try {
        base64 = await readReceiptAsBase64();
        log('base64 read ok', { length: base64?.length });
      } catch (err) {
        logErr('readReceiptAsBase64', err);
        toast(t(`${NS}.toastPreparingReceipt`), 'warning');
        return;
      }

      const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync(true);
      log('permission result', { status, canAskAgain });
      if (status !== 'granted') {
        toast(canAskAgain ? t(`${NS}.toastNeedGalleryPermission`) : t(`${NS}.toastGalleryPermissionBlocked`), 'warning');
        return;
      }

      try {
        log('Paths.cache', { cacheUri: Paths.cache?.uri });
        const bytes = base64ToBytes(base64);
        log('decoded to bytes', { byteLength: bytes.length });
        const created = new File(Paths.cache, `annhien_qr_receipt_${Date.now()}.png`);
        log('File instance created', { uri: created?.uri });
        created.write(bytes);
        log('write() completed');
        tempFile = created;
      } catch (err) {
        logErr('write temp file', err);
        toast(t(`${NS}.toastQrWriteError`), 'error');
        return;
      }
      if (!tempFile) return;

      try {
        log('saving to library', { uri: tempFile.uri });
        const asset = await MediaLibrary.saveToLibraryAsync(tempFile.uri);
        log('saveToLibraryAsync ok', asset);
      } catch (err) {
        logErr('saveToLibraryAsync', err);
        toast(t(`${NS}.toastQrSaveError`), 'error');
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast(t(`${NS}.toastQrSaved`), 'success');
      log('done — success');
    } catch (err) {
      logErr('unexpected top-level error', err);
      toast(t(`${NS}.toastQrSaveError`), 'error');
    } finally {
      // Best-effort cleanup of the temp cache file — MediaLibrary already copied it
      // into Photos, so it no longer needs to live in the cache directory.
      try { tempFile?.delete(); } catch { /* already gone, or cache was cleared — fine either way */ }
      setSavingQr(false);
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

  const [txFilter, setTxFilter] = useState<'all' | 'topup' | 'spend'>('all');
  // "topup" gộp các dòng làm ví TĂNG (nạp tiền + hoàn tiền); "spend" là các dòng
  // còn lại (thanh toán). Nhóm theo CHIỀU tiền để không lệ thuộc enum thô.
  const isTopupTx = (tx: WalletTx) => tx.type === 'topup' || tx.type === 'refund';
  const allTransactions: WalletTx[] = txQ.data ?? [];
  const filteredTransactions = allTransactions
    .filter((tx) => (txFilter === 'all' ? true : txFilter === 'topup' ? isTopupTx(tx) : !isTopupTx(tx)));
  const TX_FILTERS: { key: 'all' | 'topup' | 'spend'; labelKey: string }[] = [
    { key: 'all', labelKey: `${NS}.filterAll` },
    { key: 'topup', labelKey: `${NS}.filterTopup` },
    { key: 'spend', labelKey: `${NS}.filterSpend` },
  ];

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
      <WalletTopupQrView
        topupData={topupData}
        pollingStatus={pollingStatus}
        topInset={insets.top}
        qrSvgRef={qrSvgRef}
        exportCardRef={exportCardRef}
        savingQr={savingQr}
        onCancel={cancelTopup}
        onSaveQr={saveQrToGallery}
        onOpenPaymentApp={openPaymentApp}
      />
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
          refreshControl={<RefreshControl refreshing={walletQ.isFetching || txQ.isFetching} onRefresh={() => { walletQ.refetch(); txQ.refetch(); }} tintColor={COLOR} />}
        >
          <View style={styles.summaryRow}>
            <SummaryCard
              icon="arrow-down-circle-outline"
              value={`${(wallet?.totalTopup ?? 0).toLocaleString('vi-VN')} ₫`}
              label={t(`${NS}.totalTopupLabelShort`)}
              color={COLOR}
            />
            <SummaryCard
              icon="arrow-up-circle-outline"
              value={`${(wallet?.totalSpent ?? 0).toLocaleString('vi-VN')} ₫`}
              label={t(`${NS}.totalSpentLabelShort`)}
              color={COLOR}
            />
          </View>

          <ScreenLayout loading={walletQ.isLoading || txQ.isLoading} error={txQ.error ? (txQ.error as Error).message : walletQ.error ? (walletQ.error as Error).message : null} onRetry={() => { walletQ.refetch(); txQ.refetch(); }}>
            <SectionHeader title={t(`${NS}.transactionHistoryTitle`)} roleColor={COLOR} />
            {allTransactions.length ? (
              <View style={styles.txFilterRow}>
                {TX_FILTERS.map((f) => (
                  <Chip
                    key={f.key}
                    selected={txFilter === f.key}
                    onPress={() => setTxFilter(f.key)}
                    style={[styles.txFilterChip, txFilter === f.key && { backgroundColor: COLOR }]}
                    textStyle={txFilter === f.key ? { color: '#fff' } : undefined}
                    compact
                  >
                    {t(f.labelKey)}
                  </Chip>
                ))}
              </View>
            ) : null}
            {filteredTransactions.length ? (
              filteredTransactions.map((tx, i) => {
                // Dấu +/- theo CHIỀU tiền (credit/debit/none). Dòng trả hoá đơn thẳng
                // qua PayOS (walletAffected=false) KHÔNG hiển thị dấu trừ số dư ví.
                const sign = amountSign(tx);
                const amountColor = sign === '+' ? '#065F46' : sign === '-' ? '#991B1B' : '#374151';
                const iconName = tx.type === 'refund' ? 'cash-refund'
                  : tx.type === 'topup' ? 'arrow-down-circle'
                  : !affectsWallet(tx) ? 'bank-outline'
                  : 'arrow-up-circle';
                return (
                  <AppCard key={tx._id ?? i} style={styles.txCard} onPress={() => navigation?.navigate('TransactionDetail', { transactionId: tx._id })}>
                    <View style={styles.txRow}>
                      <MaterialCommunityIcons name={iconName as any} size={28} color={amountColor} />
                      <View style={styles.txInfo}>
                        <Text style={styles.txDesc} numberOfLines={1}>{defaultDescription(tx)}</Text>
                        <Text style={styles.txDate}>{tx.createdAt ? new Date(tx.createdAt).toLocaleString('vi-VN') : ''}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.txAmount, { color: amountColor }]}>
                          {sign}{tx.amount?.toLocaleString('vi-VN')} ₫
                        </Text>
                        <Chip compact style={{ backgroundColor: tx.status === 'completed' ? '#D1FAE5' : tx.status === 'pending' ? '#FFEDD5' : '#FEE2E2', height: 20, marginTop: 2 }}>
                          <Text style={{ fontSize: 9, color: tx.status === 'completed' ? '#065F46' : tx.status === 'pending' ? '#92400E' : '#991B1B' }}>
                            {statusLabel(tx.status)}
                          </Text>
                        </Chip>
                      </View>
                    </View>
                  </AppCard>
                );
              })
            ) : (
              <AppCard style={styles.emptyCard}>
                <MaterialCommunityIcons name="receipt-text-outline" size={28} color={COLORS.gray300} />
                <Text style={styles.emptyText}>
                  {allTransactions.length ? t(`${NS}.noMatchingTransactions`) : t(`${NS}.emptyTransactions`)}
                </Text>
              </AppCard>
            )}
          </ScreenLayout>
        </ScrollView>
      </View>

      <Portal>
        <Dialog
          visible={showTopup}
          onDismiss={() => setShowTopup(false)}
          dismissable={false}
          dismissableBackButton
          style={{ borderRadius: RADIUS.card }}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
                submitBehavior="blurAndSubmit"
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
  flex: { flex: 1, backgroundColor: COLORS.gray50 },
  body: { padding: SPACING.md, paddingBottom: SPACING.xl },

  heroGradient: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl + SPACING.md,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  heroTitle: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '500', marginTop: 4 },
  heroSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 16 },
  heroAmount: { color: '#fff', fontSize: 40, fontWeight: '700', marginTop: 4 },
  heroAction: { alignItems: 'center', marginTop: 24, gap: 6 },
  heroActionCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroActionLabel: { color: '#fff', fontSize: 13, fontWeight: '500' },

  contentSheet: { flex: 1, marginTop: -36 },
  summaryRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg },
  emptyCard: { alignItems: 'center', paddingVertical: 28, gap: 8 },

  txFilterRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  txFilterChip: { borderRadius: RADIUS.pill },

  txCard: { marginBottom: SPACING.sm },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 13, fontWeight: '500', color: COLORS.dark },
  txDate: { fontSize: 11, color: COLORS.gray500, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '600' },
  emptyText: { fontSize: 13, color: COLORS.gray500, textAlign: 'center' },

  amountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amountChip: { borderRadius: RADIUS.pill },
  amountPreview: { fontSize: 15, fontWeight: '600', color: COLOR, marginTop: 12, textAlign: 'center' },
  amountHint: { fontSize: 11, color: COLORS.gray500, marginTop: 8, textAlign: 'center' },
  amountError: { fontSize: 12, color: COLORS.danger, marginTop: 6, textAlign: 'center' },
});
