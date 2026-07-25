import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip, Button, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNoteHistory } from '../../hooks/useCareNotes';
import { useResidents } from '../../hooks/useResidents';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { AvatarCircle } from '../../components/shared/AvatarCircle';
import { ScreenLayout } from '../../components/layout/ScreenLayout';

const COLOR = '#0F5040';
const NS = 'nurse.careNotes';

export const CareNoteHistoryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [filter, setFilter] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [searchResident, setSearchResident] = useState('');

  const TYPE_FILTERS = [
    { value: '', label: t(`${NS}.filterAll`) },
    { value: 'meal', label: t(`${NS}.typeMeal`) },
    { value: 'activity', label: t(`${NS}.typeActivity`) },
    { value: 'daily_living', label: t(`${NS}.typeDailyLiving`) },
    { value: 'health', label: t(`${NS}.typeHealth`) },
    { value: 'general', label: t(`${NS}.typeGeneral`) },
  ];

  const residentsQ = useResidents({ status: 'admitted' });
  const residents = Array.isArray(residentsQ.data) ? residentsQ.data : (residentsQ.data?.data ?? []);

  const historyQ = useNoteHistory(selectedResidentId || undefined, { noteType: filter || undefined });
  const items = historyQ.data?.data ?? historyQ.data ?? [];

  const selectedResident = residents.find((r: any) => r._id === selectedResidentId);
  const filteredResidents = searchResident
    ? residents.filter((r: any) => r.fullName?.toLowerCase().includes(searchResident.toLowerCase()))
    : residents.slice(0, 20);

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <View style={styles.topRow}>
          <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation.goBack()} />
          <Text style={styles.topTitle}>{t(`${NS}.historyTitle`)}</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>{t(`${NS}.selectResident`)}</Text>
        {selectedResident ? (
          <Card style={styles.residentCard} mode="outlined" onPress={() => setShowPicker(!showPicker)}>
            <Card.Content style={styles.residentRow}>
              <AvatarCircle name={selectedResident.fullName} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={styles.residentName}>{selectedResident.fullName}</Text>
                <Text style={styles.residentCode}>{selectedResident.residentCode}</Text>
              </View>
              <Button compact mode="text" textColor={COLOR} onPress={() => { setSelectedResidentId(''); setShowPicker(true); }}>{t(`${NS}.change`)}</Button>
            </Card.Content>
          </Card>
        ) : (
          <Button mode="outlined" onPress={() => setShowPicker(!showPicker)} style={styles.selectBtn}>
            {t(`${NS}.historySelectResident`)}
          </Button>
        )}

        {showPicker && (
          <Card style={styles.pickerCard}>
            <Card.Content>
              <TextInput placeholder={t(`${NS}.searchResidentPlaceholder`)} mode="outlined" value={searchResident}
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
            onRetry={historyQ.refetch} isEmpty={items.length === 0} emptyMessage={t(`${NS}.historyEmpty`)}>
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
                      {item.authorStaffId?.userId?.fullName ?? t(`${NS}.staffDefault`)}
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
