import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip, Button, Dialog, Portal, TextInput, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { STAFF_VISITS } from '../../api/endpoints';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { useToast } from '../../utils/toast';
import { useAuth } from '../../auth/useAuth';

const COLOR = '#0F5040';
const NS = 'nurse.visitApprovals';

export const VisitApprovalsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { user } = useAuth();
  // Backend chỉ cho phép manager/admin duyệt hoặc từ chối (nurse chỉ được xem danh sách).
  const canReview = user?.role === 'manager' || user?.role === 'admin';
  const [filter, setFilter] = useState('pending');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const STATUS_FILTERS = [
    { value: '', label: t(`${NS}.filterAll`) },
    { value: 'pending', label: t(`${NS}.filterPending`) },
    { value: 'approved', label: t(`${NS}.filterApproved`) },
    { value: 'rejected', label: t(`${NS}.filterRejected`) },
    { value: 'cancelled', label: t(`${NS}.filterCancelled`) },
  ];

  const listQ = useQuery({
    queryKey: ['staffVisits', filter],
    queryFn: async () => (await api.get(STAFF_VISITS.LIST, { params: { status: filter || undefined } })).data,
  });
  const items = listQ.data?.data ?? [];

  const approveMut = useMutation({
    mutationFn: async (id: string) => (await api.patch(STAFF_VISITS.APPROVE(id))).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staffVisits'] }); toast(t(`${NS}.toastApproved`), 'success'); },
    onError: () => toast(t(`${NS}.toastError`), 'error'),
  });

  const rejectMut = useMutation({
    mutationFn: async () => (await api.patch(STAFF_VISITS.REJECT(rejectId!), { rejectionReason: rejectReason })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staffVisits'] }); setRejectId(null); setRejectReason(''); toast(t(`${NS}.toastRejected`), 'success'); },
    onError: () => toast(t(`${NS}.toastError`), 'error'),
  });

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
        {STATUS_FILTERS.map(f => (
          <Chip key={f.value} selected={filter === f.value} onPress={() => setFilter(f.value)}
            style={filter === f.value ? { backgroundColor: COLOR } : undefined}
            textStyle={filter === f.value ? { color: '#fff' } : undefined} compact>{f.label}</Chip>
        ))}
      </View>

      <ScreenLayout loading={listQ.isLoading} error={listQ.error ? (listQ.error as Error).message : null}
        onRetry={listQ.refetch} isEmpty={items.length === 0} emptyMessage={t(`${NS}.empty`)}>
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={listQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined">
              <Card.Content>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.resident?.fullName ?? '--'}</Text>
                    <Text style={styles.sub}>{item.requestedDate ? new Date(item.requestedDate).toLocaleDateString('vi-VN') : ''} · {item.requestedTimeSlot ?? ''}</Text>
                    <Text style={styles.sub}>{t(`${NS}.visitorInfo`, { name: item.visitorName, phone: item.visitorPhone })}</Text>
                    {item.familyAccount?.fullName ? <Text style={styles.sub}>{t(`${NS}.familyAccount`, { name: item.familyAccount.fullName })}</Text> : null}
                  </View>
                  <StatusBadge status={item.status} size="sm" />
                </View>
              </Card.Content>
              {item.status === 'pending' && canReview ? (
                <Card.Actions>
                  <Button compact textColor="#991B1B" onPress={() => setRejectId(item._id)}>{t(`${NS}.reject`)}</Button>
                  <Button compact mode="contained" buttonColor={COLOR} onPress={() => approveMut.mutate(item._id)} loading={approveMut.isPending}>{t(`${NS}.approve`)}</Button>
                </Card.Actions>
              ) : null}
            </Card>
          )} />
      </ScreenLayout>

      <Portal>
        <Dialog visible={!!rejectId} onDismiss={() => setRejectId(null)}>
          <Dialog.Title>{t(`${NS}.rejectTitle`)}</Dialog.Title>
          <Dialog.Content>
            <TextInput label={t(`${NS}.rejectReasonLabel`)} mode="outlined" value={rejectReason} onChangeText={setRejectReason} dense multiline />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRejectId(null)}>{t('common.cancel')}</Button>
            <Button mode="contained" buttonColor="#991B1B" onPress={() => rejectMut.mutate()} loading={rejectMut.isPending} disabled={!rejectReason.trim()}>{t(`${NS}.reject`)}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '600', color: '#111827' },
  sub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});
