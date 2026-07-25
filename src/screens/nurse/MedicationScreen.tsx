import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Text, Chip, Card, Button, Dialog, Portal, TextInput, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useDailyMedSchedule, useMarkTaken, useMarkMissed } from '../../hooks/useMedications';
import { usePrescriptions } from '../../hooks/usePrescriptions';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { AlertBanner } from '../../components/shared/AlertBanner';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { CalendarPicker } from '../../components/shared/CalendarPicker';
import { useToast } from '../../utils/toast';
import { getStatusEntry } from '../../utils/statusMap';

const COLOR = '#0F5040';
const NS = 'nurse.medications';
const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => toDateStr(new Date());

const shiftDay = (dateStr: string, delta: number) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d + delta);
  return toDateStr(date);
};

export const MedicationScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { t } = useTranslation();
  const [tab, setTab] = useState<'schedule' | 'prescriptions'>('schedule');
  const [selectedDate, setSelectedDate] = useState(today());
  const [filter, setFilter] = useState('');
  const [missedDialog, setMissedDialog] = useState<string | null>(null);
  const [missedReason, setMissedReason] = useState('refused');
  const [missedNotes, setMissedNotes] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<string | null>(null);
  const [takenNotes, setTakenNotes] = useState('');

  const [prescriptionStatus, setPrescriptionStatus] = useState('ACTIVE');
  const [prescriptionSearch, setPrescriptionSearch] = useState('');
  const [expandedPrescriptionId, setExpandedPrescriptionId] = useState<string | null>(null);

  const TABS = [
    { value: 'schedule' as const, label: t(`${NS}.tabSchedule`) },
    { value: 'prescriptions' as const, label: t(`${NS}.tabPrescriptions`) },
  ];
  const STATUS_FILTERS = [
    { value: '', label: t('common.all') },
    { value: 'PENDING', label: t(`${NS}.filterPending`) },
    { value: 'TAKEN', label: t('status.TAKEN') },
    { value: 'MISSED', label: t(`${NS}.filterMissed`) },
    { value: 'OVERDUE', label: t(`${NS}.filterOverdue`) },
  ];
  const MISSED_REASONS = [
    { value: 'refused', label: t(`${NS}.reasonRefused`) },
    { value: 'asleep', label: t(`${NS}.reasonAsleep`) },
    { value: 'vomiting', label: t(`${NS}.reasonVomiting`) },
    { value: 'hospitalized', label: t(`${NS}.reasonHospitalized`) },
    { value: 'other', label: t(`${NS}.reasonOther`) },
  ];
  const PRESCRIPTION_STATUS_FILTERS = [
    { value: 'ACTIVE', label: t(`${NS}.statusActive`) },
    { value: 'COMPLETED', label: t(`${NS}.statusCompleted`) },
    { value: 'CANCELLED', label: t(`${NS}.statusCancelled`) },
  ];

  const isToday = selectedDate === today();

  const params = { date: selectedDate, status: filter || undefined };
  const scheduleQ = useDailyMedSchedule(params);
  const markTaken = useMarkTaken();
  const markMissed = useMarkMissed();

  const groups = scheduleQ.data?.data ?? [];
  const allSchedules = Array.isArray(groups) ? groups.flatMap((g: any) => g.schedules ?? []) : [];
  const overdueCount = allSchedules.filter((s: any) => s.status === 'OVERDUE').length;

  const prescriptionsQ = usePrescriptions({ limit: 100 });
  const allPrescriptions = prescriptionsQ.data?.data ?? prescriptionsQ.data ?? [];
  const prescriptions = (Array.isArray(allPrescriptions) ? allPrescriptions : []).filter((p: any) => {
    if (p.status !== prescriptionStatus) return false;
    if (!prescriptionSearch.trim()) return true;
    const q = prescriptionSearch.trim().toLowerCase();
    return (
      p.residentId?.fullName?.toLowerCase().includes(q) ||
      p.diagnosisNote?.toLowerCase().includes(q) ||
      p.items?.some((it: any) => it.medicationName?.toLowerCase().includes(q))
    );
  });

  const handleMarkTaken = async (id: string) => {
    try {
      await markTaken.mutateAsync({ id, notes: takenNotes || undefined });
      toast(t(`${NS}.toastTaken`), 'success');
    } catch {
      toast(t(`${NS}.toastError`), 'error');
    } finally {
      setConfirmDialog(null);
      setTakenNotes('');
    }
  };

  const handleMarkMissed = async () => {
    if (!missedDialog) return;
    try {
      await markMissed.mutateAsync({ id: missedDialog, reason: missedReason, notes: missedNotes });
      toast(t(`${NS}.toastMissed`), 'success');
    } catch {
      toast(t(`${NS}.toastError`), 'error');
    } finally {
      setMissedDialog(null);
      setMissedNotes('');
    }
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.topTitle}>{t(`${NS}.title`)}</Text>
      </View>

      <View style={styles.tabRow}>
        {TABS.map((tb) => (
          <Chip key={tb.value} selected={tab === tb.value} onPress={() => setTab(tb.value)}
            style={tab === tb.value ? { backgroundColor: COLOR } : undefined}
            textStyle={tab === tb.value ? { color: '#fff' } : undefined}>{tb.label}</Chip>
        ))}
      </View>

      {tab === 'schedule' ? (
        <>
          <View style={styles.dateBar}>
            <IconButton icon="chevron-left" size={22} iconColor={COLOR} onPress={() => setSelectedDate(d => shiftDay(d, -1))} style={styles.dateArrow} />
            <View style={styles.dateLabelWrap}>
              <CalendarPicker label={t('common.today')} value={selectedDate} onChange={setSelectedDate} color={COLOR} />
            </View>
            <IconButton icon="chevron-right" size={22} iconColor={COLOR} onPress={() => setSelectedDate(d => shiftDay(d, 1))} style={styles.dateArrow} />
          </View>

          {!isToday && (
            <View style={styles.todayBtnRow}>
              <Button compact mode="text" textColor={COLOR} icon="calendar-today" onPress={() => setSelectedDate(today())}>
                {t('common.backToToday')}
              </Button>
            </View>
          )}

          <View style={styles.filterRow}>
            {STATUS_FILTERS.map((f) => (
              <Chip
                key={f.value}
                selected={filter === f.value}
                onPress={() => setFilter(f.value)}
                style={[styles.chip, filter === f.value && { backgroundColor: COLOR }]}
                textStyle={filter === f.value ? { color: '#fff' } : undefined}
                compact
              >
                {f.label}
              </Chip>
            ))}
          </View>

          {overdueCount > 0 ? (
            <View style={{ paddingHorizontal: 16 }}>
              <AlertBanner message={t(`${NS}.overdueAlert`, { count: overdueCount })} severity="warning" />
            </View>
          ) : null}

          <ScreenLayout
            loading={scheduleQ.isLoading}
            error={scheduleQ.error ? (scheduleQ.error as Error).message : null}
            onRetry={scheduleQ.refetch}
            isEmpty={allSchedules.length === 0}
            emptyMessage={t(`${NS}.emptySchedule`)}
          >
            <FlatList
              data={groups}
              keyExtractor={(item: any) => item.residentId}
              contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={false} onRefresh={scheduleQ.refetch} tintColor={COLOR} />}
              renderItem={({ item: group }) => (
                <View style={styles.groupSection}>
                  <View style={styles.groupHeader}>
                    <MaterialCommunityIcons name="account" size={18} color={COLOR} />
                    <Text style={styles.groupName}>{group.residentName}</Text>
                    {group.room ? <Text style={styles.groupRoom}>{t(`${NS}.room`, { room: group.room })}</Text> : null}
                  </View>
                  {(group.schedules ?? []).map((item: any) => {
                    const entry = getStatusEntry(item.status);
                    const time = item.scheduledTime ? new Date(item.scheduledTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
                    const isPending = item.status === 'PENDING' || item.status === 'OVERDUE';

                    return (
                      <Card key={item.id} style={[styles.medCard, { borderLeftWidth: 4, borderLeftColor: entry.textColor }]} mode="outlined">
                        <Card.Content style={styles.medRow}>
                          <View style={styles.medInfo}>
                            <Text style={styles.medName} numberOfLines={1}>{item.medicationName}</Text>
                            <Text style={styles.medDosage}>{item.dosage} · {item.route} · {time}</Text>
                            {item.administrationTiming ? (
                              <Text style={styles.timingTag}>
                                {t(`${NS}.timing${item.administrationTiming === 'early' ? 'Early' : item.administrationTiming === 'late' ? 'Late' : 'OnTime'}`)}
                              </Text>
                            ) : null}
                            {item.notes ? (
                              <Text style={styles.medNotes} numberOfLines={2}>{t('common.notes')}: {item.notes}</Text>
                            ) : null}
                          </View>
                          <StatusBadge status={item.status} size="sm" />
                        </Card.Content>
                        {isPending ? (
                          <View style={styles.actionRow}>
                            <Button mode="outlined" compact style={styles.actionBtn} textColor={COLOR}
                              onPress={() => setConfirmDialog(item.id)}>{t(`${NS}.markTaken`)}</Button>
                            <Button mode="outlined" compact style={[styles.actionBtn, styles.actionBtnDanger]} textColor="#991B1B"
                              onPress={() => setMissedDialog(item.id)}>{t(`${NS}.markMissed`)}</Button>
                          </View>
                        ) : null}
                      </Card>
                    );
                  })}
                </View>
              )}
            />
          </ScreenLayout>
        </>
      ) : (
        <>
          <View style={styles.searchBar}>
            <TextInput mode="outlined" placeholder={t(`${NS}.searchPrescriptions`)} value={prescriptionSearch}
              onChangeText={setPrescriptionSearch} dense left={<TextInput.Icon icon="magnify" />} />
          </View>
          <View style={styles.filterRow}>
            {PRESCRIPTION_STATUS_FILTERS.map((f) => (
              <Chip key={f.value} selected={prescriptionStatus === f.value} onPress={() => setPrescriptionStatus(f.value)}
                style={prescriptionStatus === f.value ? { backgroundColor: COLOR } : undefined}
                textStyle={prescriptionStatus === f.value ? { color: '#fff' } : undefined} compact>{f.label}</Chip>
            ))}
          </View>
          <ScreenLayout loading={prescriptionsQ.isLoading} error={prescriptionsQ.error ? (prescriptionsQ.error as Error).message : null}
            onRetry={prescriptionsQ.refetch} isEmpty={prescriptions.length === 0} emptyMessage={t(`${NS}.emptyPrescriptions`)}>
            <FlatList data={prescriptions} keyExtractor={(item: any) => item._id} contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={false} onRefresh={prescriptionsQ.refetch} tintColor={COLOR} />}
              renderItem={({ item }) => {
                const expanded = expandedPrescriptionId === item._id;
                return (
                  <Card style={styles.medCard} mode="outlined">
                    <Pressable onPress={() => setExpandedPrescriptionId(expanded ? null : item._id)}>
                      <Card.Content>
                        <View style={styles.medRow}>
                          <View style={styles.medInfo}>
                            <Text style={styles.medName}>{item.residentId?.fullName ?? t(`${NS}.resident`)}</Text>
                            <Text style={styles.medDosage}>{item.diagnosisNote || t(`${NS}.noDiagnosis`)}</Text>
                          </View>
                          <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color="#9CA3AF" />
                        </View>
                        <Text style={styles.medDosage}>
                          {t(`${NS}.doctorLabel`, { name: item.doctorId?.fullName ?? '—' })} · {t(`${NS}.validUntil`, { date: item.validUntil ? new Date(item.validUntil).toLocaleDateString('vi-VN') : '--' })} · {t(`${NS}.medicationCount`, { count: item.items?.length ?? 0 })}
                        </Text>
                      </Card.Content>
                    </Pressable>
                    {expanded ? (
                      <Card.Content style={styles.prescriptionItemsBox}>
                        {(item.items ?? []).map((it: any, idx: number) => (
                          <View key={idx} style={styles.prescriptionItemRow}>
                            <Text style={styles.medName}>{it.medicationName}</Text>
                            <Text style={styles.medDosage}>
                              {it.dosage}{it.unit ? ` ${it.unit}` : ''} · {t(`${NS}.perDay`, { count: it.frequency })}{it.route ? ` · ${it.route}` : ''}
                            </Text>
                            {it.times?.length ? <Text style={styles.medDosage}>{t(`${NS}.timesLabel`, { times: it.times.join(', ') })}</Text> : null}
                            {it.startDate ? <Text style={styles.medDosage}>{t(`${NS}.fromDate`, { date: new Date(it.startDate).toLocaleDateString('vi-VN') })}</Text> : null}
                          </View>
                        ))}
                      </Card.Content>
                    ) : null}
                  </Card>
                );
              }}
            />
          </ScreenLayout>
        </>
      )}

      <Portal>
        <Dialog visible={!!confirmDialog} onDismiss={() => setConfirmDialog(null)}>
          <Dialog.Title>{t(`${NS}.confirmTakenTitle`)}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label={t('common.notes')}
              mode="outlined"
              value={takenNotes}
              onChangeText={setTakenNotes}
              dense
              multiline
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => { setConfirmDialog(null); setTakenNotes(''); }}>{t('common.cancel')}</Button>
            <Button mode="contained" buttonColor={COLOR} onPress={() => handleMarkTaken(confirmDialog!)}>{t('common.confirm')}</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={!!missedDialog} onDismiss={() => setMissedDialog(null)}>
          <Dialog.Title>{t(`${NS}.confirmMissedTitle`)}</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: 8, color: '#6B7280' }}>{t(`${NS}.confirmMissedIrreversible`)}</Text>
            <View style={styles.reasonRow}>
              {MISSED_REASONS.map((r) => (
                <Chip
                  key={r.value}
                  selected={missedReason === r.value}
                  onPress={() => setMissedReason(r.value)}
                  compact
                  style={missedReason === r.value ? { backgroundColor: '#FEE2E2' } : undefined}
                >
                  {r.label}
                </Chip>
              ))}
            </View>
            <TextInput
              label={t('common.notes')}
              mode="outlined"
              value={missedNotes}
              onChangeText={setMissedNotes}
              dense
              style={{ marginTop: 8 }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setMissedDialog(null)}>{t('common.cancel')}</Button>
            <Button mode="contained" buttonColor="#991B1B" onPress={handleMarkMissed}>{t('common.confirm')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 8 },
  searchBar: { paddingHorizontal: 16, paddingTop: 8 },
  prescriptionItemsBox: { paddingTop: 0, borderTopWidth: 1, borderTopColor: '#F0F0F0', marginTop: 4 },
  prescriptionItemRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  dateBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingTop: 8 },
  dateArrow: { margin: 0 },
  dateLabelWrap: { flex: 1 },
  todayBtnRow: { alignItems: 'center', paddingBottom: 2 },
  filterRow: { flexDirection: 'row', gap: 6, padding: 12, paddingBottom: 4, flexWrap: 'wrap' },
  chip: { borderRadius: 20 },
  list: { padding: 16, paddingBottom: 32 },
  medCard: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff', overflow: 'hidden' },
  medRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  medInfo: { flex: 1 },
  medName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  medDosage: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  timingTag: { fontSize: 11, color: COLOR, marginTop: 2, fontStyle: 'italic' },
  medNotes: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  actionBtn: { flex: 1, borderRadius: 8, borderColor: COLOR },
  actionBtnDanger: { borderColor: '#991B1B' },
  reasonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  groupSection: { marginBottom: 16 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  groupName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  groupRoom: { fontSize: 12, color: '#6B7280', marginLeft: 'auto' },
});
