import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { BackHeader } from '../../components/layout/BackHeader';
import {
  WalletTx,
  affectsWallet,
  amountSign,
  useWalletTxLabels,
} from '../../utils/walletTxLabels';

const COLOR = '#2E7D32';
const NS = 'family.paymentHistory';

// Icon theo CHIỀU tiền (credit/debit/none), không theo loại enum thô.
const iconFor = (tx: WalletTx): { name: string; color: string } => {
  if (tx.type === 'refund') return { name: 'cash-refund', color: '#065F46' };
  if (tx.type === 'topup') return { name: 'arrow-down-circle', color: '#065F46' };
  if (!affectsWallet(tx)) return { name: 'bank-outline', color: '#1D4ED8' }; // PayOS trực tiếp
  return { name: 'arrow-up-circle', color: '#991B1B' }; // trả bằng ví
};

export const PaymentHistoryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const { typeLabel, statusLabel, methodLabel, defaultDescription } = useWalletTxLabels();
  const [filter, setFilter] = useState('');

  // CHỈ có các loại giao dịch hệ thống thật sự hỗ trợ (enum type: topup/payment/refund).
  const TYPE_FILTERS = [
    { value: '', label: t(`${NS}.filterAll`) },
    { value: 'topup', label: t(`${NS}.filterTopup`) },
    { value: 'payment', label: t(`${NS}.filterPayment`) },
    { value: 'refund', label: t(`${NS}.filterRefund`) },
  ];

  const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    completed: { bg: '#D1FAE5', text: '#065F46' },
    pending: { bg: '#FFEDD5', text: '#92400E' },
    failed: { bg: '#FEE2E2', text: '#991B1B' },
  };

  const historyQ = useQuery({
    queryKey: ['familyWalletTransactions', filter],
    queryFn: async () => {
      const r = await api.get(FAMILY.WALLET_TRANSACTIONS, {
        params: { limit: 100, ...(filter ? { type: filter } : {}) },
      });
      const body = r.data ?? {};
      return {
        data: (body.data ?? []) as WalletTx[],
        summary: body.summary ?? null,
      };
    },
  });

  const transactions = historyQ.data?.data ?? [];

  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.title`)} color={COLOR} onBack={() => navigation.goBack()} />

      <View style={styles.filterRow}>
        {TYPE_FILTERS.map(f => (
          <Chip key={f.value} selected={filter === f.value} onPress={() => setFilter(f.value)}
            style={filter === f.value ? { backgroundColor: COLOR } : undefined}
            textStyle={filter === f.value ? { color: '#fff' } : undefined} compact>{f.label}</Chip>
        ))}
      </View>

      <ScreenLayout loading={historyQ.isLoading} error={historyQ.error ? (historyQ.error as Error).message : null}
        onRetry={historyQ.refetch} isEmpty={transactions.length === 0} emptyMessage={t(`${NS}.empty`)}>
        <FlatList data={transactions} keyExtractor={(item, i) => item._id ?? String(i)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={historyQ.isFetching} onRefresh={historyQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => {
            const icon = iconFor(item);
            const status = STATUS_COLORS[item.status] ?? STATUS_COLORS.pending;
            const sign = amountSign(item);
            const amountColor = sign === '+' ? '#065F46' : sign === '-' ? '#991B1B' : '#374151';

            return (
              <TouchableOpacity activeOpacity={0.7}
                onPress={() => navigation.navigate('TransactionDetail', { transactionId: item._id })}>
                <Card style={styles.card} mode="outlined">
                  <Card.Content style={styles.txRow}>
                    <MaterialCommunityIcons name={icon.name as any} size={28} color={icon.color} />
                    <View style={styles.txInfo}>
                      <Text style={styles.txDesc} numberOfLines={1}>{defaultDescription(item)}</Text>
                      <Text style={styles.txMeta}>{typeLabel(item)} · {methodLabel(item)}</Text>
                      <Text style={styles.txDate}>{item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : ''}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.txAmount, { color: amountColor }]}>
                        {sign}{item.amount?.toLocaleString('vi-VN')} ₫
                      </Text>
                      <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
                        <Text style={[styles.statusText, { color: status.text }]}>{statusLabel(item.status)}</Text>
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            );
          }}
        />
      </ScreenLayout>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  filterRow: { flexDirection: 'row', gap: 6, padding: 12, flexWrap: 'wrap' },
  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 6, backgroundColor: '#fff' },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 13, fontWeight: '500', color: '#111827' },
  txMeta: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  txDate: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '600' },
  statusChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 4 },
  statusText: { fontSize: 9, fontWeight: '500' },
});
