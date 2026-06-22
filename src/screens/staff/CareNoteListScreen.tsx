import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip, Dialog, Portal, Button, FAB, Searchbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { CARE_NOTES } from '../../api/endpoints';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { useToast } from '../../utils/toast';

const COLOR = '#0F5040';

const TYPE_FILTERS = [
  { value: '', label: 'Tất cả', icon: 'format-list-bulleted' },
  { value: 'meal', label: 'Bữa ăn', icon: 'silverware-fork-knife' },
  { value: 'activity', label: 'Hoạt động', icon: 'run' },
  { value: 'daily_living', label: 'Sinh hoạt', icon: 'home-heart' },
  { value: 'health', label: 'Sức khỏe', icon: 'heart-pulse' },
  { value: 'general', label: 'Chung', icon: 'note-text-outline' },
];

const formatDateTime = (d: string) => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return d; }
};

const getMetaSummary = (note: any) => {
  const m = note.metadata;
  if (!m) return null;
  switch (note.noteType) {
    case 'meal': return [m.mealType, m.intakeAmount && `Ăn: ${m.intakeAmount}`, m.appetite && `Ngon miệng: ${m.appetite}`].filter(Boolean).join(' · ');
    case 'activity': return [m.activityType, m.participationLevel, m.mood, m.duration && `${m.duration} phút`].filter(Boolean).join(' · ');
    case 'daily_living': return [m.activityType, m.assistanceLevel, m.completionStatus].filter(Boolean).join(' · ');
    case 'health': return [m.consciousness, m.fallRisk && `Ngã: ${m.fallRisk}`, m.painLevel != null && `Đau: ${m.painLevel}/10`, m.temperature && `${m.temperature}°C`].filter(Boolean).join(' · ');
    default: return null;
  }
};

export const CareNoteListScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const toast = useToast();
  const qc = useQueryClient();

  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const listQ = useQuery({
    queryKey: ['myNotes', filter, debouncedSearch],
    queryFn: async () => (await api.get(CARE_NOTES.MY_NOTES, {
      params: { noteType: filter || undefined, search: debouncedSearch || undefined },
    })).data,
  });
  const items = listQ.data?.data ?? listQ.data ?? [];

  const deleteMut = useMutation({
    mutationFn: async () => (await api.delete(CARE_NOTES.DELETE(deleteId!))).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['myNotes'] }); setDeleteId(null); toast('Đã xóa ghi chú', 'success'); },
    onError: (e: any) => toast(e?.response?.data?.message || 'Không thể xóa', 'error'),
  });

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Ghi chú chăm sóc</Text>
        <Text style={styles.topSub}>{items.length} ghi chú</Text>
      </View>

      <Searchbar
        placeholder="Tìm theo nội dung..."
        value={search}
        onChangeText={setSearch}
        style={styles.searchBar}
        inputStyle={{ fontSize: 14 }}
      />

      <View style={styles.filterRow}>
        {TYPE_FILTERS.map((f) => (
          <Chip
            key={f.value}
            selected={filter === f.value}
            onPress={() => setFilter(f.value)}
            icon={f.icon}
            style={[styles.chip, filter === f.value && { backgroundColor: COLOR }]}
            textStyle={filter === f.value ? { color: '#fff' } : undefined}
            compact
          >
            {f.label}
          </Chip>
        ))}
      </View>

      <ScreenLayout
        loading={listQ.isLoading}
        error={listQ.error ? (listQ.error as Error).message : null}
        onRetry={listQ.refetch}
        isEmpty={items.length === 0}
        emptyMessage={search ? 'Không tìm thấy ghi chú phù hợp' : 'Chưa có ghi chú nào'}
      >
        <FlatList
          data={items}
          keyExtractor={(i: any) => i._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={listQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => {
            const metaSummary = getMetaSummary(item);
            return (
              <Card
                style={styles.card}
                mode="outlined"
                onPress={() => nav.navigate('NoteDetail', { noteId: item._id })}
                onLongPress={() => setDeleteId(item._id)}
              >
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <StatusBadge status={item.noteType} size="sm" />
                    <Text style={styles.time}>{formatDateTime(item.noteAt)}</Text>
                  </View>
                  <Text style={styles.content} numberOfLines={3}>{item.content}</Text>
                  {metaSummary ? (
                    <View style={styles.metaRow}>
                      <MaterialCommunityIcons name="information-outline" size={12} color="#9CA3AF" />
                      <Text style={styles.metaText} numberOfLines={1}>{metaSummary}</Text>
                    </View>
                  ) : null}
                  <View style={styles.cardFooter}>
                    <Text style={styles.resident}>
                      {item.residentId?.fullName ?? ''}
                    </Text>
                    <View style={styles.actionRow}>
                      <Button
                        compact
                        mode="text"
                        textColor={COLOR}
                        onPress={() => nav.navigate('EditNote', { noteId: item._id })}
                        icon="pencil"
                      >
                        Sửa
                      </Button>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            );
          }}
        />
      </ScreenLayout>

      <FAB icon="plus" style={[styles.fab, { backgroundColor: COLOR }]} color="#fff" onPress={() => nav.navigate('CreateNote')} />

      <Portal>
        <Dialog visible={!!deleteId} onDismiss={() => setDeleteId(null)}>
          <Dialog.Title>Xóa ghi chú này?</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: '#6B7280' }}>Hành động không thể hoàn tác.</Text>
          </Dialog.Content>
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
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  topSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  searchBar: { marginHorizontal: 12, marginTop: 10, borderRadius: 12, elevation: 0, backgroundColor: '#fff', height: 42 },
  filterRow: { flexDirection: 'row', gap: 6, padding: 12, paddingTop: 8, flexWrap: 'wrap' },
  chip: { borderRadius: 20 },
  list: { padding: 16, paddingBottom: 80 },
  card: { borderRadius: 12, marginBottom: 10, backgroundColor: '#fff' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  time: { fontSize: 11, color: '#9CA3AF' },
  content: { fontSize: 13, color: '#374151', lineHeight: 19 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, backgroundColor: '#F9FAFB', padding: 6, borderRadius: 6 },
  metaText: { fontSize: 11, color: '#6B7280', flex: 1, textTransform: 'capitalize' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  resident: { fontSize: 12, color: '#6B7280' },
  actionRow: { flexDirection: 'row' },
  fab: { position: 'absolute' as const, bottom: 16, right: 16 },
});
