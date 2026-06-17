import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip, Dialog, Portal, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { CARE_NOTES } from '../../api/endpoints';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { useToast } from '../../utils/toast';

const COLOR = '#0F5040';
const TYPE_FILTERS = [{ value: '', label: 'Tất cả' }, { value: 'meal', label: 'Bữa ăn' }, { value: 'activity', label: 'Hoạt động' }, { value: 'daily_living', label: 'Sinh hoạt' }, { value: 'health', label: 'Sức khỏe' }, { value: 'general', label: 'Chung' }];

export const CareNoteListScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const listQ = useQuery({ queryKey: ['myNotes', filter], queryFn: async () => (await api.get(CARE_NOTES.MY_NOTES, { params: { noteType: filter || undefined } })).data });
  const items = listQ.data?.data ?? listQ.data ?? [];

  const deleteMut = useMutation({
    mutationFn: async () => (await api.delete(CARE_NOTES.DELETE(deleteId!))).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['myNotes'] }); setDeleteId(null); toast('Đã xóa ghi chú', 'success'); },
    onError: () => toast('Không thể xóa', 'error'),
  });

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}><Text style={styles.topTitle}>Ghi chú của tôi</Text></View>
      <View style={styles.filterRow}>
        {TYPE_FILTERS.map(f => <Chip key={f.value} selected={filter === f.value} onPress={() => setFilter(f.value)} style={filter === f.value ? { backgroundColor: COLOR } : undefined} textStyle={filter === f.value ? { color: '#fff' } : undefined} compact>{f.label}</Chip>)}
      </View>
      <ScreenLayout loading={listQ.isLoading} error={listQ.error ? (listQ.error as Error).message : null} onRetry={listQ.refetch} isEmpty={items.length === 0} emptyMessage="Chưa có ghi chú nào">
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={false} onRefresh={listQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined" onLongPress={() => setDeleteId(item._id)}>
              <Card.Content>
                <View style={styles.row}>
                  <StatusBadge status={item.noteType} size="sm" />
                  <Text style={styles.time}>{item.noteAt ? new Date(item.noteAt).toLocaleString('vi-VN') : ''}</Text>
                </View>
                <Text style={styles.content} numberOfLines={3}>{item.content}</Text>
                <Text style={styles.resident}>{item.residentId?.fullName ?? ''}</Text>
              </Card.Content>
            </Card>
          )} />
      </ScreenLayout>

      <Portal>
        <Dialog visible={!!deleteId} onDismiss={() => setDeleteId(null)}>
          <Dialog.Title>Xóa ghi chú này?</Dialog.Title>
          <Dialog.Content><Text>Hành động không thể hoàn tác.</Text></Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteId(null)}>Hủy</Button>
            <Button mode="contained" buttonColor="#991B1B" onPress={() => deleteMut.mutate()} loading={deleteMut.isPending}>Xóa</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' }, topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 }, topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' }, filterRow: { flexDirection: 'row', gap: 6, padding: 12, flexWrap: 'wrap' }, list: { padding: 16, paddingBottom: 32 }, card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }, time: { fontSize: 11, color: '#9CA3AF' }, content: { fontSize: 13, color: '#374151', lineHeight: 18 }, resident: { fontSize: 12, color: '#6B7280', marginTop: 6 },
});
