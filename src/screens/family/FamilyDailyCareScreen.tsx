import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { useFamilyDailyActivities, useFamilyCareSchedule } from '../../hooks/useFamilyHealth';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ResidentSwitcher } from '../../components/shared/ResidentSwitcher';
import { CalendarPicker } from '../../components/shared/CalendarPicker';
import { BackHeader } from '../../components/layout/BackHeader';
import { formatLocalDate } from '../../utils/date';

const COLOR = '#2E7D32';
const NS = 'family.dailyCare';

const toDateStr = formatLocalDate;

export const FamilyDailyCareScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [date, setDate] = useState(toDateStr(new Date()));
  const [openSection, setOpenSection] = useState<string | null>('careTasks');

  const MEAL_TYPE_LABEL: Record<string, string> = {
    breakfast: t('nurse.mealPlans.mealBreakfast'), lunch: t('nurse.mealPlans.mealLunch'),
    dinner: t('nurse.mealPlans.mealDinner'), snack: t('nurse.careNotes.mealSnack'),
  };

  const SUBSECTIONS = [
    { key: 'careTasks', label: t(`${NS}.secCareTasks`), icon: 'clipboard-check-outline' },
    { key: 'hygieneRecords', label: t(`${NS}.secHygiene`), icon: 'shower' },
    { key: 'mealIntakeNotes', label: t(`${NS}.secMeals`), icon: 'silverware-fork-knife' },
    { key: 'behaviorRecords', label: t(`${NS}.secBehavior`), icon: 'emoticon-outline' },
  ] as const;

  const residentsQ = useQuery({
    queryKey: ['familyResidents'],
    queryFn: async () => { const r = await api.get(FAMILY.RESIDENTS); return r.data; },
  });
  const residents = residentsQ.data?.data ?? residentsQ.data ?? [];
  const activeId = selectedId ?? residents[0]?._id;

  const dailyQ = useFamilyDailyActivities(activeId, { date });
  const scheduleQ = useFamilyCareSchedule(activeId, { date });

  const daily = dailyQ.data?.data ?? dailyQ.data ?? {};
  const scheduleDays = scheduleQ.data?.data ?? scheduleQ.data ?? [];
  const loading = residentsQ.isLoading || dailyQ.isLoading || scheduleQ.isLoading;
  const isFetching = residentsQ.isFetching || dailyQ.isFetching || scheduleQ.isFetching;
  const refetch = () => { dailyQ.refetch(); scheduleQ.refetch(); };

  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.title`)} color={COLOR} onBack={() => navigation.goBack()} />

      <ResidentSwitcher residents={residents} activeId={activeId} onChange={setSelectedId} color={COLOR} />

      <View style={styles.dateBox}>
        <CalendarPicker label={t(`${NS}.dateLabel`)} value={date} onChange={setDate} color={COLOR} />
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={COLOR} />}>
        <ScreenLayout loading={loading} error={dailyQ.error ? (dailyQ.error as Error).message : null} onRetry={refetch}>
          <SectionHeader title={t(`${NS}.careScheduleTitle`)} roleColor={COLOR} />
          {scheduleDays.length === 0 ? <Text style={styles.empty}>{t(`${NS}.noCareSchedule`)}</Text> : null}
          {scheduleDays.map((day: any) => (
            <View key={day._id}>
              {(day.entries ?? []).map((entry: any) => (
                <Card key={entry._id} style={styles.card} mode="outlined">
                  <Card.Content>
                    <View style={styles.rowBetween}>
                      <StatusBadge status={entry.taskType} size="sm" />
                      <Text style={styles.time}>{entry.scheduledTime}</Text>
                    </View>
                    <Text style={styles.detail}>{t(`${NS}.careLevel`, { level: entry.careLevel })} · {t(`${NS}.staffLabel`, { name: entry.staffProfileId?.userId?.fullName ?? entry.staffProfileId?.staffCode ?? '—' })}</Text>
                    {entry.notes ? <Text style={styles.notes}>{entry.notes}</Text> : null}
                  </Card.Content>
                </Card>
              ))}
            </View>
          ))}

          <SectionHeader title={t(`${NS}.dailyActivitiesTitle`)} roleColor={COLOR} />
          {SUBSECTIONS.map((sec) => {
            const items = daily[sec.key] ?? [];
            const open = openSection === sec.key;
            return (
              <Card key={sec.key} style={styles.card} mode="outlined">
                <Pressable onPress={() => setOpenSection(open ? null : sec.key)} style={styles.subHeader}>
                  <MaterialCommunityIcons name={sec.icon as any} size={20} color={COLOR} />
                  <Text style={styles.subTitle}>{sec.label} ({items.length})</Text>
                  <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={20} color="#9CA3AF" />
                </Pressable>
                {open ? (
                  <Card.Content style={styles.subBody}>
                    {items.length === 0 ? <Text style={styles.empty}>{t(`${NS}.noData`)}</Text> : null}
                    {items.map((item: any) => (
                      <View key={item._id} style={styles.itemRow}>
                        {sec.key === 'careTasks' ? (
                          <>
                            <View style={styles.rowBetween}>
                              <StatusBadge status={item.taskType} size="sm" />
                              <StatusBadge status={item.status} size="sm" />
                            </View>
                            <Text style={styles.detail}>{item.scheduledTime} · {t(`${NS}.careLevelInline`, { level: item.careLevel })}</Text>
                          </>
                        ) : sec.key === 'hygieneRecords' ? (
                          <>
                            <Text style={styles.itemName}>{item.activityCategory} — {item.activityType}</Text>
                            <StatusBadge status={item.completionStatus} size="sm" />
                          </>
                        ) : sec.key === 'mealIntakeNotes' ? (
                          <>
                            <Text style={styles.itemName}>{MEAL_TYPE_LABEL[item.mealType] ?? item.mealType}{item.plannedMealName ? ` · ${item.plannedMealName}` : ''}</Text>
                            <View style={styles.rowBetween}>
                              <StatusBadge status={item.intakeStatus} size="sm" />
                              {item.portionPercent != null ? <Text style={styles.detail}>{t(`${NS}.portionPercent`, { percent: item.portionPercent })}</Text> : null}
                            </View>
                          </>
                        ) : (
                          <>
                            <Text style={styles.itemName}>{item.observationCategory}{item.behaviorType ? ` — ${item.behaviorType}` : ''}</Text>
                            <View style={styles.rowBetween}>
                              {item.moodLevel ? <StatusBadge status={item.moodLevel} size="sm" /> : <View />}
                              <StatusBadge status={item.severity} size="sm" />
                            </View>
                          </>
                        )}
                        {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
                        <Text style={styles.recordedAt}>
                          {item.recordedAt ? new Date(item.recordedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </Text>
                      </View>
                    ))}
                  </Card.Content>
                ) : null}
              </Card>
            );
          })}
        </ScreenLayout>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  dateBox: { paddingHorizontal: 16, paddingTop: 8 },
  body: { padding: 16, paddingTop: 0, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  time: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  detail: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  notes: { fontSize: 12, color: '#374151', marginTop: 6, fontStyle: 'italic' },
  subHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  subTitle: { flex: 1, fontSize: 13, fontWeight: '500', color: '#111827' },
  subBody: { paddingTop: 0, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  itemRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  itemName: { fontSize: 13, fontWeight: '500', color: '#111827', marginBottom: 4 },
  recordedAt: { fontSize: 10, color: '#9CA3AF', marginTop: 4 },
  empty: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 16 },
});
