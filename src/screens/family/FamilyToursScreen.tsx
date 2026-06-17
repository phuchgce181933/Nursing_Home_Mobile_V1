import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Button, FAB, Dialog, Portal, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { useToast } from '../../utils/toast';

const COLOR = '#2E7D32';

export const FamilyToursScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [form, setForm] = useState({ contactName: '', contactPhone: '', contactEmail: '', preferredDate: '', preferredTimeSlot: '', numberOfVisitors: '1', notes: '' });

  const listQ = useQuery({ queryKey: ['tours'], queryFn: async () => (await api.get(FAMILY.TOURS)).data });
  const items = listQ.data?.data ?? listQ.data ?? [];

  const createMut = useMutation({
    mutationFn: async () => (await api.post(FAMILY.TOURS, { ...form, numberOfVisitors: Number(form.numberOfVisitors) || 1 })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tours'] }); setShowCreate(false); setForm({ contactName: '', contactPhone: '', contactEmail: '', preferredDate: '', preferredTimeSlot: '', numberOfVisitors: '1', notes: '' }); toast('Đã đặt lịch tham quan', 'success'); },
    onError: () => toast('Không thể đặt lịch', 'error'),
  });

  const cancelMut = useMutation({
    mutationFn: async () => (await api.patch(FAMILY.TOUR_CANCEL(cancelId!), { cancellationReason: cancelReason })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tours'] }); setCancelId(null); setCancelReason(''); toast('Đã hủy lịch tham quan', 'success'); },
    onError: () => toast('Không thể hủy', 'error'),
  });

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}><Text style={styles.topTitle}>Lịch tham quan</Text></View>
      <ScreenLayout loading={listQ.isLoading} error={listQ.error ? (listQ.error as Error).message : null} onRetry={listQ.refetch} isEmpty={items.length === 0} emptyMessage="Chưa có lịch tham quan">
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={false} onRefresh={listQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined">
              <Card.Content>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.contactName}</Text>
                    <Text style={styles.sub}>{item.preferredDate ? new Date(item.preferredDate).toLocaleDateString('vi-VN') : ''} · {item.preferredTimeSlot ?? ''} · {item.numberOfVisitors ?? 1} người</Text>
                    <Text style={styles.sub}>{item.contactPhone}</Text>
                  </View>
                  <StatusBadge status={item.status} size="sm" />
                </View>
              </Card.Content>
              {item.status === 'pending' ? (
                <Card.Actions><Button compact textColor="#991B1B" onPress={() => setCancelId(item._id)}>Hủy</Button></Card.Actions>
              ) : null}
            </Card>
          )} />
      </ScreenLayout>
      <FAB icon="plus" style={[styles.fab, { backgroundColor: COLOR }]} color="#fff" onPress={() => setShowCreate(true)} />

      <Portal>
        <Dialog visible={showCreate} onDismiss={() => setShowCreate(false)} style={{ borderRadius: 16 }}>
          <Dialog.Title>Đặt lịch tham quan</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 400 }}>
            <TextInput label="Tên liên hệ *" mode="outlined" value={form.contactName} onChangeText={v => setForm(f => ({ ...f, contactName: v }))} dense style={styles.input} />
            <TextInput label="Số điện thoại *" mode="outlined" value={form.contactPhone} onChangeText={v => setForm(f => ({ ...f, contactPhone: v }))} dense keyboardType="phone-pad" style={styles.input} />
            <TextInput label="Email" mode="outlined" value={form.contactEmail} onChangeText={v => setForm(f => ({ ...f, contactEmail: v }))} dense keyboardType="email-address" style={styles.input} />
            <TextInput label="Ngày mong muốn * (YYYY-MM-DD)" mode="outlined" value={form.preferredDate} onChangeText={v => setForm(f => ({ ...f, preferredDate: v }))} dense style={styles.input} />
            <TextInput label="Khung giờ (VD: 08:00-10:00)" mode="outlined" value={form.preferredTimeSlot} onChangeText={v => setForm(f => ({ ...f, preferredTimeSlot: v }))} dense style={styles.input} />
            <TextInput label="Số người tham quan" mode="outlined" value={form.numberOfVisitors} onChangeText={v => setForm(f => ({ ...f, numberOfVisitors: v }))} dense keyboardType="numeric" style={styles.input} />
            <TextInput label="Ghi chú" mode="outlined" value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} dense multiline style={styles.input} />
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowCreate(false)}>Hủy</Button>
            <Button mode="contained" buttonColor={COLOR} onPress={() => createMut.mutate()} loading={createMut.isPending} disabled={!form.contactName || !form.contactPhone || !form.preferredDate}>Đặt lịch</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={!!cancelId} onDismiss={() => setCancelId(null)}>
          <Dialog.Title>Hủy lịch tham quan?</Dialog.Title>
          <Dialog.Content><TextInput label="Lý do hủy" mode="outlined" value={cancelReason} onChangeText={setCancelReason} dense multiline /></Dialog.Content>
          <Dialog.Actions><Button onPress={() => setCancelId(null)}>Đóng</Button><Button mode="contained" buttonColor="#991B1B" onPress={() => cancelMut.mutate()} loading={cancelMut.isPending}>Hủy</Button></Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' }, topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 }, topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' }, list: { padding: 16, paddingBottom: 80 }, card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' }, row: { flexDirection: 'row', alignItems: 'center' }, name: { fontSize: 14, fontWeight: '600', color: '#111827' }, sub: { fontSize: 12, color: '#6B7280', marginTop: 2 }, fab: { position: 'absolute', bottom: 16, right: 16 }, input: { marginBottom: 8 },
});
