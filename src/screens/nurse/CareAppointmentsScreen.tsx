import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Button, Chip, FAB, Dialog, Portal, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { CARE_APPOINTMENTS, RESIDENTS } from '../../api/endpoints';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { useToast } from '../../utils/toast';

const COLOR = '#1B3A6B';
const STATUS_FILTERS = [{ value: '', label: 'Tất cả' }, { value: 'scheduled', label: 'Đã lên lịch' }, { value: 'in_progress', label: 'Đang diễn ra' }, { value: 'completed', label: 'Hoàn thành' }, { value: 'cancelled', label: 'Đã hủy' }];
const NEXT_STATUS: Record<string, { status: string; label: string; color: string }[]> = {
  scheduled: [{ status: 'in_progress', label: 'Bắt đầu', color: '#065F46' }, { status: 'cancelled', label: 'Hủy', color: '#991B1B' }],
  in_progress: [{ status: 'completed', label: 'Hoàn thành', color: '#065F46' }, { status: 'cancelled', label: 'Hủy', color: '#991B1B' }],
};

export const CareAppointmentsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ residentId: '', scheduledStartAt: '', scheduledEndAt: '', appointmentType: '', notes: '' });

  const listQ = useQuery({ queryKey: ['appointments', filter], queryFn: async () => (await api.get(CARE_APPOINTMENTS.LIST, { params: { status: filter || undefined } })).data });
  const residentsQ = useQuery({ queryKey: ['residentsForAppt'], queryFn: async () => (await api.get(RESIDENTS.LIST, { params: { status: 'admitted' } })).data });
  const items = listQ.data?.data ?? listQ.data ?? [];
  const residents = Array.isArray(residentsQ.data) ? residentsQ.data : (residentsQ.data?.data ?? []);

  const createMut = useMutation({
    mutationFn: async () => (await api.post(CARE_APPOINTMENTS.CREATE, form)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments'] }); setShowCreate(false); setForm({ residentId: '', scheduledStartAt: '', scheduledEndAt: '', appointmentType: '', notes: '' }); toast('Đã tạo cuộc hẹn', 'success'); },
    onError: (e: any) => toast(e.response?.data?.message ?? 'Không thể tạo', 'error'),
  });

  const statusMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => (await api.put(CARE_APPOINTMENTS.UPDATE_STATUS(id), { status })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments'] }); toast('Đã cập nhật trạng thái', 'success'); },
    onError: () => toast('Không thể cập nhật', 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => (await api.delete(CARE_APPOINTMENTS.DELETE(id))).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments'] }); toast('Đã xóa cuộc hẹn', 'success'); },
    onError: () => toast('Không thể xóa', 'error'),
  });

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}><Text style={styles.topTitle}>Cuộc hẹn chăm sóc</Text></View>
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(f => <Chip key={f.value} selected={filter === f.value} onPress={() => setFilter(f.value)} style={filter === f.value ? { backgroundColor: COLOR } : { backgroundColor: '#E5E7EB' }} textStyle={filter === f.value ? { color: '#fff', fontWeight: '600' } : { color: '#111827' }} compact>{f.label}</Chip>)}
      </View>
      <ScreenLayout loading={listQ.isLoading} error={listQ.error ? (listQ.error as Error).message : null} onRetry={listQ.refetch} isEmpty={items.length === 0} emptyMessage="Không có cuộc hẹn nào">
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={false} onRefresh={listQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => {
            const resName = item.residentId?.fullName ?? '--';
            const actions = NEXT_STATUS[item.status] ?? [];
            return (
              <Card style={styles.card} mode="outlined">
                <Card.Content>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{resName}</Text>
                      <Text style={styles.sub}>{item.appointmentType ?? 'Cuộc hẹn'} · {item.scheduledStartAt ? new Date(item.scheduledStartAt).toLocaleString('vi-VN') : ''}</Text>
                      {item.notes ? <Text style={styles.reason} numberOfLines={1}>{item.notes}</Text> : null}
                    </View>
                    <StatusBadge status={item.status} size="sm" />
                  </View>
                </Card.Content>
                {actions.length > 0 ? (
                  <Card.Actions>
                    {actions.map(a => <Button key={a.status} compact textColor={a.color} onPress={() => statusMut.mutate({ id: item._id, status: a.status })}>{a.label}</Button>)}
                    <Button compact textColor="#6B7280" onPress={() => deleteMut.mutate(item._id)}>Xóa</Button>
                  </Card.Actions>
                ) : null}
              </Card>
            );
          }} />
      </ScreenLayout>
      <FAB icon="plus" style={[styles.fab, { backgroundColor: COLOR }]} color="#fff" onPress={() => setShowCreate(true)} />

      <Portal>
        <Dialog visible={showCreate} onDismiss={() => setShowCreate(false)} style={{ borderRadius: 16 }}>
          <Dialog.Title>Tạo cuộc hẹn mới</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 400 }}>
            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>Chọn cư dân:</Text>
            <View style={styles.residentPicker}>
              {residents.slice(0, 20).map((r: any) => (
                <Chip key={r._id} selected={form.residentId === r._id} onPress={() => setForm(f => ({ ...f, residentId: r._id }))} compact style={form.residentId === r._id ? { backgroundColor: COLOR } : undefined} textStyle={form.residentId === r._id ? { color: '#fff' } : undefined}>{r.fullName}</Chip>
              ))}
            </View>
            <TextInput label="Giờ bắt đầu * (ISO)" mode="outlined" value={form.scheduledStartAt} onChangeText={v => setForm(f => ({ ...f, scheduledStartAt: v }))} dense style={styles.input} placeholder="2026-06-18T08:00:00.000Z" />
            <TextInput label="Giờ kết thúc * (ISO)" mode="outlined" value={form.scheduledEndAt} onChangeText={v => setForm(f => ({ ...f, scheduledEndAt: v }))} dense style={styles.input} placeholder="2026-06-18T09:00:00.000Z" />
            <TextInput label="Loại cuộc hẹn" mode="outlined" value={form.appointmentType} onChangeText={v => setForm(f => ({ ...f, appointmentType: v }))} dense style={styles.input} placeholder="Khám tổng quát" />
            <TextInput label="Ghi chú" mode="outlined" value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} dense multiline style={styles.input} />
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowCreate(false)}>Hủy</Button>
            <Button mode="contained" buttonColor={COLOR} onPress={() => createMut.mutate()} loading={createMut.isPending} disabled={!form.residentId || !form.scheduledStartAt || !form.scheduledEndAt}>Tạo</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' }, topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 }, topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' }, filterRow: { flexDirection: 'row', gap: 6, padding: 12, flexWrap: 'wrap' }, list: { padding: 16, paddingBottom: 80 }, card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' }, row: { flexDirection: 'row', alignItems: 'center' }, name: { fontSize: 14, fontWeight: '600', color: '#111827' }, sub: { fontSize: 12, color: '#6B7280', marginTop: 2 }, reason: { fontSize: 12, color: '#374151', marginTop: 4 }, fab: { position: 'absolute', bottom: 16, right: 16 }, input: { marginBottom: 8 }, residentPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
});
