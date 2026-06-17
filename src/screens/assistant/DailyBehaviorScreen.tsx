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
const CAT_VN: Record<string, string> = { mood: 'Tâm trạng', behavior: 'Hành vi', abnormal: 'Bất thường' };
const MOOD_VN: Record<string, string> = { calm: 'Bình tĩnh', happy: 'Vui vẻ', neutral: 'Trung tính', anxious: 'Lo lắng', sad: 'Buồn', agitated: 'Kích động', confused: 'Lẫn', irritable: 'Cáu kỉnh' };
const BEHAVIOR_VN: Record<string, string> = { cooperative: 'Hợp tác', withdrawn: 'Thu mình', restless: 'Bồn chồn', wandering: 'Đi lang thang', verbal_outburst: 'La hét', physical_resistance: 'Chống đối', sleep_disturbance: 'Rối loạn giấc ngủ', appetite_change: 'Thay đổi ăn uống', other: 'Khác' };
const SEV_VN: Record<string, string> = { normal: 'Bình thường', mild: 'Nhẹ', moderate: 'Vừa', urgent: 'Cấp bách' };
const SEV_COLORS: Record<string, string> = { normal: '#065F46', mild: '#1E40AF', moderate: '#92400E', urgent: '#991B1B' };

export const DailyBehaviorScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ residentId: '', observationCategory: 'mood', moodLevel: 'neutral', behaviorType: '', severity: 'normal', notes: '' });

  const listQ = useQuery({ queryKey: ['behaviors', today()], queryFn: async () => (await api.get(CAREGIVER.DAILY_BEHAVIORS, { params: { workDate: today() } })).data });
  const residentsQ = useQuery({ queryKey: ['behaviorResidents'], queryFn: async () => (await api.get(CAREGIVER.DAILY_BEHAVIOR_RESIDENTS)).data });
  const items = listQ.data?.data ?? listQ.data ?? [];
  const residents = residentsQ.data?.data ?? residentsQ.data ?? [];

  const createMut = useMutation({
    mutationFn: async () => {
      const body: any = { residentId: form.residentId, workDate: today(), observedAt: new Date().toISOString(), observationCategory: form.observationCategory, severity: form.severity, notes: form.notes };
      if (form.observationCategory === 'mood') body.moodLevel = form.moodLevel;
      else body.behaviorType = form.behaviorType || 'other';
      return (await api.post(CAREGIVER.DAILY_BEHAVIORS, body)).data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['behaviors'] }); setShowCreate(false); toast('Đã ghi nhận', 'success'); },
    onError: (e: any) => toast(e.response?.data?.message ?? 'Không thể ghi nhận', 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: async () => (await api.delete(CAREGIVER.DAILY_BEHAVIOR_DETAIL(deleteId!))).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['behaviors'] }); setDeleteId(null); toast('Đã xóa', 'success'); },
  });

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}><Text style={styles.topTitle}>Theo dõi hành vi</Text><Text style={styles.topSub}>{today()}</Text></View>
      <ScreenLayout loading={listQ.isLoading} error={listQ.error ? (listQ.error as Error).message : null} onRetry={listQ.refetch} isEmpty={items.length === 0} emptyMessage="Chưa có ghi nhận nào">
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={false} onRefresh={listQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined" onLongPress={() => setDeleteId(item._id)}>
              <Card.Content style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.residentId?.fullName ?? '--'}</Text>
                  <Text style={styles.sub}>
                    {CAT_VN[item.observationCategory] ?? item.observationCategory}
                    {item.moodLevel ? ` · ${MOOD_VN[item.moodLevel] ?? item.moodLevel}` : ''}
                    {item.behaviorType ? ` · ${BEHAVIOR_VN[item.behaviorType] ?? item.behaviorType}` : ''}
                  </Text>
                  {item.notes ? <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text> : null}
                  <Text style={styles.time}>{item.observedAt ? new Date(item.observedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
                </View>
                <Chip compact style={{ backgroundColor: SEV_COLORS[item.severity] ? `${SEV_COLORS[item.severity]}20` : '#F0F0F0' }}><Text style={{ fontSize: 10, color: SEV_COLORS[item.severity] ?? '#374151' }}>{SEV_VN[item.severity] ?? item.severity}</Text></Chip>
              </Card.Content>
            </Card>
          )} />
      </ScreenLayout>
      <FAB icon="plus" style={[styles.fab, { backgroundColor: COLOR }]} color="#fff" onPress={() => setShowCreate(true)} />

      <Portal>
        <Dialog visible={showCreate} onDismiss={() => setShowCreate(false)} style={{ borderRadius: 16 }}>
          <Dialog.Title>Ghi nhận hành vi</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 440 }}>
            <Text style={styles.label}>Cư dân:</Text>
            <View style={styles.chipRow}>{residents.slice(0, 15).map((r: any) => <Chip key={r._id} selected={form.residentId === r._id} onPress={() => setForm(f => ({ ...f, residentId: r._id }))} compact style={form.residentId === r._id ? { backgroundColor: COLOR } : undefined} textStyle={form.residentId === r._id ? { color: '#fff' } : undefined}>{r.fullName}</Chip>)}</View>
            <Text style={styles.label}>Phân loại:</Text>
            <View style={styles.chipRow}>{Object.entries(CAT_VN).map(([k, v]) => <Chip key={k} selected={form.observationCategory === k} onPress={() => setForm(f => ({ ...f, observationCategory: k }))} compact style={form.observationCategory === k ? { backgroundColor: COLOR } : undefined} textStyle={form.observationCategory === k ? { color: '#fff' } : undefined}>{v}</Chip>)}</View>
            {form.observationCategory === 'mood' ? (<><Text style={styles.label}>Tâm trạng:</Text><View style={styles.chipRow}>{Object.entries(MOOD_VN).map(([k, v]) => <Chip key={k} selected={form.moodLevel === k} onPress={() => setForm(f => ({ ...f, moodLevel: k }))} compact>{v}</Chip>)}</View></>) : (<><Text style={styles.label}>Loại hành vi:</Text><View style={styles.chipRow}>{Object.entries(BEHAVIOR_VN).map(([k, v]) => <Chip key={k} selected={form.behaviorType === k} onPress={() => setForm(f => ({ ...f, behaviorType: k }))} compact>{v}</Chip>)}</View></>)}
            <Text style={styles.label}>Mức độ:</Text>
            <View style={styles.chipRow}>{Object.entries(SEV_VN).map(([k, v]) => <Chip key={k} selected={form.severity === k} onPress={() => setForm(f => ({ ...f, severity: k }))} compact style={form.severity === k ? { backgroundColor: SEV_COLORS[k] } : undefined} textStyle={form.severity === k ? { color: '#fff' } : undefined}>{v}</Chip>)}</View>
            <TextInput label="Ghi chú *" mode="outlined" value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} dense multiline style={{ marginTop: 8 }} />
          </Dialog.ScrollArea>
          <Dialog.Actions><Button onPress={() => setShowCreate(false)}>Hủy</Button><Button mode="contained" buttonColor={COLOR} onPress={() => createMut.mutate()} loading={createMut.isPending} disabled={!form.residentId || !form.notes}>Lưu</Button></Dialog.Actions>
        </Dialog>
        <Dialog visible={!!deleteId} onDismiss={() => setDeleteId(null)}><Dialog.Title>Xóa bản ghi?</Dialog.Title><Dialog.Actions><Button onPress={() => setDeleteId(null)}>Hủy</Button><Button mode="contained" buttonColor="#991B1B" onPress={() => deleteMut.mutate()} loading={deleteMut.isPending}>Xóa</Button></Dialog.Actions></Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' }, topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 }, topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' }, topSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }, list: { padding: 16, paddingBottom: 80 }, card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' }, row: { flexDirection: 'row', alignItems: 'center' }, name: { fontSize: 14, fontWeight: '600', color: '#111827' }, sub: { fontSize: 12, color: '#6B7280', marginTop: 2 }, notes: { fontSize: 12, color: '#374151', marginTop: 2 }, time: { fontSize: 11, color: '#9CA3AF', marginTop: 2 }, fab: { position: 'absolute', bottom: 16, right: 16 }, label: { fontSize: 13, color: '#6B7280', marginBottom: 4, marginTop: 8 }, chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
