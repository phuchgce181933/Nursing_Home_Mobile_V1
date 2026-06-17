import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Button, Chip, Dialog, Portal, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { LEAVE_REQUESTS } from '../../api/endpoints';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { AvatarCircle } from '../../components/shared/AvatarCircle';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { useToast } from '../../utils/toast';

const COLOR = '#1B3A6B';
const TYPE_VN: Record<string, string> = { annual: 'Phép năm', sick: 'Ốm', emergency: 'Khẩn cấp', unpaid: 'Không lương', other: 'Khác' };
const STATUS_FILTERS = [{ value: '', label: 'Tất cả' }, { value: 'pending', label: 'Chờ duyệt' }, { value: 'approved', label: 'Đã duyệt' }, { value: 'rejected', label: 'Từ chối' }];

export const LeaveRequestScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [reviewNote, setReviewNote] = useState('');

  const listQ = useQuery({ queryKey: ['leaveRequests', filter], queryFn: async () => (await api.get(LEAVE_REQUESTS.LIST, { params: { status: filter || undefined } })).data });
  const items = listQ.data?.data ?? listQ.data ?? [];

  const approveMut = useMutation({
    mutationFn: async () => (await api.put(LEAVE_REQUESTS.APPROVE(actionId!), { reviewNote })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaveRequests'] }); setActionId(null); setReviewNote(''); toast('Đã phê duyệt đơn nghỉ phép', 'success'); },
    onError: () => toast('Không thể phê duyệt', 'error'),
  });

  const rejectMut = useMutation({
    mutationFn: async () => (await api.put(LEAVE_REQUESTS.REJECT(actionId!), { reviewNote })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaveRequests'] }); setActionId(null); setReviewNote(''); toast('Đã từ chối đơn nghỉ phép', 'success'); },
    onError: () => toast('Không thể từ chối', 'error'),
  });

  const openAction = (id: string, type: 'approve' | 'reject') => { setActionId(id); setActionType(type); setReviewNote(''); };

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}><Text style={styles.topTitle}>Đơn nghỉ phép</Text></View>
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(f => (
          <Chip key={f.value} selected={filter === f.value} onPress={() => setFilter(f.value)} style={filter === f.value ? { backgroundColor: COLOR } : undefined} textStyle={filter === f.value ? { color: '#fff' } : undefined} compact>{f.label}</Chip>
        ))}
      </View>
      <ScreenLayout loading={listQ.isLoading} error={listQ.error ? (listQ.error as Error).message : null} onRetry={listQ.refetch} isEmpty={items.length === 0} emptyMessage="Không có đơn nghỉ phép">
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={false} onRefresh={listQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => {
            const staffName = item.staffId?.fullName ?? item.staffProfile?.userId?.fullName ?? '--';
            return (
              <Card style={styles.card} mode="outlined">
                <Card.Content>
                  <View style={styles.row}>
                    <AvatarCircle name={staffName} size={36} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.name}>{staffName}</Text>
                      <Text style={styles.sub}>{TYPE_VN[item.type] ?? item.type} · {item.startDate ? new Date(item.startDate).toLocaleDateString('vi-VN') : ''} – {item.endDate ? new Date(item.endDate).toLocaleDateString('vi-VN') : ''}</Text>
                      {item.reason ? <Text style={styles.reason} numberOfLines={2}>{item.reason}</Text> : null}
                    </View>
                    <StatusBadge status={item.status} size="sm" />
                  </View>
                </Card.Content>
                {item.status === 'pending' ? (
                  <Card.Actions>
                    <Button compact textColor="#065F46" onPress={() => openAction(item._id, 'approve')}>Phê duyệt</Button>
                    <Button compact textColor="#991B1B" onPress={() => openAction(item._id, 'reject')}>Từ chối</Button>
                  </Card.Actions>
                ) : null}
              </Card>
            );
          }} />
      </ScreenLayout>

      <Portal>
        <Dialog visible={!!actionId} onDismiss={() => setActionId(null)}>
          <Dialog.Title>{actionType === 'approve' ? 'Phê duyệt đơn nghỉ phép?' : 'Từ chối đơn nghỉ phép?'}</Dialog.Title>
          <Dialog.Content>
            <TextInput label={actionType === 'reject' ? 'Lý do từ chối *' : 'Ghi chú'} mode="outlined" value={reviewNote} onChangeText={setReviewNote} dense multiline />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setActionId(null)}>Hủy</Button>
            <Button mode="contained" buttonColor={actionType === 'approve' ? '#065F46' : '#991B1B'} onPress={() => actionType === 'approve' ? approveMut.mutate() : rejectMut.mutate()} loading={approveMut.isPending || rejectMut.isPending} disabled={actionType === 'reject' && !reviewNote.trim()}>
              {actionType === 'approve' ? 'Phê duyệt' : 'Từ chối'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' }, topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 }, topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' }, filterRow: { flexDirection: 'row', gap: 6, padding: 12, flexWrap: 'wrap' }, list: { padding: 16, paddingBottom: 32 }, card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' }, row: { flexDirection: 'row', alignItems: 'center' }, name: { fontSize: 14, fontWeight: '600', color: '#111827' }, sub: { fontSize: 12, color: '#6B7280', marginTop: 2 }, reason: { fontSize: 12, color: '#374151', marginTop: 4 },
});
