import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ScrollView, View, FlatList, StyleSheet, RefreshControl, Linking, Image, Alert, Pressable, Platform, Share } from 'react-native';
import { Text, Card, Button, TextInput, Dialog, Portal, Chip, ActivityIndicator, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import QRCode from 'react-native-qrcode-svg';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { useToast } from '../../utils/toast';

const COLOR = '#2E7D32';
const AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000];

type TopupResult = {
  checkoutUrl?: string;
  qrCode?: string;
  topupId: string;
  orderCode?: number;
  amount: number;
};

type PaymentMethod = {
  id: string;
  name: string;
  icon: string;
  scheme: string;
  color: string;
};

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'bank', name: 'Ngân hàng', icon: 'bank-outline', scheme: '', color: '#1565C0' },
  { id: 'momo', name: 'MoMo', icon: 'cellphone', scheme: 'momo://', color: '#A50064' },
  { id: 'zalopay', name: 'ZaloPay', icon: 'wallet-outline', scheme: 'zalopay://', color: '#008FE5' },
  { id: 'vnpay', name: 'VNPay', icon: 'credit-card-outline', scheme: 'vnpay://', color: '#D62027' },
];

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
        toast('Không nhận được thông tin thanh toán', 'error');
      }
    },
    onError: (e: any) => toast(e.response?.data?.message ?? 'Không thể tạo yêu cầu nạp tiền', 'error'),
  });

  const startPolling = useCallback((topupId: string) => {
    pollCountRef.current = 0;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      pollCountRef.current++;
      if (pollCountRef.current > 200) {
        stopPolling('failed');
        toast('Hết thời gian chờ thanh toán', 'warning');
        return;
      }
      try {
        const res = await api.post(FAMILY.WALLET_TOPUP_VERIFY, { topupId });
        const status = res.data?.data?.status ?? res.data?.status;
        if (status === 'PAID') {
          stopPolling('success');
          qc.invalidateQueries({ queryKey: ['familyWallet'] });
          toast('Nạp tiền thành công!', 'success');
        } else if (status === 'CANCELLED' || status === 'EXPIRED') {
          stopPolling('failed');
          toast('Giao dịch đã bị hủy hoặc hết hạn', 'warning');
        }
      } catch { /* keep polling */ }
    }, 3000);
  }, [qc, toast]);

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
        await Share.share({ message: `Link thanh toán:\n${topupData?.checkoutUrl || ''}` });
      } catch { /* user cancelled */ }
      return;
    }
    if (!qrSvgRef.current) {
      toast('Chưa tạo được mã QR', 'warning');
      return;
    }
    try {
      const MediaLibrary = require('expo-media-library');
      const ExpoFS = require('expo-file-system');
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        toast('Cần quyền truy cập thư viện ảnh', 'warning');
        return;
      }
      qrSvgRef.current.toDataURL(async (base64: string) => {
        try {
          const filename = `qr_topup_${Date.now()}.png`;
          const fileUri = `${ExpoFS.cacheDirectory}${filename}`;
          await ExpoFS.writeAsStringAsync(fileUri, base64, { encoding: ExpoFS.EncodingType.Base64 });
          await MediaLibrary.saveToLibraryAsync(fileUri);
          toast('Đã lưu mã QR vào thư viện ảnh', 'success');
        } catch {
          toast('Không thể lưu mã QR', 'error');
        }
      });
    } catch {
      toast('Không thể lưu mã QR', 'error');
    }
  };

  const openPaymentApp = async (method: PaymentMethod) => {
    if (!method.scheme) {
      toast('Mở ứng dụng ngân hàng và quét mã QR', 'warning');
      return;
    }
    try {
      const canOpen = await Linking.canOpenURL(method.scheme);
      if (canOpen) {
        await Linking.openURL(method.scheme);
      } else {
        toast(`Không tìm thấy ứng dụng ${method.name}`, 'warning');
      }
    } catch {
      toast(`Không thể mở ${method.name}`, 'error');
    }
  };

  const wallet = walletQ.data;
  const amount = selectedAmount ?? (customAmount ? Number(customAmount) : 0);

  const handleTopup = () => {
    if (!amount || amount <= 0) {
      toast('Vui lòng nhập số tiền', 'warning');
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
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <View style={styles.topBarRow}>
            <IconButton icon="arrow-left" iconColor="#fff" size={24} onPress={cancelTopup} />
            <Text style={styles.topTitle}>Nạp tiền</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>

        <ScrollView style={styles.flex} contentContainerStyle={styles.qrBody}>
          {pollingStatus === 'success' ? (
            <View style={styles.successBox}>
              <MaterialCommunityIcons name="check-circle" size={64} color="#065F46" />
              <Text style={styles.successText}>Nạp tiền thành công!</Text>
              <Text style={styles.successAmount}>{topupData.amount?.toLocaleString('vi-VN')} ₫</Text>
            </View>
          ) : (
            <>
              <Card style={styles.qrCard} mode="elevated">
                <Card.Content style={styles.qrContent}>
                  <Text style={styles.qrTitle}>Quét mã QR để thanh toán</Text>
                  <Text style={styles.qrAmount}>{topupData.amount?.toLocaleString('vi-VN')} ₫</Text>

                  {topupData.qrCode ? (
                    <QrDisplay value={topupData.qrCode} qrRef={qrSvgRef} />
                  ) : (
                    <View style={styles.qrImage}>
                      <ActivityIndicator size="large" color={COLOR} />
                      <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 8 }}>Đang tải mã QR...</Text>
                    </View>
                  )}

                  {topupData.orderCode ? (
                    <Text style={styles.orderCode}>Mã giao dịch: {topupData.orderCode}</Text>
                  ) : null}
                </Card.Content>
              </Card>

              <Button mode="outlined" icon="download" onPress={saveQrToGallery} style={styles.saveBtn} textColor={COLOR}>
                Lưu mã QR về máy
              </Button>

              <SectionHeader title="Chọn phương thức thanh toán" roleColor={COLOR} />
              <View style={styles.methodGrid}>
                {PAYMENT_METHODS.map((m) => (
                  <Pressable key={m.id} style={styles.methodCard} onPress={() => openPaymentApp(m)}>
                    <View style={[styles.methodIcon, { backgroundColor: m.color + '15' }]}>
                      <MaterialCommunityIcons name={m.icon as any} size={28} color={m.color} />
                    </View>
                    <Text style={styles.methodName}>{m.name}</Text>
                  </Pressable>
                ))}
              </View>

              {pollingStatus === 'polling' ? (
                <View style={styles.pollingRow}>
                  <ActivityIndicator size="small" color={COLOR} />
                  <Text style={styles.pollingText}>Đang chờ xác nhận thanh toán...</Text>
                </View>
              ) : null}

              <Button mode="text" textColor="#991B1B" onPress={cancelTopup} style={{ marginTop: 16 }}>
                Hủy giao dịch
              </Button>
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Ví điện tử</Text>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={false} onRefresh={walletQ.refetch} tintColor={COLOR} />}
      >
        <ScreenLayout loading={walletQ.isLoading} error={walletQ.error ? (walletQ.error as Error).message : null} onRetry={walletQ.refetch}>
          <Card style={styles.balanceCard} mode="elevated">
            <Card.Content style={styles.balanceContent}>
              <MaterialCommunityIcons name="wallet-outline" size={32} color={COLOR} />
              <Text style={styles.balanceLabel}>Số dư hiện tại</Text>
              <Text style={styles.balanceAmount}>
                {wallet?.balance != null ? wallet.balance.toLocaleString('vi-VN') : '0'} ₫
              </Text>
              <View style={styles.balanceStats}>
                <View style={styles.balanceStat}>
                  <MaterialCommunityIcons name="arrow-down-circle-outline" size={16} color="#065F46" />
                  <Text style={styles.balanceStatText}>Nạp: {wallet?.totalTopup?.toLocaleString('vi-VN') ?? '0'} ₫</Text>
                </View>
                <View style={styles.balanceStat}>
                  <MaterialCommunityIcons name="arrow-up-circle-outline" size={16} color="#991B1B" />
                  <Text style={styles.balanceStatText}>Chi: {wallet?.totalSpent?.toLocaleString('vi-VN') ?? '0'} ₫</Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          <Button mode="contained" buttonColor={COLOR} icon="plus" style={styles.topupBtn} contentStyle={{ height: 48 }} onPress={() => setShowTopup(true)}>
            Nạp tiền vào ví
          </Button>

          <SectionHeader title="Lịch sử giao dịch" roleColor={COLOR} />
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
                    <Text style={styles.txDesc}>{tx.description ?? (tx.type === 'topup' ? 'Nạp tiền' : 'Thanh toán')}</Text>
                    <Text style={styles.txDate}>{tx.createdAt ? new Date(tx.createdAt).toLocaleString('vi-VN') : ''}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.txAmount, { color: tx.type === 'topup' || tx.type === 'refund' ? '#065F46' : '#991B1B' }]}>
                      {tx.type === 'topup' || tx.type === 'refund' ? '+' : '-'}{tx.amount?.toLocaleString('vi-VN')} ₫
                    </Text>
                    <Chip compact style={{ backgroundColor: tx.status === 'completed' ? '#D1FAE5' : tx.status === 'pending' ? '#FFEDD5' : '#FEE2E2', height: 20, marginTop: 2 }}>
                      <Text style={{ fontSize: 9, color: tx.status === 'completed' ? '#065F46' : tx.status === 'pending' ? '#92400E' : '#991B1B' }}>
                        {tx.status === 'completed' ? 'Hoàn thành' : tx.status === 'pending' ? 'Chờ' : 'Thất bại'}
                      </Text>
                    </Chip>
                  </View>
                </Card.Content>
              </Card>
            ))
          ) : (
            <Text style={styles.emptyText}>Chưa có giao dịch nào</Text>
          )}
        </ScreenLayout>
      </ScrollView>

      <Portal>
        <Dialog visible={showTopup} onDismiss={() => setShowTopup(false)} style={{ borderRadius: 16 }}>
          <Dialog.Title>Nạp tiền vào ví</Dialog.Title>
          <Dialog.Content>
            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>Chọn hoặc nhập số tiền muốn nạp</Text>
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
              label="Nhập số tiền tùy chỉnh (₫)"
              mode="outlined"
              keyboardType="numeric"
              value={customAmount}
              onChangeText={(v) => { setCustomAmount(v.replace(/[^0-9]/g, '')); setSelectedAmount(null); }}
              style={{ marginTop: 12 }}
              dense
            />
            {amount > 0 ? (
              <Text style={styles.amountPreview}>Số tiền nạp: {amount.toLocaleString('vi-VN')} ₫</Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowTopup(false)}>Hủy</Button>
            <Button mode="contained" buttonColor={COLOR} onPress={handleTopup} loading={topupMutation.isPending} disabled={!amount || amount <= 0}>
              Tiếp tục
            </Button>
          </Dialog.Actions>
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

  balanceCard: { borderRadius: 16, marginBottom: 16 },
  balanceContent: { alignItems: 'center', paddingVertical: 20 },
  balanceLabel: { fontSize: 13, color: '#6B7280', marginTop: 8 },
  balanceAmount: { fontSize: 32, fontWeight: '700', color: COLOR, marginTop: 4 },
  balanceStats: { flexDirection: 'row', gap: 16, marginTop: 12 },
  balanceStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  balanceStatText: { fontSize: 12, color: '#6B7280' },

  topupBtn: { borderRadius: 8, marginBottom: 16 },

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
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 24 },

  amountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amountChip: { borderRadius: 20 },
  amountPreview: { fontSize: 15, fontWeight: '600', color: COLOR, marginTop: 12, textAlign: 'center' },
});
