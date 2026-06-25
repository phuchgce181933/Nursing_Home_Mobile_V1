import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip, Button, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from 'react-native-paper';
import { useNoteHistory } from '../../hooks/useCareNotes';
import { useResidents } from '../../hooks/useResidents';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { AvatarCircle } from '../../components/shared/AvatarCircle';
import { ScreenLayout } from '../../components/layout/ScreenLayout';

const COLOR = '#0F5040';
const TYPE_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'meal', label: 'Bữa ăn' },
  { value: 'activity', label: 'Hoạt động' },
  { value: 'daily_living', label: 'Sinh hoạt' },
  { value: 'health', label: 'Sức khỏe' },
  { value: 'general', label: 'Chung' },
];

export const CareNoteHistoryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [filter, setFilter] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [searchResident, setSearchResident] = useState('');

  const residentsQ = useResidents({ status: 'admitted' });
  const residents = Array.isArray(residentsQ.data) ? residentsQ.data : (residentsQ.data?.data ?? []);

  const historyQ = useNoteHistory(selectedResidentId || undefined, { noteType: filter || undefined });
  const items = historyQ.data?.data ?? historyQ.data ?? [];

  const selectedResident = residents.find((r: any) => r._id === selectedResidentId);
  const filteredResidents = searchResident
    ? residents.filter((r: any) => r.fullName?.toLowerCase().includes(searchResident.toLowerCase()))
    : residents.slice(0, 20);

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.topRow}>
          <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation.goBack()} />
          <Text style={styles.topTitle}>Lịch sử ghi chú</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Chọn cư dân</Text>
        {selectedResident ? (
          <Card style={styles.residentCard} mode="outlined" onPress={() => setShowPicker(!showPicker)}>
            <Card.Content style={styles.residentRow}>
              <AvatarCircle name={selectedResident.fullName} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={styles.residentName}>{selectedResident.fullName}</Text>
                <Text style={styles.residentCode}>{selectedResident.residentCode}</Text>
              </View>
              <Button compact mode="text" textColor={COLOR} onPress={() => { setSelectedResidentId(''); setShowPicker(true); }}>Đổi</Button>
            </Card.Content>
          </Card>
        ) : (
          <Button mode="outlined" onPress={() => setShowPicker(!showPicker)} style={styles.selectBtn}>
            Chọn cư dân để xem lịch sử
          </Button>
        )}

        {showPicker && (
          <Card style={styles.pickerCard}>
            <Card.Content>
              <TextInput placeholder="Tìm cư dân..." mode="outlined" value={searchResident}
                onChangeText={setSearchResident} dense style={{ marginBottom: 8 }} />
              {filteredResidents.map((r: any) => (
                <Button key={r._id} mode="text" compact
                  onPress={() => { setSelectedResidentId(r._id); setShowPicker(false); setSearchResident(''); }}
                  style={styles.pickerItem}>
                  {r.fullName} — {r.residentCode}
                </Button>
              ))}
            </Card.Content>
          </Card>
        )}
      </View>

      {selectedResidentId ? (
        <>
          <View style={styles.filterRow}>
            {TYPE_FILTERS.map(f => (
              <Chip key={f.value} selected={filter === f.value} onPress={() => setFilter(f.value)}
                style={filter === f.value ? { backgroundColor: COLOR } : undefined}
                textStyle={filter === f.value ? { color: '#fff' } : undefined} compact>{f.label}</Chip>
            ))}
          </View>

          <ScreenLayout loading={historyQ.isLoading} error={historyQ.error ? (historyQ.error as Error).message : null}
            onRetry={historyQ.refetch} isEmpty={items.length === 0} emptyMessage="Chưa có ghi chú cho cư dân này">
            <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={false} onRefresh={historyQ.refetch} tintColor={COLOR} />}
              renderItem={({ item }) => (
                <Card style={styles.card} mode="outlined"
                  onPress={() => navigation.navigate('EditNote', { note: item })}>
                  <Card.Content>
                    <View style={styles.row}>
                      <StatusBadge status={item.noteType} size="sm" />
                      <Text style={styles.time}>{item.noteAt ? new Date(item.noteAt).toLocaleString('vi-VN') : ''}</Text>
                    </View>
                    <Text style={styles.content} numberOfLines={3}>{item.content}</Text>
                    <Text style={styles.author}>
                      {item.authorStaffId?.userId?.fullName ?? 'Nhân viên'}
                    </Text>
                  </Card.Content>
                </Card>
              )}
            />
          </ScreenLayout>
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 4, paddingBottom: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  section: { padding: 16, paddingBottom: 8 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 8 },
  residentCard: { borderRadius: 12, backgroundColor: '#fff' },
  residentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  residentName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  residentCode: { fontSize: 12, color: '#6B7280' },
  selectBtn: { borderRadius: 8, borderColor: COLOR },
  pickerCard: { marginTop: 8, borderRadius: 12, maxHeight: 250 },
  pickerItem: { justifyContent: 'flex-start' },
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingBottom: 8, flexWrap: 'wrap' },
  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  time: { fontSize: 11, color: '#9CA3AF' },
  content: { fontSize: 13, color: '#374151', lineHeight: 18 },
  author: { fontSize: 12, color: '#6B7280', marginTop: 6, fontStyle: 'italic' },
});
