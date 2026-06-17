import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Button, Chip, FAB, Dialog, Portal, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { CAREGIVER } from '../../api/endpoints';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { useToast } from '../../utils/toast';

const COLOR = '#6B4200';
const today = () => new Date().toISOString().split('T')[0];
const TYPE_VN: Record<string, string> = { bathing: 'Tắm', oral_care: 'Vệ sinh răng', grooming: 'Chải chuốt', toileting: 'Đi vệ sinh', diaper_change: 'Thay tã', room_tidy: 'Dọn phòng', bathroom_clean: 'VS phòng tắm', linen_change: 'Thay ga', laundry: 'Giặt đồ' };
const CAT_VN: Record<string, string> = { personal: 'Cá nhân', environment: 'Môi trường' };
const STATUS_VN: Record<string, string> = { completed: 'Hoàn thành', partial: 'Một phần', refused: 'Từ chối', assisted: 'Có hỗ trợ' };
const PERSONAL_TYPES = ['bathing', 'oral_care', 'grooming', 'toileting', 'diaper_change'];
const ENV_TYPES = ['room_tidy', 'bathroom_clean', 'linen_change', 'laundry'];

export const HygieneScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ residentId: '', activityCategory: 'personal', activityType: 'bathing', completionStatus: 'completed', notes: '' });

  const listQ = useQuery({ queryKey: ['hygiene', today()], queryFn: async () => (await api.get(CAREGIVER.HYGIENE, { params: { workDate: today() } })).data });
  const residentsQ = useQuery({ queryKey: ['hygieneResidents'], queryFn: async () => (await api.get(CAREGIVER.HYGIENE_RESIDENTS)).data });
  const items = listQ.data?.data ?? listQ.data ?? [];
  const residents = residentsQ.data?.data ?? residentsQ.data ?? [];
  const types = form.activityCategory === 'personal' ? PERSONAL_TYPES : ENV_TYPES;

  const createMut = useMutation({
    mutationFn: async () => (await api.post(CAREGIVER.HYGIENE, { ...form, workDate: today() })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hygiene'] }); setShowCreate(false); toast('Đã ghi nhận', 'success'); },
    onError: (e: any) => toast(e.response?.data?.message ?? 'Không thể ghi nhận', 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: async () => (await api.delete(CAREGIVER.HYGIENE_DETAIL(deleteId!))).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hygiene'] }); setDeleteId(null); toast('Đã xóa', 'success'); },
    onError: () => toast('Không thể xóa', 'error'),
  });

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}><Text style={styles.topTitle}>Vệ sinh & Chăm sóc</Text><Text style={styles.topSub}>{today()}</Text></View>
      <ScreenLayout loading={listQ.isLoading} error={listQ.error ? (listQ.error as Error).message : null} onRetry={listQ.refetch} isEmpty={items.length === 0} emptyMessage="Chưa có hoạt động vệ sinh nào">
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={false} onRefresh={listQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined" onLongPress={() => setDeleteId(item._id)}>
              <Card.Content style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.residentId?.fullName ?? '--'}</Text>
                  <Text style={styles.sub}>{CAT_VN[item.activityCategory] ?? item.activityCategory} · {TYPE_VN[item.activityType] ?? item.activityType}</Text>
                  {item.notes ? <Text style={styles.notes} numberOfLines={1}>{item.notes}</Text> : null}
                </View>
                <StatusBadge status={item.completionStatus} size="sm" />
              </Card.Content>
            </Card>
          )} />
      </ScreenLayout>
      <FAB icon="plus" style={[styles.fab, { backgroundColor: COLOR }]} color="#fff" onPress={() => setShowCreate(true)} />

      <Portal>
        <Dialog visible={showCreate} onDismiss={() => setShowCreate(false)} style={{ borderRadius: 16 }}>
          <Dialog.Title>Ghi nhận vệ sinh</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 420 }}>
            <Text style={styles.label}>Cư dân:</Text>
            <View style={styles.chipRow}>{residents.slice(0, 15).map((r: any) => <Chip key={r._id} selected={form.residentId === r._id} onPress={() => setForm(f => ({ ...f, residentId: r._id }))} compact style={form.residentId === r._id ? { backgroundColor: COLOR } : undefined} textStyle={form.residentId === r._id ? { color: '#fff' } : undefined}>{r.fullName}</Chip>)}</View>
            <Text style={styles.label}>Phân loại:</Text>
            <View style={styles.chipRow}>{Object.entries(CAT_VN).map(([k, v]) => <Chip key={k} selected={form.activityCategory === k} onPress={() => setForm(f => ({ ...f, activityCategory: k, activityType: k === 'personal' ? 'bathing' : 'room_tidy' }))} compact style={form.activityCategory === k ? { backgroundColor: COLOR } : undefined} textStyle={form.activityCategory === k ? { color: '#fff' } : undefined}>{v}</Chip>)}</View>
            <Text style={styles.label}>Hoạt động:</Text>
            <View style={styles.chipRow}>{types.map(t => <Chip key={t} selected={form.activityType === t} onPress={() => setForm(f => ({ ...f, activityType: t }))} compact style={form.activityType === t ? { backgroundColor: COLOR } : undefined} textStyle={form.activityType === t ? { color: '#fff' } : undefined}>{TYPE_VN[t]}</Chip>)}</View>
            <Text style={styles.label}>Trạng thái:</Text>
            <View style={styles.chipRow}>{Object.entries(STATUS_VN).map(([k, v]) => <Chip key={k} selected={form.completionStatus === k} onPress={() => setForm(f => ({ ...f, completionStatus: k }))} compact>{v}</Chip>)}</View>
            <TextInput label="Ghi chú" mode="outlined" value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} dense multiline style={{ marginTop: 8 }} />
          </Dialog.ScrollArea>
          <Dialog.Actions><Button onPress={() => setShowCreate(false)}>Hủy</Button><Button mode="contained" buttonColor={COLOR} onPress={() => createMut.mutate()} loading={createMut.isPending} disabled={!form.residentId}>Lưu</Button></Dialog.Actions>
        </Dialog>
        <Dialog visible={!!deleteId} onDismiss={() => setDeleteId(null)}><Dialog.Title>Xóa bản ghi này?</Dialog.Title><Dialog.Actions><Button onPress={() => setDeleteId(null)}>Hủy</Button><Button mode="contained" buttonColor="#991B1B" onPress={() => deleteMut.mutate()} loading={deleteMut.isPending}>Xóa</Button></Dialog.Actions></Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' }, topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 }, topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' }, topSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }, list: { padding: 16, paddingBottom: 80 }, card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' }, row: { flexDirection: 'row', alignItems: 'center' }, name: { fontSize: 14, fontWeight: '600', color: '#111827' }, sub: { fontSize: 12, color: '#6B7280', marginTop: 2 }, notes: { fontSize: 11, color: '#374151', marginTop: 2 }, fab: { position: 'absolute', bottom: 16, right: 16 }, label: { fontSize: 13, color: '#6B7280', marginBottom: 4, marginTop: 8 }, chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
