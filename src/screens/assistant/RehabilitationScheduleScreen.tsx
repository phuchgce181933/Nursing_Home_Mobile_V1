import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip, IconButton, Dialog, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useCaregiverRehabResidents, useCaregiverRehabOverview, useCaregiverRehabDetail } from '../../hooks/useCaregiverRehabSchedules';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { CalendarPicker } from '../../components/shared/CalendarPicker';
import { BackHeader } from '../../components/layout/BackHeader';
import { formatLocalDate } from '../../utils/date';

const COLOR = '#6B4200';
const NS = 'assistant.rehabSchedule';
const today = () => formatLocalDate(new Date());

export const RehabilitationScheduleScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const [workDate, setWorkDate] = useState(today());
  const [residentId, setResidentId] = useState('');
  const [detailResidentId, setDetailResidentId] = useState<string | null>(null);

  const residentsQ = useCaregiverRehabResidents();
  const residents = residentsQ.data?.data ?? [];

  const overviewQ = useCaregiverRehabOverview({ workDate, residentId: residentId || undefined });
  const rows = overviewQ.data?.data ?? [];

  const detailQ = useCaregiverRehabDetail(detailResidentId ?? undefined, { workDate });
  const detail = detailQ.data?.data ?? detailQ.data;

  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.title`)} color={COLOR} onBack={() => navigation.goBack()} />

      <View style={styles.filters}>
        <CalendarPicker label={t(`${NS}.dateLabel`)} value={workDate} onChange={setWorkDate} color={COLOR} />
        {residents.length > 0 && (
          <View style={styles.chipRow}>
            <Chip selected={!residentId} onPress={() => setResidentId('')}
              style={!residentId ? { backgroundColor: COLOR } : undefined}
              textStyle={!residentId ? { color: '#fff' } : undefined} compact>{t(`${NS}.filterAll`)}</Chip>
            {residents.map((r: any) => (
              <Chip key={r._id} selected={residentId === r._id} onPress={() => setResidentId(r._id)}
                style={residentId === r._id ? { backgroundColor: COLOR } : undefined}
                textStyle={residentId === r._id ? { color: '#fff' } : undefined} compact>{r.fullName}</Chip>
            ))}
          </View>
        )}
      </View>

      <ScreenLayout loading={overviewQ.isLoading} error={overviewQ.error ? (overviewQ.error as Error).message : null}
        onRetry={overviewQ.refetch} isEmpty={rows.length === 0} emptyMessage={t(`${NS}.empty`)}>
        <FlatList data={rows} keyExtractor={(i: any) => i.residentId} contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={overviewQ.isFetching} onRefresh={overviewQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined" onPress={() => setDetailResidentId(item.residentId)}>
              <Card.Content>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.fullName} {item.residentCode ? `(${item.residentCode})` : ''}</Text>
                    <Text style={styles.sub}>
                      {item.hasRehabSchedule
                        ? t(`${NS}.sessionCount`, { count: item.sessionCount ?? 0 })
                        : t(`${NS}.noSchedule`)}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name={item.hasRehabSchedule ? 'check-circle' : 'close-circle-outline'}
                    size={22}
                    color={item.hasRehabSchedule ? '#16A34A' : '#9CA3AF'}
                  />
                </View>
              </Card.Content>
            </Card>
          )} />
      </ScreenLayout>

      <Portal>
        <Dialog visible={!!detailResidentId} onDismiss={() => setDetailResidentId(null)} style={{ borderRadius: 16 }}>
          <Dialog.Title>{detail?.resident?.fullName ?? t(`${NS}.detailTitle`)}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 420 }}>
            {detailQ.isLoading ? (
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            ) : detail?.schedule?.published && (detail.schedule.sessions ?? []).length > 0 ? (
              <View style={{ paddingVertical: 8 }}>
                {detail.schedule.sessions.map((s: any, i: number) => (
                  <View key={i} style={styles.sessionCard}>
                    <Text style={styles.sessionTime}>{s.scheduledTime ?? ''} · {s.durationMinutes ? `${s.durationMinutes} ${t(`${NS}.minutes`)}` : ''}</Text>
                    <Text style={styles.sessionTitle}>{s.sessionTitle || s.sessionType}</Text>
                    {s.location ? <Text style={styles.sessionMeta}>{t(`${NS}.location`)}: {s.location}</Text> : null}
                    {s.leadStaffName ? <Text style={styles.sessionMeta}>{t(`${NS}.leadStaff`)}: {s.leadStaffName}</Text> : null}
                    {s.therapyGoals ? <Text style={styles.sessionNote}>{s.therapyGoals}</Text> : null}
                    {s.caregiverAssistNote ? <Text style={styles.sessionNote}>{t(`${NS}.assistNote`)}: {s.caregiverAssistNote}</Text> : null}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>{t(`${NS}.emptySchedule`)}</Text>
            )}
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <IconButton icon="close" onPress={() => setDetailResidentId(null)} />
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  filters: { padding: 12 },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 10 },
  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '600', color: '#111827' },
  sub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  loadingText: { textAlign: 'center', paddingVertical: 24, color: '#6B7280' },
  sessionCard: { borderRadius: 10, backgroundColor: '#FAF7F2', padding: 10, marginBottom: 8 },
  sessionTime: { fontSize: 11, fontWeight: '700', color: COLOR },
  sessionTitle: { fontSize: 13, fontWeight: '600', color: '#111827', marginTop: 2 },
  sessionMeta: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  sessionNote: { fontSize: 11, color: '#374151', marginTop: 4, fontStyle: 'italic' },
  emptyText: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', paddingVertical: 16 },
});
