import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Linking } from 'react-native';
import { Text, Card, Button, Chip, Dialog, Portal } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { useToast } from '../../utils/toast';

const COLOR = '#2E7D32';

export const FamilyInvoicesScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();

  const residentsQ = useQuery({
    queryKey: ['familyResidents'],
    queryFn: async () => { const r = await api.get(FAMILY.RESIDENTS); return r.data; },
  });
  const residents = residentsQ.data?.data ?? residentsQ.data ?? [];
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null);
  const activeId = selectedResidentId ?? residents[0]?._id;
  const activeResident = residents.find((r: any) => r._id === activeId);

  const invoicesQ = useQuery({
    queryKey: ['familyInvoices', activeId],
    queryFn: async () => { const r = await api.get(FAMILY.INVOICES(activeId!)); return r.data; },
    enabled: !!activeId,
  });
  const invoices = invoicesQ.data?.data ?? invoicesQ.data ?? [];

  const [payInvoice, setPayInvoice] = useState<any>(null);

  const walletPayMut = useMutation({
    mutationFn: async () => {
      const res = await api.post(FAMILY.PAY_INVOICE(activeId, payInvoice._id), { paymentMethod: 'wallet' });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['familyInvoices'] });
      qc.invalidateQueries({ queryKey: ['familyWallet'] });
      setPayInvoice(null);
      toast('Thanh toán thành công!', 'success');
    },
    onError: (e: any) => {
      setPayInvoice(null);
      toast(e.response?.data?.message ?? 'Thanh toán thất bại', 'error');
    },
  });

  const handlePayOnline = async (invoiceId: string) => {
    setPayInvoice(null);
    try {
      const res = await api.get(FAMILY.PAYMENT_URL(activeId, invoiceId));
      const url = res.data?.checkoutUrl ?? res.data?.paymentUrl ?? res.data?.data?.checkoutUrl;
      if (url) await Linking.openURL(url);
      else toast('Không nhận được URL thanh toán', 'error');
    } catch {
      toast('Không thể tạo thanh toán. Thử lại.', 'error');
    }
  };

  const refetch = () => { residentsQ.refetch(); invoicesQ.refetch(); };

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Hóa đơn</Text>
      </View>

      {activeResident && (
        <View style={styles.summaryRow}>
          <Button mode="text" icon="chart-box-outline" textColor={COLOR} compact
            onPress={() => navigation?.navigate('BillingSummary', { residentId: activeId, residentName: activeResident.fullName })}>
            Tổng quan tài chính
          </Button>
        </View>
      )}

      {residents.length > 1 ? (
        <View style={styles.chipRow}>
          {residents.map((r: any) => (
            <Chip key={r._id} selected={activeId === r._id} onPress={() => setSelectedResidentId(r._id)}
              style={activeId === r._id ? { backgroundColor: COLOR } : undefined}
              textStyle={activeId === r._id ? { color: '#fff' } : undefined} compact>
              {r.fullName}
            </Chip>
          ))}
        </View>
      ) : null}

      <ScreenLayout loading={invoicesQ.isLoading || residentsQ.isLoading}
        error={invoicesQ.error ? (invoicesQ.error as Error).message : null}
        onRetry={refetch} isEmpty={invoices.length === 0} emptyMessage="Không có hóa đơn nào">
        <FlatList data={invoices} keyExtractor={(item: any) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={COLOR} />}
          renderItem={({ item }) => {
            const isPending = ['issued', 'ISSUED', 'overdue', 'partially_paid', 'PARTIALLY_PAID'].includes(item.status);
            return (
              <Card style={styles.card} mode="outlined"
                onPress={() => navigation?.navigate('InvoiceDetail', { invoice: item, residentId: activeId })}>
                <Card.Content>
                  <View style={styles.invoiceRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.invoiceNumber}>{item.invoiceNumber ?? `#${item._id.slice(-6)}`}</Text>
                      <Text style={styles.invoiceAmount}>
                        {(item.totalAmount ?? item.amount ?? 0).toLocaleString('vi-VN')} ₫
                      </Text>
                      <Text style={styles.invoiceDate}>
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : ''}
                      </Text>
                    </View>
                    <StatusBadge status={item.status} size="sm" />
                  </View>
                </Card.Content>
                {isPending ? (
                  <Card.Actions>
                    <Button compact textColor={COLOR} onPress={() => setPayInvoice(item)}>Thanh toán</Button>
                  </Card.Actions>
                ) : null}
              </Card>
            );
          }}
        />
      </ScreenLayout>

      <Portal>
        <Dialog visible={!!payInvoice} onDismiss={() => setPayInvoice(null)} style={{ borderRadius: 16 }}>
          <Dialog.Title>Chọn phương thức</Dialog.Title>
          <Dialog.Content>
            <Text style={{ fontSize: 14, color: '#374151', marginBottom: 16 }}>
              Số tiền: {(payInvoice?.totalAmount ?? payInvoice?.amount ?? 0).toLocaleString('vi-VN')} ₫
            </Text>
            <Button mode="outlined" icon="wallet-outline" style={styles.methodBtn}
              onPress={() => walletPayMut.mutate()} loading={walletPayMut.isPending}>
              Thanh toán bằng ví
            </Button>
            <Button mode="outlined" icon="credit-card-outline" style={styles.methodBtn}
              onPress={() => handlePayOnline(payInvoice?._id)}>
              Thanh toán online (PayOS)
            </Button>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPayInvoice(null)}>Hủy</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  summaryRow: { paddingHorizontal: 12, paddingTop: 8, alignItems: 'flex-start' },
  chipRow: { flexDirection: 'row', gap: 6, padding: 12, flexWrap: 'wrap' },
  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  invoiceRow: { flexDirection: 'row', alignItems: 'center' },
  invoiceNumber: { fontSize: 14, fontWeight: '600', color: '#111827' },
  invoiceAmount: { fontSize: 16, fontWeight: '700', color: COLOR, marginTop: 4 },
  invoiceDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  methodBtn: { borderRadius: 8, marginBottom: 8, borderColor: COLOR },
});
