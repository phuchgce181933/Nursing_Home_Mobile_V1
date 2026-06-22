import React, { useState } from 'react';
import { View, FlatList, ScrollView, StyleSheet, RefreshControl, Linking } from 'react-native';
import { Text, Card, Button, Chip, Dialog, Portal, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { useToast } from '../../utils/toast';

const COLOR = '#2E7D32';
const fmt = (v: number | null | undefined) => v != null ? v.toLocaleString('vi-VN') : '0';
const formatDate = (d: string) => {
  if (!d) return 'N/A';
  try { return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return d; }
};

const STATUS_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'issued', label: 'Chưa TT' },
  { value: 'partially_paid', label: 'TT một phần' },
  { value: 'overdue', label: 'Quá hạn' },
  { value: 'paid', label: 'Đã TT' },
  { value: 'cancelled', label: 'Đã hủy' },
];

const PAYABLE = ['issued', 'overdue', 'partially_paid'];

export const FamilyInvoicesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('');
  const [detailItem, setDetailItem] = useState<any>(null);
  const [payDialog, setPayDialog] = useState<any>(null);
  const [payMethod, setPayMethod] = useState<'online' | 'wallet'>('online');
  const [paying, setPaying] = useState(false);

  const residentsQ = useQuery({
    queryKey: ['familyResidents'],
    queryFn: async () => (await api.get(FAMILY.RESIDENTS)).data,
  });
  const residents = residentsQ.data?.data ?? residentsQ.data ?? [];
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null);
  const activeId = selectedResidentId ?? residents[0]?._id;

  const billingQ = useQuery({
    queryKey: ['familyBilling', activeId],
    queryFn: async () => { const r = await api.get(FAMILY.BILLING_SUMMARY(activeId)); return r.data?.data ?? r.data; },
    enabled: !!activeId,
  });

  const invoicesQ = useQuery({
    queryKey: ['familyInvoices', activeId, statusFilter],
    queryFn: async () => (await api.get(FAMILY.INVOICES(activeId), { params: { status: statusFilter || undefined } })).data,
    enabled: !!activeId,
  });

  const walletQ = useQuery({
    queryKey: ['familyWallet'],
    queryFn: async () => { const r = await api.get(FAMILY.WALLET_BALANCE); return r.data?.data ?? r.data; },
  });

  const billing = billingQ.data;
  const invoices = invoicesQ.data?.data ?? invoicesQ.data ?? [];
  const wallet = walletQ.data;
  const loading = residentsQ.isLoading || invoicesQ.isLoading;
  const refetch = () => { billingQ.refetch(); invoicesQ.refetch(); walletQ.refetch(); };

  const handlePayOnline = async (invoice: any) => {
    setPaying(true);
    try {
      const res = await api.get(FAMILY.PAYMENT_URL(activeId, invoice._id));
      const url = res.data?.checkoutUrl ?? res.data?.paymentUrl ?? res.data?.data?.checkoutUrl;
      if (url) {
        await Linking.openURL(url);
        setTimeout(refetch, 3000);
      } else {
        toast('Không nhận được URL thanh toán', 'error');
      }
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Không thể tạo thanh toán', 'error');
    } finally {
      setPaying(false);
      setPayDialog(null);
    }
  };

  const handlePayWallet = async (invoice: any) => {
    const remaining = (invoice.totalAmount ?? invoice.amount ?? 0) - (invoice.paidAmount ?? 0);
    if ((wallet?.balance ?? 0) < remaining) {
      toast('Số dư ví không đủ. Vui lòng nạp thêm.', 'error');
      return;
    }
    setPaying(true);
    try {
      await api.post(FAMILY.INVOICE_PAY(activeId, invoice._id), {
        amount: remaining,
        paymentMethod: 'wallet',
      });
      qc.invalidateQueries({ queryKey: ['familyInvoices'] });
      qc.invalidateQueries({ queryKey: ['familyBilling'] });
      qc.invalidateQueries({ queryKey: ['familyWallet'] });
      toast('Thanh toán bằng ví thành công!', 'success');
      setDetailItem(null);
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Không thể thanh toán', 'error');
    } finally {
      setPaying(false);
      setPayDialog(null);
    }
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Hóa đơn & Thanh toán</Text>
      </View>

      {residents.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={{ gap: 6, paddingHorizontal: 12 }}>
          {residents.map((r: any) => (
            <Chip key={r._id} selected={activeId === r._id} onPress={() => setSelectedResidentId(r._id)} compact
              style={activeId === r._id ? { backgroundColor: COLOR } : undefined}
              textStyle={activeId === r._id ? { color: '#fff' } : undefined}>
              {r.fullName}
            </Chip>
          ))}
        </ScrollView>
      )}

      <ScreenLayout loading={loading} error={invoicesQ.error ? (invoicesQ.error as Error).message : null} onRetry={refetch}>
        <FlatList
          data={invoices}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={COLOR} />}
          ListHeaderComponent={
            <>
              {billing && (
                <View style={styles.summaryGrid}>
                  <Card style={styles.summaryCard} mode="outlined">
                    <Card.Content style={styles.summaryContent}>
                      <MaterialCommunityIcons name="receipt" size={20} color="#1E40AF" />
                      <Text style={styles.summaryValue}>{fmt(billing.totalBilled)} ₫</Text>
                      <Text style={styles.summaryLabel}>Tổng hóa đơn</Text>
                    </Card.Content>
                  </Card>
                  <Card style={styles.summaryCard} mode="outlined">
                    <Card.Content style={styles.summaryContent}>
                      <MaterialCommunityIcons name="check-circle" size={20} color="#065F46" />
                      <Text style={[styles.summaryValue, { color: '#065F46' }]}>{fmt(billing.totalPaid)} ₫</Text>
                      <Text style={styles.summaryLabel}>Đã thanh toán</Text>
                    </Card.Content>
                  </Card>
                  <Card style={styles.summaryCard} mode="outlined">
                    <Card.Content style={styles.summaryContent}>
                      <MaterialCommunityIcons name="alert-circle" size={20} color="#DC2626" />
                      <Text style={[styles.summaryValue, { color: '#DC2626' }]}>{fmt(billing.totalOutstanding ?? ((billing.totalBilled ?? 0) - (billing.totalPaid ?? 0)))} ₫</Text>
                      <Text style={styles.summaryLabel}>Còn nợ</Text>
                    </Card.Content>
                  </Card>
                  <Card style={styles.summaryCard} mode="outlined">
                    <Card.Content style={styles.summaryContent}>
                      <MaterialCommunityIcons name="wallet" size={20} color={COLOR} />
                      <Text style={[styles.summaryValue, { color: COLOR }]}>{fmt(wallet?.balance)} ₫</Text>
                      <Text style={styles.summaryLabel}>Số dư ví</Text>
                    </Card.Content>
                  </Card>
                </View>
              )}

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }} contentContainerStyle={{ gap: 6 }}>
                {STATUS_FILTERS.map((f) => (
                  <Chip key={f.value} selected={statusFilter === f.value} onPress={() => setStatusFilter(f.value)} compact
                    style={statusFilter === f.value ? { backgroundColor: COLOR } : undefined}
                    textStyle={statusFilter === f.value ? { color: '#fff' } : undefined}>
                    {f.label}
                  </Chip>
                ))}
              </ScrollView>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="receipt" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>Không có hóa đơn nào</Text>
            </View>
          }
          renderItem={({ item }) => {
            const total = item.totalAmount ?? item.amount ?? 0;
            const paid = item.paidAmount ?? 0;
            const remaining = total - paid;
            const isPayable = PAYABLE.includes(item.status);
            return (
              <Card style={styles.card} mode="outlined" onPress={() => setDetailItem(item)}>
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <Text style={styles.invoiceNo}>{item.invoiceNumber ?? `#${item._id?.slice(-6)}`}</Text>
                    <StatusBadge status={item.status} size="sm" />
                  </View>
                  <Text style={styles.invoiceAmount}>{fmt(total)} ₫</Text>
                  {paid > 0 && paid < total && (
                    <Text style={styles.paidText}>Đã TT: {fmt(paid)} ₫ · Còn: {fmt(remaining)} ₫</Text>
                  )}
                  <View style={styles.dateRow}>
                    <Text style={styles.dateText}>Ngày tạo: {formatDate(item.createdAt)}</Text>
                    {item.dueDate && <Text style={styles.dateText}>Hạn: {formatDate(item.dueDate)}</Text>}
                  </View>
                  {item.description && <Text style={styles.desc} numberOfLines={1}>{item.description}</Text>}
                </Card.Content>
                {isPayable && (
                  <Card.Actions>
                    <Button compact textColor={COLOR} icon="eye" onPress={() => setDetailItem(item)}>Chi tiết</Button>
                    <Button compact textColor="#1E40AF" icon="credit-card" onPress={() => setPayDialog(item)}>Thanh toán</Button>
                  </Card.Actions>
                )}
              </Card>
            );
          }}
        />
      </ScreenLayout>

      <Portal>
        {/* Invoice Detail Dialog */}
        <Dialog visible={!!detailItem} onDismiss={() => setDetailItem(null)} style={{ borderRadius: 16, maxHeight: '85%' }}>
          <Dialog.Title style={{ fontSize: 16 }}>Chi tiết hóa đơn</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView style={{ paddingHorizontal: 4 }}>
              {detailItem && (
                <>
                  <View style={styles.detailSection}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Mã hóa đơn</Text>
                      <Text style={styles.detailValue}>{detailItem.invoiceNumber ?? `#${detailItem._id?.slice(-6)}`}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Trạng thái</Text>
                      <StatusBadge status={detailItem.status} size="sm" />
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Tổng tiền</Text>
                      <Text style={[styles.detailValue, { fontWeight: '700', color: COLOR }]}>{fmt(detailItem.totalAmount ?? detailItem.amount)} ₫</Text>
                    </View>
                    {(detailItem.paidAmount ?? 0) > 0 && (
                      <>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Đã thanh toán</Text>
                          <Text style={[styles.detailValue, { color: '#065F46' }]}>{fmt(detailItem.paidAmount)} ₫</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Còn lại</Text>
                          <Text style={[styles.detailValue, { color: '#DC2626' }]}>{fmt((detailItem.totalAmount ?? 0) - (detailItem.paidAmount ?? 0))} ₫</Text>
                        </View>
                      </>
                    )}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Ngày tạo</Text>
                      <Text style={styles.detailValue}>{formatDate(detailItem.createdAt)}</Text>
                    </View>
                    {detailItem.dueDate && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Hạn thanh toán</Text>
                        <Text style={styles.detailValue}>{formatDate(detailItem.dueDate)}</Text>
                      </View>
                    )}
                    {detailItem.description && (
                      <View style={{ marginTop: 8 }}>
                        <Text style={styles.detailLabel}>Mô tả</Text>
                        <Text style={[styles.detailValue, { textAlign: 'left', marginTop: 4 }]}>{detailItem.description}</Text>
                      </View>
                    )}
                  </View>

                  {(detailItem.items?.length > 0 || detailItem.lineItems?.length > 0) && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Chi tiết khoản mục</Text>
                      {(detailItem.items ?? detailItem.lineItems ?? []).map((li: any, i: number) => (
                        <View key={i} style={styles.lineItem}>
                          <Text style={styles.lineDesc}>{li.description ?? li.name ?? `Mục ${i + 1}`}</Text>
                          <Text style={styles.lineAmount}>{fmt(li.amount ?? li.unitPrice ?? 0)} ₫</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {(detailItem.payments?.length > 0) && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Lịch sử thanh toán</Text>
                      {detailItem.payments.map((p: any, i: number) => (
                        <View key={i} style={styles.paymentRow}>
                          <MaterialCommunityIcons name={p.method === 'wallet' ? 'wallet' : 'credit-card'} size={16} color="#065F46" />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.payDesc}>{p.method === 'wallet' ? 'Ví điện tử' : p.method === 'payos' ? 'PayOS' : (p.method ?? 'Online')}</Text>
                            <Text style={styles.payDate}>{formatDate(p.paidAt ?? p.createdAt)}</Text>
                          </View>
                          <Text style={styles.payAmount}>+{fmt(p.amount)} ₫</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            {detailItem && PAYABLE.includes(detailItem.status) && (
              <Button textColor="#1E40AF" icon="credit-card" onPress={() => { setPayDialog(detailItem); setDetailItem(null); }}>Thanh toán</Button>
            )}
            <Button onPress={() => setDetailItem(null)}>Đóng</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Pay Dialog */}
        <Dialog visible={!!payDialog} onDismiss={() => setPayDialog(null)} style={{ borderRadius: 16 }}>
          <Dialog.Title style={{ fontSize: 16 }}>Chọn phương thức thanh toán</Dialog.Title>
          <Dialog.Content>
            {payDialog && (
              <>
                <Text style={{ fontSize: 14, color: '#374151', marginBottom: 4 }}>
                  Hóa đơn: {payDialog.invoiceNumber ?? `#${payDialog._id?.slice(-6)}`}
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: COLOR, marginBottom: 16 }}>
                  {fmt((payDialog.totalAmount ?? payDialog.amount ?? 0) - (payDialog.paidAmount ?? 0))} ₫
                </Text>

                <View style={styles.methodList}>
                  <Card style={[styles.methodCard, payMethod === 'wallet' && styles.methodActive]} mode="outlined"
                    onPress={() => setPayMethod('wallet')}>
                    <Card.Content style={styles.methodContent}>
                      <MaterialCommunityIcons name="wallet" size={24} color={payMethod === 'wallet' ? COLOR : '#6B7280'} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.methodTitle}>Ví điện tử</Text>
                        <Text style={styles.methodSub}>Số dư: {fmt(wallet?.balance)} ₫</Text>
                      </View>
                      {payMethod === 'wallet' && <MaterialCommunityIcons name="check-circle" size={20} color={COLOR} />}
                    </Card.Content>
                  </Card>

                  <Card style={[styles.methodCard, payMethod === 'online' && styles.methodActive]} mode="outlined"
                    onPress={() => setPayMethod('online')}>
                    <Card.Content style={styles.methodContent}>
                      <MaterialCommunityIcons name="credit-card-outline" size={24} color={payMethod === 'online' ? '#1E40AF' : '#6B7280'} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.methodTitle}>Thanh toán online</Text>
                        <Text style={styles.methodSub}>PayOS · Ngân hàng · Ví MoMo</Text>
                      </View>
                      {payMethod === 'online' && <MaterialCommunityIcons name="check-circle" size={20} color="#1E40AF" />}
                    </Card.Content>
                  </Card>
                </View>
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPayDialog(null)} disabled={paying}>Hủy</Button>
            <Button mode="contained" buttonColor={payMethod === 'wallet' ? COLOR : '#1E40AF'}
              loading={paying} disabled={paying}
              onPress={() => payMethod === 'wallet' ? handlePayWallet(payDialog) : handlePayOnline(payDialog)}>
              {paying ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
            </Button>
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
  chipScroll: { flexGrow: 0, paddingVertical: 8 },
  list: { padding: 16, paddingBottom: 32 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  summaryCard: { width: '48%', borderRadius: 12, backgroundColor: '#fff' },
  summaryContent: { alignItems: 'center', paddingVertical: 10, gap: 4 },
  summaryValue: { fontSize: 15, fontWeight: '700', color: '#111827' },
  summaryLabel: { fontSize: 10, color: '#6B7280' },
  card: { borderRadius: 12, marginBottom: 10, backgroundColor: '#fff' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  invoiceNo: { fontSize: 14, fontWeight: '600', color: '#111827' },
  invoiceAmount: { fontSize: 18, fontWeight: '700', color: COLOR, marginTop: 4 },
  paidText: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  dateText: { fontSize: 11, color: '#9CA3AF' },
  desc: { fontSize: 12, color: '#6B7280', marginTop: 4, fontStyle: 'italic' },
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 8 },
  detailSection: { marginBottom: 14, padding: 12, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  detailLabel: { fontSize: 13, color: '#6B7280' },
  detailValue: { fontSize: 13, fontWeight: '500', color: '#111827' },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: COLOR, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  lineDesc: { fontSize: 13, color: '#374151', flex: 1 },
  lineAmount: { fontSize: 13, fontWeight: '600', color: '#111827' },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  payDesc: { fontSize: 13, fontWeight: '500', color: '#374151', textTransform: 'capitalize' },
  payDate: { fontSize: 11, color: '#9CA3AF' },
  payAmount: { fontSize: 13, fontWeight: '600', color: '#065F46' },
  methodList: { gap: 8 },
  methodCard: { borderRadius: 12, backgroundColor: '#fff' },
  methodActive: { borderColor: COLOR, borderWidth: 2 },
  methodContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  methodTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  methodSub: { fontSize: 12, color: '#6B7280', marginTop: 1 },
});
