import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, Chip, Searchbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { CARE_NOTES } from '../../api/endpoints';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { StatusBadge } from '../../components/shared/StatusBadge';

const COLOR = '#0F5040';

const TYPE_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'meal', label: 'Bữa ăn' },
  { value: 'activity', label: 'Hoạt động' },
  { value: 'daily_living', label: 'Sinh hoạt' },
  { value: 'health', label: 'Sức khỏe' },
  { value: 'general', label: 'Chung' },
];

const formatDateTime = (d: string) => {
  if (!d) return '';
  try { return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
};

export const CareNoteHistoryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const residentId = route.params?.residentId;
  const residentName = route.params?.residentName ?? 'Cư dân';

  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const historyQ = useQuery({
    queryKey: ['noteHistory', residentId, filter, debouncedSearch],
    queryFn: async () => (await api.get(CARE_NOTES.HISTORY(residentId), {
      params: { noteType: filter || undefined, search: debouncedSearch || undefined },
    })).data,
    enabled: !!residentId,
  });

  const items = historyQ.data?.data ?? historyQ.data ?? [];

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.topTitle}>Lịch sử ghi chú</Text>
          <Text style={styles.topSub}>{residentName}</Text>
        </View>
      </View>

      <Searchbar placeholder="Tìm trong ghi chú..." value={search} onChangeText={setSearch}
        style={styles.searchBar} inputStyle={{ fontSize: 14 }} />

      <View style={styles.filterRow}>
        {TYPE_FILTERS.map((f) => (
          <Chip key={f.value} selected={filter === f.value} onPress={() => setFilter(f.value)} compact
            style={filter === f.value ? { backgroundColor: COLOR } : undefined}
            textStyle={filter === f.value ? { color: '#fff' } : undefined}>
            {f.label}
          </Chip>
        ))}
      </View>

      <ScreenLayout loading={historyQ.isLoading} error={historyQ.error ? (historyQ.error as Error).message : null}
        onRetry={historyQ.refetch} isEmpty={items.length === 0} emptyMessage="Chưa có ghi chú nào cho cư dân này">
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={historyQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined"
              onPress={() => nav.navigate('NoteDetail', { noteId: item._id })}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <StatusBadge status={item.noteType} size="sm" />
                  <Text style={styles.time}>{formatDateTime(item.noteAt)}</Text>
                </View>
                <Text style={styles.content} numberOfLines={3}>{item.content}</Text>
                <Text style={styles.author}>
                  {item.authorStaffId?.userId?.fullName ?? item.authorStaffId?.fullName ?? ''}
                </Text>
              </Card.Content>
            </Card>
          )}
        />
      </ScreenLayout>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  topSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  searchBar: { marginHorizontal: 12, marginTop: 10, borderRadius: 12, elevation: 0, backgroundColor: '#fff', height: 42 },
  filterRow: { flexDirection: 'row', gap: 6, padding: 12, paddingTop: 8, flexWrap: 'wrap' },
  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  time: { fontSize: 11, color: '#9CA3AF' },
  content: { fontSize: 13, color: '#374151', lineHeight: 19 },
  author: { fontSize: 11, color: '#6B7280', marginTop: 6, fontStyle: 'italic' },
});
