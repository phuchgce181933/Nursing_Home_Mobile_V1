import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip, TextInput } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useCareNotes } from '../../hooks/useCareNotes';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { BackHeader } from '../../components/layout/BackHeader';

const COLOR = '#6B4200';
const NS = 'nurse.careNotes';
const CG_NS = 'assistant.careNotes';

/**
 * Ghi chú chăm sóc — bản dành cho hộ lý, CHỈ ĐỌC.
 *
 * `GET /api/care-notes` được backend lọc theo `StaffProfile.assignedResidentIds`
 * của chính người gọi (careNoteService.getReadableResidentIds), nên danh sách chỉ
 * gồm ghi chú của những cư dân mình phụ trách. Quyền tạo/sửa/xoá vẫn thuộc về y tá.
 *
 * Nhãn bộ lọc và nội dung dùng lại namespace `nurse.careNotes`; riêng tiêu đề và
 * thông báo lỗi lấy từ `assistant.careNotes` vì hộ lý không phải tác giả ghi chú.
 */
export const CareNoteListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
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

  const listQ = useCareNotes({ noteType: filter || undefined, search: searchDebounced || undefined });
  const items = listQ.data?.data ?? listQ.data ?? [];

  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${CG_NS}.title`)} color={COLOR} onBack={() => navigation.goBack()} />

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

      {/* Không in message của axios (chuỗi tiếng Anh / mã 403 kỹ thuật) ra màn hình. */}
      <ScreenLayout loading={listQ.isLoading} error={listQ.error ? t(`${CG_NS}.loadError`) : null} onRetry={listQ.refetch} isEmpty={items.length === 0} emptyMessage={t(`${NS}.empty`)}>
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={listQ.isFetching} onRefresh={listQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined"
              onPress={() => navigation.navigate('EditNote', { note: item, readOnly: true })}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  searchRow: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
  searchInput: { backgroundColor: '#fff', fontSize: 13 },
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingBottom: 8, flexWrap: 'wrap' },
  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  time: { fontSize: 11, color: '#9CA3AF' },
  content: { fontSize: 13, color: '#374151', lineHeight: 18 },
  resident: { fontSize: 12, color: '#6B7280', marginTop: 6 },
});
