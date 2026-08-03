import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Linking } from 'react-native';
import { Text, Card, Button, Chip, Dialog, Portal, IconButton, Checkbox } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { useToast } from '../../utils/toast';

const COLOR = '#2E7D32';
const NS = 'family.invoices';

const isPayable = (status: string) => ['issued', 'ISSUED', 'overdue', 'partially_paid', 'PARTIALLY_PAID'].includes(status);

export const FamilyInvoicesScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const { t } = useTranslation();

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

  // Batch-pay mode (multi-select unpaid invoices → pay all via wallet in one call), matching the
  // web dashboard's batch-payment action (`POST /residents/:id/invoices/batch-pay`).
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);

  const toggleSelectMode = () => {
    setSelectMode((v) => !v);
    setSelectedIds(new Set());
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedTotal = invoices
    .filter((inv: any) => selectedIds.has(inv._id))
    .reduce((sum: number, inv: any) => sum + (inv.totalAmount ?? inv.amount ?? 0), 0);

  const batchPayMut = useMutation({
    mutationFn: async () => {
      const res = await api.post(FAMILY.BATCH_PAY_INVOICES(activeId), { invoiceIds: Array.from(selectedIds), paymentMethod: 'wallet' });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['familyInvoices'] });
      qc.invalidateQueries({ queryKey: ['familyWallet'] });
      setShowBatchConfirm(false);
      setSelectMode(false);
      setSelectedIds(new Set());
      toast(t(`${NS}.batchPaySuccess`), 'success');
    },
    onError: (e: any) => {
      setShowBatchConfirm(false);
      if (e.response?.status === 400) {
        toast(t(`${NS}.toastInsufficientBalance`), 'error');
      } else {
        toast(t(`${NS}.batchPayError`), 'error');
      }
    },
  });

  const walletPayMut = useMutation({
    mutationFn: async () => {
      const res = await api.post(FAMILY.PAY_INVOICE(activeId, payInvoice._id), { paymentMethod: 'wallet' });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['familyInvoices'] });
      qc.invalidateQueries({ queryKey: ['familyWallet'] });
      setPayInvoice(null);
      toast(t(`${NS}.toastPaySuccess`), 'success');
    },
    onError: (e: any) => {
      setPayInvoice(null);
      if (e.response?.status === 400) {
        toast(t(`${NS}.toastInsufficientBalance`), 'error');
      } else {
        toast(t(`${NS}.toastPayError`), 'error');
      }
    },
  });

  const handlePayOnline = async (invoiceId: string) => {
    setPayInvoice(null);
    try {
      const res = await api.get(FAMILY.PAYMENT_URL(activeId, invoiceId));
      const url = res.data?.data?.paymentUrl ?? res.data?.checkoutUrl ?? res.data?.paymentUrl ?? res.data?.data?.checkoutUrl;
      if (url) await Linking.openURL(url);
      else toast(t(`${NS}.toastNoPaymentUrl`), 'error');
    } catch {
      toast(t(`${NS}.toastPaymentCreateError`), 'error');
    }
  };

  const refetch = () => { residentsQ.refetch(); invoicesQ.refetch(); };
  const isFetching = residentsQ.isFetching || invoicesQ.isFetching;

  const payableCount = invoices.filter((inv: any) => isPayable(inv.status)).length;

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topRow}>
          <Text style={styles.topTitle}>{t(`${NS}.title`)}</Text>
          <IconButton icon={selectMode ? 'close' : 'checkbox-multiple-marked-outline'} iconColor="#fff" size={22}
            onPress={toggleSelectMode} />
        </View>
      </View>

      {activeResident && !selectMode && (
        <View style={styles.summaryRow}>
          <Button mode="text" icon="chart-box-outline" textColor={COLOR} compact
            onPress={() => navigation?.navigate('BillingSummary', { residentId: activeId, residentName: activeResident.fullName })}>
            {t(`${NS}.billingSummaryLink`)}
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
        onRetry={refetch} isEmpty={invoices.length === 0} emptyMessage={t(`${NS}.empty`)}>
        <FlatList data={invoices} keyExtractor={(item: any) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={COLOR} />}
          renderItem={({ item }) => {
            const payable = isPayable(item.status);
            const selected = selectedIds.has(item._id);
            return (
              <Card style={[styles.card, selectMode && !payable ? styles.cardDisabled : undefined]} mode="outlined"
                onPress={selectMode
                  ? (payable ? () => toggleSelected(item._id) : undefined)
                  : () => navigation?.navigate('InvoiceDetail', { invoice: item, residentId: activeId })}>
                <Card.Content>
                  <View style={styles.invoiceRow}>
                    {selectMode && (
                      <Checkbox status={selected ? 'checked' : 'unchecked'} disabled={!payable}
                        onPress={() => payable && toggleSelected(item._id)} />
                    )}
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
                {!selectMode && payable ? (
                  <Card.Actions>
                    <Button compact textColor={COLOR} onPress={() => setPayInvoice(item)}>{t(`${NS}.pay`)}</Button>
                  </Card.Actions>
                ) : null}
              </Card>
            );
          }}
        />
        {selectMode && payableCount === 0 && (
          <Text style={styles.noPayable}>{t(`${NS}.noPayableInvoices`)}</Text>
        )}
      </ScreenLayout>

      {selectMode && selectedIds.size > 0 && (
        <View style={[styles.batchBar, { paddingBottom: 12 + insets.bottom }]}>
          <Text style={styles.batchBarText}>
            {t(`${NS}.selectedTotal`, { count: selectedIds.size, amount: `${selectedTotal.toLocaleString('vi-VN')} ₫` })}
          </Text>
          <Button mode="contained" buttonColor={COLOR} onPress={() => setShowBatchConfirm(true)}
            loading={batchPayMut.isPending}>
            {t(`${NS}.payWithWallet`)}
          </Button>
        </View>
      )}

      <Portal>
        <Dialog visible={!!payInvoice} onDismiss={() => setPayInvoice(null)} style={{ borderRadius: 16 }}>
          <Dialog.Title>{t(`${NS}.chooseMethodTitle`)}</Dialog.Title>
          <Dialog.Content>
            <Text style={{ fontSize: 14, color: '#374151', marginBottom: 16 }}>
              {t(`${NS}.amountLabel`, { amount: (payInvoice?.totalAmount ?? payInvoice?.amount ?? 0).toLocaleString('vi-VN') })}
            </Text>
            <Button mode="outlined" icon="wallet-outline" style={styles.methodBtn}
              onPress={() => walletPayMut.mutate()} loading={walletPayMut.isPending}>
              {t(`${NS}.payWithWallet`)}
            </Button>
            <Button mode="outlined" icon="credit-card-outline" style={styles.methodBtn}
              onPress={() => handlePayOnline(payInvoice?._id)}>
              {t(`${NS}.payOnline`)}
            </Button>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPayInvoice(null)}>{t('common.cancel')}</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={showBatchConfirm} onDismiss={() => setShowBatchConfirm(false)}>
          <Dialog.Title>{t(`${NS}.batchPayTitle`)}</Dialog.Title>
          <Dialog.Content>
            <Text style={{ fontSize: 14, color: '#374151' }}>
              {t(`${NS}.batchPayConfirm`, { count: selectedIds.size, amount: `${selectedTotal.toLocaleString('vi-VN')} ₫` })}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowBatchConfirm(false)}>{t('common.cancel')}</Button>
            <Button mode="contained" buttonColor={COLOR} onPress={() => batchPayMut.mutate()}
              loading={batchPayMut.isPending}>{t('common.confirm')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 8, paddingTop: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  summaryRow: { paddingHorizontal: 12, paddingTop: 8, alignItems: 'flex-start' },
  chipRow: { flexDirection: 'row', gap: 6, padding: 12, flexWrap: 'wrap' },
  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  cardDisabled: { backgroundColor: '#F3F4F6' },
  invoiceRow: { flexDirection: 'row', alignItems: 'center' },
  invoiceNumber: { fontSize: 14, fontWeight: '600', color: '#111827' },
  invoiceAmount: { fontSize: 16, fontWeight: '700', color: COLOR, marginTop: 4 },
  invoiceDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  methodBtn: { borderRadius: 8, marginBottom: 8, borderColor: COLOR },
  noPayable: { textAlign: 'center', color: '#9CA3AF', padding: 16 },
  batchBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  batchBarText: { flex: 1, fontWeight: '600', color: '#111827', marginRight: 12 },
});
