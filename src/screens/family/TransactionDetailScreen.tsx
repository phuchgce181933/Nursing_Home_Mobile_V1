import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Divider } from 'react-native-paper';
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
const NS = 'family.transactionDetail';

const vnd = (n?: number) => (typeof n === 'number' ? `${n.toLocaleString('vi-VN')} ₫` : '—');

const Row: React.FC<{ label: string; value?: string | null }> = ({ label, value }) =>
  value ? (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  ) : null;

export const TransactionDetailScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { typeLabel, statusLabel, methodLabel, defaultDescription } = useWalletTxLabels();
  const transactionId: string = route.params?.transactionId;

  const detailQ = useQuery({
    queryKey: ['familyWalletTransaction', transactionId],
    enabled: !!transactionId,
    queryFn: async () => {
      const r = await api.get(FAMILY.WALLET_TRANSACTION_DETAIL(transactionId));
      return (r.data?.data ?? r.data) as WalletTx;
    },
  });

  const tx = detailQ.data;
  const sign = tx ? amountSign(tx) : '';
  const amountColor = sign === '+' ? '#065F46' : sign === '-' ? '#991B1B' : '#374151';

  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.title`)} color={COLOR} onBack={() => navigation.goBack()} />
      <ScreenLayout loading={detailQ.isLoading} error={detailQ.error ? (detailQ.error as Error).message : null}
        onRetry={detailQ.refetch}>
        {tx ? (
          <ScrollView contentContainerStyle={styles.container}>
            <Card style={styles.hero} mode="contained">
              <Card.Content style={{ alignItems: 'center' }}>
                <MaterialCommunityIcons name="receipt-text-outline" size={40} color={COLOR} />
                <Text style={[styles.amount, { color: amountColor }]}>
                  {sign}{vnd(tx.amount)}
                </Text>
                <Text style={styles.heroType}>{typeLabel(tx)}</Text>
                <Text style={styles.heroStatus}>{statusLabel(tx.status)}</Text>
              </Card.Content>
            </Card>

            <Card style={styles.card} mode="outlined">
              <Card.Content>
                <Row label={t(`${NS}.description`)} value={defaultDescription(tx)} />
                <Divider style={styles.divider} />
                <Row label={t(`${NS}.method`)} value={methodLabel(tx)} />
                <Row label={t(`${NS}.createdAt`)}
                  value={tx.createdAt ? new Date(tx.createdAt).toLocaleString('vi-VN') : undefined} />
                {tx.completedAt && tx.status === 'completed' ? (
                  <Row label={t(`${NS}.completedAt`)} value={new Date(tx.completedAt).toLocaleString('vi-VN')} />
                ) : null}
                <Row label={t(`${NS}.invoiceNumber`)} value={tx.invoiceNumber} />
                {tx.status === 'failed' && tx.failureReason ? (
                  <Row label={t(`${NS}.failureReason`)} value={tx.failureReason} />
                ) : null}
              </Card.Content>
            </Card>

            {/* Ảnh chụp số dư CHỈ hiển thị khi giao dịch thực sự đụng ví VÀ có dữ liệu.
                Giao dịch cũ thiếu snapshot thì ẩn hẳn, tuyệt đối không bịa số. */}
            {affectsWallet(tx) && tx.hasBalanceSnapshot ? (
              <Card style={styles.card} mode="outlined">
                <Card.Content>
                  <Text style={styles.sectionTitle}>{t(`${NS}.balanceSection`)}</Text>
                  <Row label={t(`${NS}.balanceBefore`)} value={vnd(tx.balanceBefore)} />
                  <Row label={t(`${NS}.balanceAfter`)} value={vnd(tx.balanceAfter)} />
                </Card.Content>
              </Card>
            ) : null}

            {!affectsWallet(tx) ? (
              <Card style={[styles.card, styles.note]} mode="contained">
                <Card.Content>
                  <Text style={styles.noteText}>{t(`${NS}.payosNote`)}</Text>
                </Card.Content>
              </Card>
            ) : null}

            {tx.backfilled ? (
              <Text style={styles.backfillNote}>{t(`${NS}.backfillNote`)}</Text>
            ) : null}
          </ScrollView>
        ) : null}
      </ScreenLayout>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  container: { padding: 16, paddingBottom: 32 },
  hero: { borderRadius: 16, marginBottom: 12, backgroundColor: '#fff' },
  amount: { fontSize: 28, fontWeight: '700', marginTop: 8 },
  heroType: { fontSize: 15, fontWeight: '500', color: '#111827', marginTop: 4 },
  heroStatus: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  card: { borderRadius: 12, marginBottom: 12, backgroundColor: '#fff' },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: 12 },
  rowLabel: { fontSize: 13, color: '#6B7280', flexShrink: 0 },
  rowValue: { fontSize: 13, color: '#111827', fontWeight: '500', flex: 1, textAlign: 'right' },
  divider: { marginVertical: 4 },
  note: { backgroundColor: '#EFF6FF' },
  noteText: { fontSize: 12, color: '#1D4ED8', lineHeight: 18 },
  backfillNote: { fontSize: 11, color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', marginTop: 4 },
});
