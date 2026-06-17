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

export const FamilySupportScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [closeId, setCloseId] = useState<string | null>(null);
  const [closeNote, setCloseNote] = useState('');
  const [form, setForm] = useState({ fullName: '', age: '', phone: '', address: '', notes: '' });

  const listQ = useQuery({ queryKey: ['supportRequests'], queryFn: async () => (await api.get(FAMILY.SUPPORT_REQUESTS)).data });
  const items = listQ.data?.data ?? listQ.data ?? [];

  const createMut = useMutation({
    mutationFn: async () => (await api.post(FAMILY.SUPPORT_REQUESTS, { ...form, age: Number(form.age) || undefined })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['supportRequests'] }); setShowCreate(false); setForm({ fullName: '', age: '', phone: '', address: '', notes: '' }); toast('Đã gửi yêu cầu hỗ trợ', 'success'); },
    onError: () => toast('Không thể gửi yêu cầu', 'error'),
  });

  const closeMut = useMutation({
    mutationFn: async () => (await api.patch(FAMILY.SUPPORT_CLOSE(closeId!), { action: 'close', closingNote: closeNote })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['supportRequests'] }); setCloseId(null); setCloseNote(''); toast('Đã đóng yêu cầu', 'success'); },
    onError: () => toast('Không thể đóng', 'error'),
  });

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}><Text style={styles.topTitle}>Yêu cầu hỗ trợ</Text></View>
      <ScreenLayout loading={listQ.isLoading} error={listQ.error ? (listQ.error as Error).message : null} onRetry={listQ.refetch} isEmpty={items.length === 0} emptyMessage="Chưa có yêu cầu hỗ trợ">
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={false} onRefresh={listQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined">
              <Card.Content>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}><Text style={styles.name}>{item.fullName}</Text><Text style={styles.sub}>{item.phone} · {item.age ? `${item.age} tuổi` : ''}</Text>{item.notes ? <Text style={styles.reason} numberOfLines={2}>{item.notes}</Text> : null}</View>
                  <StatusBadge status={item.status} size="sm" />
                </View>
              </Card.Content>
              {item.status === 'open' || item.status === 'in_progress' ? (
                <Card.Actions><Button compact textColor="#991B1B" onPress={() => setCloseId(item._id)}>Đóng</Button></Card.Actions>
              ) : null}
            </Card>
          )} />
      </ScreenLayout>
      <FAB icon="plus" style={[styles.fab, { backgroundColor: COLOR }]} color="#fff" onPress={() => setShowCreate(true)} />

      <Portal>
        <Dialog visible={showCreate} onDismiss={() => setShowCreate(false)} style={{ borderRadius: 16 }}>
          <Dialog.Title>Gửi yêu cầu hỗ trợ</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 350 }}>
            <TextInput label="Họ tên *" mode="outlined" value={form.fullName} onChangeText={v => setForm(f => ({ ...f, fullName: v }))} dense style={styles.input} />
            <TextInput label="Tuổi" mode="outlined" value={form.age} onChangeText={v => setForm(f => ({ ...f, age: v }))} dense keyboardType="numeric" style={styles.input} />
            <TextInput label="Số điện thoại *" mode="outlined" value={form.phone} onChangeText={v => setForm(f => ({ ...f, phone: v }))} dense keyboardType="phone-pad" style={styles.input} />
            <TextInput label="Địa chỉ *" mode="outlined" value={form.address} onChangeText={v => setForm(f => ({ ...f, address: v }))} dense style={styles.input} />
            <TextInput label="Ghi chú" mode="outlined" value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} dense multiline style={styles.input} />
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowCreate(false)}>Hủy</Button>
            <Button mode="contained" buttonColor={COLOR} onPress={() => createMut.mutate()} loading={createMut.isPending} disabled={!form.fullName || !form.phone || !form.address}>Gửi</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={!!closeId} onDismiss={() => setCloseId(null)}>
          <Dialog.Title>Đóng yêu cầu hỗ trợ?</Dialog.Title>
          <Dialog.Content><TextInput label="Ghi chú đóng" mode="outlined" value={closeNote} onChangeText={setCloseNote} dense multiline /></Dialog.Content>
          <Dialog.Actions><Button onPress={() => setCloseId(null)}>Hủy</Button><Button mode="contained" buttonColor="#991B1B" onPress={() => closeMut.mutate()} loading={closeMut.isPending}>Đóng</Button></Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' }, topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 }, topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' }, list: { padding: 16, paddingBottom: 80 }, card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' }, row: { flexDirection: 'row', alignItems: 'center' }, name: { fontSize: 14, fontWeight: '600', color: '#111827' }, sub: { fontSize: 12, color: '#6B7280', marginTop: 2 }, reason: { fontSize: 12, color: '#374151', marginTop: 4 }, fab: { position: 'absolute', bottom: 16, right: 16 }, input: { marginBottom: 8 },
});
