import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Linking } from 'react-native';
import { Text, Card, Button, Chip } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { useToast } from '../../utils/toast';

const COLOR = '#2E7D32';

const STATUS_LABELS: Record<string, string> = {
  issued: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
  partially_paid: 'Thanh toán một phần',
  overdue: 'Quá hạn',
  draft: 'Nháp',
  cancelled: 'Đã hủy',
};

export const FamilyInvoicesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const residentsQ = useQuery({
    queryKey: ['familyResidents'],
    queryFn: async () => { const r = await api.get(FAMILY.RESIDENTS); return r.data; },
  });
  const residents = residentsQ.data?.data ?? residentsQ.data ?? [];
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null);
  const activeId = selectedResidentId ?? residents[0]?._id;

  const invoicesQ = useQuery({
    queryKey: ['familyInvoices', activeId],
    queryFn: async () => { const r = await api.get(FAMILY.INVOICES(activeId)); return r.data; },
    enabled: !!activeId,
  });
  const invoices = invoicesQ.data?.data ?? invoicesQ.data ?? [];

  const handlePay = async (invoiceId: string) => {
    try {
      const res = await api.get(FAMILY.PAYMENT_URL(activeId, invoiceId));
      const url = res.data?.checkoutUrl ?? res.data?.paymentUrl;
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

      {residents.length > 1 ? (
        <View style={styles.chipRow}>
          {residents.map((r: any) => (
            <Chip
              key={r._id}
              selected={activeId === r._id}
              onPress={() => setSelectedResidentId(r._id)}
              style={activeId === r._id ? { backgroundColor: COLOR } : undefined}
              textStyle={activeId === r._id ? { color: '#fff' } : undefined}
              compact
            >
              {r.fullName}
            </Chip>
          ))}
        </View>
      ) : null}

      <ScreenLayout
        loading={invoicesQ.isLoading || residentsQ.isLoading}
        error={invoicesQ.error ? (invoicesQ.error as Error).message : null}
        onRetry={refetch}
        isEmpty={invoices.length === 0}
        emptyMessage="Không có hóa đơn nào"
      >
        <FlatList
          data={invoices}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined">
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
              {(item.status === 'issued' || item.status === 'overdue' || item.status === 'partially_paid') ? (
                <Card.Actions>
                  <Button compact textColor={COLOR} onPress={() => handlePay(item._id)}>Thanh toán</Button>
                </Card.Actions>
              ) : null}
            </Card>
          )}
        />
      </ScreenLayout>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  chipRow: { flexDirection: 'row', gap: 6, padding: 12, flexWrap: 'wrap' },
  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  invoiceRow: { flexDirection: 'row', alignItems: 'center' },
  invoiceNumber: { fontSize: 14, fontWeight: '600', color: '#111827' },
  invoiceAmount: { fontSize: 16, fontWeight: '700', color: COLOR, marginTop: 4 },
  invoiceDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
});
