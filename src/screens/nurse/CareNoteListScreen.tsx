import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip, Dialog, Portal, Button, TextInput, IconButton, FAB } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { CARE_NOTES } from '../../api/endpoints';
import { useDeleteCareNote } from '../../hooks/useCareNotes';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { useToast } from '../../utils/toast';

const COLOR = '#0F5040';
const NS = 'nurse.careNotes';

export const CareNoteListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const TYPE_FILTERS = [
    { value: '', label: t(`${NS}.filterAll`) },
    { value: 'meal', label: t(`${NS}.typeMeal`) },
    { value: 'activity', label: t(`${NS}.typeActivity`) },
    { value: 'daily_living', label: t(`${NS}.typeDailyLiving`) },
    { value: 'health', label: t(`${NS}.typeHealth`) },
    { value: 'general', label: t(`${NS}.typeGeneral`) },
  ];

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchDebounced(text), 300);
  }, []);

  const listQ = useQuery({
    queryKey: ['myNotes', filter, searchDebounced],
    queryFn: async () => (await api.get(CARE_NOTES.MY_NOTES, { params: { noteType: filter || undefined, search: searchDebounced || undefined } })).data,
  });
  const items = listQ.data?.data ?? listQ.data ?? [];

  const deleteMut = useDeleteCareNote();

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMut.mutate(deleteId, {
      onSuccess: () => { setDeleteId(null); toast(t(`${NS}.toastDeleted`), 'success'); },
      onError: () => toast(t(`${NS}.toastDeleteError`), 'error'),
    });
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topBarRow}>
          <Text style={styles.topTitle}>{t(`${NS}.listTitle`)}</Text>
          <IconButton icon="history" iconColor="#fff" size={22} onPress={() => navigation.navigate('NoteHistory')} />
        </View>
      </View>

      <View style={styles.searchRow}>
        <TextInput placeholder={t(`${NS}.searchPlaceholder`)} mode="outlined" value={search}
          onChangeText={handleSearch} dense style={styles.searchInput}
          left={<TextInput.Icon icon="magnify" />}
          right={search ? <TextInput.Icon icon="close" onPress={() => handleSearch('')} /> : undefined}
        />
      </View>

      <View style={styles.filterRow}>
        {TYPE_FILTERS.map(f => <Chip key={f.value} selected={filter === f.value} onPress={() => setFilter(f.value)} style={filter === f.value ? { backgroundColor: COLOR } : undefined} textStyle={filter === f.value ? { color: '#fff' } : undefined} compact>{f.label}</Chip>)}
      </View>

      <ScreenLayout loading={listQ.isLoading} error={listQ.error ? (listQ.error as Error).message : null} onRetry={listQ.refetch} isEmpty={items.length === 0} emptyMessage={t(`${NS}.empty`)}>
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={false} onRefresh={listQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined"
              onPress={() => navigation.navigate('EditNote', { note: item })}
              onLongPress={() => setDeleteId(item._id)}>
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

      <FAB icon="plus" style={styles.fab} color="#fff" onPress={() => navigation.navigate('CreateNote')} />

      <Portal>
        <Dialog visible={!!deleteId} onDismiss={() => setDeleteId(null)}>
          <Dialog.Title>{t(`${NS}.deleteConfirmTitle`)}</Dialog.Title>
          <Dialog.Content><Text>{t(`${NS}.deleteConfirmContent`)}</Text></Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteId(null)}>{t('common.cancel')}</Button>
            <Button mode="contained" buttonColor="#991B1B" onPress={handleDelete} loading={deleteMut.isPending}>{t('common.delete')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 8, paddingTop: 8 },
  topBarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  searchRow: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
  searchInput: { backgroundColor: '#fff', fontSize: 13 },
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingBottom: 8, flexWrap: 'wrap' },
  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  time: { fontSize: 11, color: '#9CA3AF' },
  content: { fontSize: 13, color: '#374151', lineHeight: 18 },
  resident: { fontSize: 12, color: '#6B7280', marginTop: 6 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: COLOR, borderRadius: 16 },
});
