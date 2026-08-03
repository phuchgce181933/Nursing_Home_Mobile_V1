import React, { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip, Button, TextInput } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNoteHistory } from '../../hooks/useCareNotes';
import { useResidents } from '../../hooks/useResidents';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { AvatarCircle } from '../../components/shared/AvatarCircle';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { BackHeader } from '../../components/layout/BackHeader';
import { useAuth } from '../../auth/useAuth';
import { useAppTheme } from '../../theme/useAppTheme';
import type { AppColors } from '../../constants/theme';

const NS = 'nurse.careNotes';

export const CareNoteHistoryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { colors, roleColor } = useAppTheme('nurse');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isNurse = user?.role === 'nurse';
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
      <BackHeader title={t(`${NS}.historyTitle`)} color={roleColor} onBack={() => navigation.goBack()} />

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
              <Button compact mode="text" textColor={roleColor} onPress={() => { setSelectedResidentId(''); setShowPicker(true); }}>{t(`${NS}.change`)}</Button>
            </Card.Content>
          </Card>
        ) : (
          <Button mode="outlined" onPress={() => setShowPicker(!showPicker)} style={[styles.selectBtn, { borderColor: roleColor }]}>
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
                style={filter === f.value ? { backgroundColor: roleColor } : undefined}
                textStyle={filter === f.value ? { color: '#fff' } : undefined} compact>{f.label}</Chip>
            ))}
          </View>

          <ScreenLayout loading={historyQ.isLoading} error={historyQ.error ? (historyQ.error as Error).message : null}
            onRetry={historyQ.refetch} isEmpty={items.length === 0} emptyMessage={t(`${NS}.historyEmpty`)}>
            <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={historyQ.isFetching} onRefresh={historyQ.refetch} tintColor={roleColor} />}
              renderItem={({ item }) => (
                <Card style={styles.card} mode="outlined"
                  onPress={() => navigation.navigate('EditNote', { note: item, readOnly: !isNurse })}>
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

const createStyles = (c: AppColors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.background },
  section: { padding: 16, paddingBottom: 8 },
  label: { fontSize: 13, fontWeight: '500', color: c.text, marginBottom: 8 },
  residentCard: { borderRadius: 12, backgroundColor: c.surface },
  residentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  residentName: { fontSize: 14, fontWeight: '500', color: c.text },
  residentCode: { fontSize: 12, color: c.textSecondary },
  selectBtn: { borderRadius: 8 },
  pickerCard: { marginTop: 8, borderRadius: 12, maxHeight: 250 },
  pickerItem: { justifyContent: 'flex-start' },
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingBottom: 8, flexWrap: 'wrap' },
  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: c.surface },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  time: { fontSize: 11, color: c.textMuted },
  content: { fontSize: 13, color: c.text, lineHeight: 18 },
  author: { fontSize: 12, color: c.textSecondary, marginTop: 6, fontStyle: 'italic' },
});
