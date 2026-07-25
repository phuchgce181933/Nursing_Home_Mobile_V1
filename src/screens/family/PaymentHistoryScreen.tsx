import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { ScreenLayout } from '../../components/layout/ScreenLayout';

const COLOR = '#2E7D32';
const NS = 'family.paymentHistory';

const TYPE_ICON: Record<string, { name: string; color: string }> = {
  topup: { name: 'arrow-down-circle', color: '#065F46' },
  payment: { name: 'arrow-up-circle', color: '#991B1B' },
  refund: { name: 'arrow-left-circle', color: '#065F46' },
};

export const PaymentHistoryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [filter, setFilter] = useState('');

  const TYPE_FILTERS = [
    { value: '', label: t(`${NS}.filterAll`) },
    { value: 'topup', label: t(`${NS}.filterTopup`) },
    { value: 'payment', label: t(`${NS}.filterPayment`) },
    { value: 'refund', label: t(`${NS}.filterRefund`) },
  ];

  const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
    completed: { bg: '#D1FAE5', text: '#065F46', label: t(`${NS}.statusCompleted`) },
    pending: { bg: '#FFEDD5', text: '#92400E', label: t(`${NS}.statusPending`) },
    failed: { bg: '#FEE2E2', text: '#991B1B', label: t(`${NS}.statusFailed`) },
  };

  const walletQ = useQuery({
    queryKey: ['familyWallet'],
    queryFn: async () => {
      const r = await api.get(FAMILY.WALLET_BALANCE);
      return r.data?.data ?? r.data;
    },
  });

  const allTransactions = walletQ.data?.transactions ?? [];
  const transactions = filter
    ? allTransactions.filter((tx: any) => tx.type === filter)
    : allTransactions;
  const sorted = [...transactions].reverse();

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <View style={styles.topRow}>
          <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation.goBack()} />
          <Text style={styles.topTitle}>{t(`${NS}.title`)}</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <View style={styles.filterRow}>
        {TYPE_FILTERS.map(f => (
          <Chip key={f.value} selected={filter === f.value} onPress={() => setFilter(f.value)}
            style={filter === f.value ? { backgroundColor: COLOR } : undefined}
            textStyle={filter === f.value ? { color: '#fff' } : undefined} compact>{f.label}</Chip>
        ))}
      </View>

      <ScreenLayout loading={walletQ.isLoading} error={walletQ.error ? (walletQ.error as Error).message : null}
        onRetry={walletQ.refetch} isEmpty={sorted.length === 0} emptyMessage={t(`${NS}.empty`)}>
        <FlatList data={sorted} keyExtractor={(item: any, i: number) => item._id ?? String(i)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={walletQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => {
            const icon = TYPE_ICON[item.type] ?? TYPE_ICON.payment;
            const status = STATUS_COLORS[item.status] ?? STATUS_COLORS.pending;
            const isPositive = item.type === 'topup' || item.type === 'refund';

            return (
              <Card style={styles.card} mode="outlined">
                <Card.Content style={styles.txRow}>
                  <MaterialCommunityIcons name={icon.name as any} size={28} color={icon.color} />
                  <View style={styles.txInfo}>
                    <Text style={styles.txDesc}>{item.description ?? (item.type === 'topup' ? t(`${NS}.defaultTopup`) : item.type === 'refund' ? t(`${NS}.defaultRefund`) : t(`${NS}.defaultPayment`))}</Text>
                    <Text style={styles.txDate}>{item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : ''}</Text>
                    {item.orderCode ? <Text style={styles.txOrder}>{t(`${NS}.orderCode`, { code: item.orderCode })}</Text> : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.txAmount, { color: isPositive ? '#065F46' : '#991B1B' }]}>
                      {isPositive ? '+' : '-'}{item.amount?.toLocaleString('vi-VN')} ₫
                    </Text>
                    <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
                      <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            );
          }}
        />
      </ScreenLayout>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 4, paddingBottom: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  filterRow: { flexDirection: 'row', gap: 6, padding: 12, flexWrap: 'wrap' },
  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 6, backgroundColor: '#fff' },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 13, fontWeight: '500', color: '#111827' },
  txDate: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  txOrder: { fontSize: 10, color: '#D1D5DB', marginTop: 1 },
  txAmount: { fontSize: 14, fontWeight: '600' },
  statusChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 4 },
  statusText: { fontSize: 9, fontWeight: '500' },
});
