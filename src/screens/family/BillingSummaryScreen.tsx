import React from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Button, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { SectionHeader } from '../../components/layout/SectionHeader';

const COLOR = '#2E7D32';

export const BillingSummaryScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const residentId = route.params?.residentId;
  const residentName = route.params?.residentName ?? '';

  const billingQ = useQuery({
    queryKey: ['billingSummary', residentId],
    queryFn: async () => {
      const r = await api.get(FAMILY.BILLING_SUMMARY(residentId));
      return r.data?.data ?? r.data;
    },
    enabled: !!residentId,
  });

  const walletQ = useQuery({
    queryKey: ['familyWallet'],
    queryFn: async () => {
      const r = await api.get(FAMILY.WALLET_BALANCE);
      return r.data?.data ?? r.data;
    },
  });

  const data = billingQ.data;
  const wallet = walletQ.data;
  const latestInvoice = data?.latestInvoice;
  const refetch = () => { billingQ.refetch(); walletQ.refetch(); };

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.topRow}>
          <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation.goBack()} />
          <Text style={styles.topTitle}>Tổng quan tài chính</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={COLOR} />}>
        <ScreenLayout loading={billingQ.isLoading} error={billingQ.error ? (billingQ.error as Error).message : null} onRetry={refetch}>
          <Card style={styles.card} mode="elevated">
            <Card.Content style={styles.residentHeader}>
              <MaterialCommunityIcons name="account-outline" size={28} color={COLOR} />
              <View style={{ flex: 1 }}>
                <Text style={styles.residentName}>{residentName}</Text>
                {data?.resident?.servicePackagePrice != null && (
                  <Text style={styles.packageInfo}>
                    Gói dịch vụ: {data.resident.servicePackagePrice.toLocaleString('vi-VN')} ₫/tháng
                  </Text>
                )}
              </View>
            </Card.Content>
          </Card>

          <View style={styles.statsGrid}>
            <Card style={styles.statCard}>
              <Card.Content style={styles.statContent}>
                <MaterialCommunityIcons name="receipt" size={24} color="#1565C0" />
                <Text style={styles.statValue}>{data?.invoiceCount ?? 0}</Text>
                <Text style={styles.statLabel}>Hóa đơn</Text>
              </Card.Content>
            </Card>
            <Card style={styles.statCard}>
              <Card.Content style={styles.statContent}>
                <MaterialCommunityIcons name="wallet-outline" size={24} color={COLOR} />
                <Text style={styles.statValue}>{wallet?.balance != null ? `${(wallet.balance / 1000).toFixed(0)}k` : '--'}</Text>
                <Text style={styles.statLabel}>Số dư ví</Text>
              </Card.Content>
            </Card>
          </View>

          {latestInvoice && (
            <>
              <SectionHeader title="Hóa đơn gần nhất" roleColor={COLOR} />
              <Card style={styles.card} mode="outlined"
                onPress={() => navigation.navigate('InvoiceDetail', { invoice: latestInvoice, residentId })}>
                <Card.Content>
                  <View style={styles.invoiceRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.invoiceNumber}>{latestInvoice.invoiceNumber ?? `#${latestInvoice._id?.slice(-6)}`}</Text>
                      <Text style={styles.invoiceAmount}>
                        {(latestInvoice.totalAmount ?? latestInvoice.total ?? 0).toLocaleString('vi-VN')} ₫
                      </Text>
                      <Text style={styles.invoiceDate}>
                        {latestInvoice.createdAt ? new Date(latestInvoice.createdAt).toLocaleDateString('vi-VN') : ''}
                      </Text>
                    </View>
                    <StatusBadge status={latestInvoice.status} size="sm" />
                  </View>
                </Card.Content>
              </Card>
            </>
          )}

          <SectionHeader title="Thao tác nhanh" roleColor={COLOR} />
          <View style={styles.actionGrid}>
            <Button mode="outlined" icon="receipt" style={styles.actionBtn} textColor={COLOR}
              onPress={() => navigation.navigate('Invoices')}>
              Xem tất cả hóa đơn
            </Button>
            <Button mode="outlined" icon="history" style={styles.actionBtn} textColor={COLOR}
              onPress={() => navigation.navigate('PaymentHistory')}>
              Lịch sử thanh toán
            </Button>
            <Button mode="outlined" icon="wallet-plus-outline" style={styles.actionBtn} textColor={COLOR}
              onPress={() => navigation.navigate('Wallet')}>
              Nạp tiền ví
            </Button>
          </View>
        </ScreenLayout>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 4, paddingBottom: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  body: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 12, backgroundColor: '#fff' },
  residentHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  residentName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  packageInfo: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: { flex: 1, borderRadius: 12 },
  statContent: { alignItems: 'center', paddingVertical: 12 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 4 },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  invoiceRow: { flexDirection: 'row', alignItems: 'center' },
  invoiceNumber: { fontSize: 14, fontWeight: '600', color: '#111827' },
  invoiceAmount: { fontSize: 16, fontWeight: '700', color: COLOR, marginTop: 4 },
  invoiceDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  actionGrid: { gap: 8 },
  actionBtn: { borderRadius: 8, borderColor: COLOR },
});
