import React, { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Text, Chip, Card, Button, Dialog, Portal, TextInput, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useDailyMedSchedule, useMarkTaken, useMarkMissed } from '../../hooks/useMedications';
import { usePrescriptions } from '../../hooks/usePrescriptions';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { AlertBanner } from '../../components/shared/AlertBanner';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { BackHeader } from '../../components/layout/BackHeader';
import { CalendarPicker } from '../../components/shared/CalendarPicker';
import { useToast } from '../../utils/toast';
import { getStatusEntry, getHueColors } from '../../utils/statusMap';
import {
  useMedicationLabels,
  formatDosage,
  PRESCRIPTION_STATUSES,
  PRESCRIPTION_STATUS_HUE,
} from '../../utils/medicationLabels';
import { useAppTheme } from '../../theme/useAppTheme';
import type { AppColors } from '../../constants/theme';

const NS = 'nurse.medications';
const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => toDateStr(new Date());

const shiftDay = (dateStr: string, delta: number) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d + delta);
  return toDateStr(date);
};

const vnDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('vi-VN') : '');

export const MedicationScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const toast = useToast();
  const { t } = useTranslation();
  const { colors, roleColor, scheme, semantic } = useAppTheme('nurse');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { getPrescriptionStatusLabel, getRouteLabel } = useMedicationLabels();
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
    { value: 'TAKEN', label: t(`${NS}.filterTaken`) },
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
  /**
   * Trước đây chỉ liệt kê 3 trạng thái (ACTIVE/COMPLETED/CANCELLED) nên đơn
   * nháp, tạm ngưng hay hết hiệu lực không có cách nào mở ra. Danh sách này lấy
   * thẳng từ enum PRESCRIPTION_STATUSES của backend, nhãn dịch tập trung.
   */
  const PRESCRIPTION_STATUS_FILTERS = useMemo(
    () => [
      { value: 'ALL', label: t(`${NS}.filterAllStatuses`) },
      ...PRESCRIPTION_STATUSES.map((s) => ({ value: s, label: getPrescriptionStatusLabel(s) })),
    ],
    [t, getPrescriptionStatusLabel]
  );

  const isToday = selectedDate === today();

  const params = { date: selectedDate, status: filter || undefined };
  const scheduleQ = useDailyMedSchedule(params);
  const markTaken = useMarkTaken();
  const markMissed = useMarkMissed();

  const groups = scheduleQ.data?.data ?? [];
  const allSchedules = Array.isArray(groups) ? groups.flatMap((g: any) => g.schedules ?? []) : [];
  const overdueCount = allSchedules.filter((s: any) => s.status === 'OVERDUE').length;

  // Lọc trạng thái ở phía server (`listPrescriptions` đã hỗ trợ `status`), chỉ
  // còn ô tìm kiếm là lọc tại chỗ vì API không nhận tham số search.
  const prescriptionsQ = usePrescriptions({
    status: prescriptionStatus === 'ALL' ? undefined : prescriptionStatus,
    limit: 100,
  });
  const allPrescriptions = prescriptionsQ.data?.data ?? prescriptionsQ.data ?? [];
  const prescriptions = (Array.isArray(allPrescriptions) ? allPrescriptions : []).filter((p: any) => {
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

  const renderPrescriptionItem = (it: any, idx: number) => {
    const schedule = [
      formatDosage(it.dosage, it.unit),
      it.isPRN ? null : t(`${NS}.perDay`, { count: it.frequency }),
      getRouteLabel(it.route),
    ].filter(Boolean).join(' · ');
    const range = it.startDate && it.endDate
      ? t(`${NS}.dateRange`, { from: vnDate(it.startDate), to: vnDate(it.endDate) })
      : it.startDate
        ? t(`${NS}.fromDate`, { date: vnDate(it.startDate) })
        : '';

    return (
      <View key={it._id ?? idx} style={styles.itemRow}>
        <View style={styles.itemHead}>
          <Text style={styles.itemName} numberOfLines={2}>{it.medicationName}</Text>
          {it.isPRN ? (
            <Text style={[styles.prnTag, { color: semantic.info, backgroundColor: colors.surfaceMuted }]}>
              {t(`${NS}.prnBadge`)}
            </Text>
          ) : null}
        </View>
        <Text style={styles.itemMeta}>{schedule}</Text>
        {it.times?.length ? <Text style={styles.itemMeta}>{t(`${NS}.timesLabel`, { times: it.times.join(', ') })}</Text> : null}
        {range ? (
          <Text style={styles.itemMeta}>
            {range}{it.duration ? ` · ${t(`${NS}.durationLabel`, { count: it.duration })}` : ''}
          </Text>
        ) : null}
        {it.isPRN && it.prnReason ? (
          <Text style={styles.itemNote}>{t(`${NS}.prnReasonLabel`)}: {it.prnReason}</Text>
        ) : null}
        {it.instructions ? (
          <Text style={styles.itemNote}>{t(`${NS}.instructionsLabel`)}: {it.instructions}</Text>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.flex}>
      {/* Thanh tiêu đề cũ không có nút Back — màn này là gốc của MedStack nên
          goBack() nổi lên tab navigator (backBehavior mặc định 'firstRoute'),
          y hệt phím Back vật lý của Android. */}
      <BackHeader title={t(`${NS}.title`)} color={roleColor} onBack={() => navigation?.goBack()} />

      <View style={styles.tabRow}>
        {TABS.map((tb) => (
          <Chip key={tb.value} selected={tab === tb.value} onPress={() => setTab(tb.value)}
            style={tab === tb.value ? { backgroundColor: roleColor } : undefined}
            textStyle={tab === tb.value ? { color: '#fff' } : undefined}>{tb.label}</Chip>
        ))}
      </View>

      {tab === 'schedule' ? (
        <>
          <View style={styles.dateBar}>
            <IconButton icon="chevron-left" size={22} iconColor={roleColor} onPress={() => setSelectedDate(d => shiftDay(d, -1))} style={styles.dateArrow} />
            <View style={styles.dateLabelWrap}>
              <CalendarPicker label={t('common.today')} value={selectedDate} onChange={setSelectedDate} color={roleColor} />
            </View>
            <IconButton icon="chevron-right" size={22} iconColor={roleColor} onPress={() => setSelectedDate(d => shiftDay(d, 1))} style={styles.dateArrow} />
          </View>

          {!isToday && (
            <View style={styles.todayBtnRow}>
              <Button compact mode="text" textColor={roleColor} icon="calendar-today" onPress={() => setSelectedDate(today())}>
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
                style={[styles.chip, filter === f.value && { backgroundColor: roleColor }]}
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
            error={scheduleQ.error ? t(`${NS}.scheduleLoadError`) : null}
            onRetry={scheduleQ.refetch}
            isEmpty={allSchedules.length === 0}
            emptyMessage={t(`${NS}.emptySchedule`)}
          >
            <FlatList
              data={groups}
              keyExtractor={(item: any) => item.residentId}
              contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={scheduleQ.isFetching} onRefresh={scheduleQ.refetch} tintColor={roleColor} />}
              renderItem={({ item: group }) => (
                <View style={styles.groupSection}>
                  <View style={styles.groupHeader}>
                    <MaterialCommunityIcons name="account" size={18} color={roleColor} />
                    <Text style={styles.groupName}>{group.residentName}</Text>
                    {group.room ? <Text style={styles.groupRoom}>{t(`${NS}.room`, { room: group.room })}</Text> : null}
                  </View>
                  {(group.schedules ?? []).map((item: any) => {
                    const entry = getStatusEntry(item.status, scheme);
                    const time = item.scheduledTime ? new Date(item.scheduledTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
                    const isPending = item.status === 'PENDING' || item.status === 'OVERDUE';

                    return (
                      <Card key={item.id} style={[styles.medCard, { borderLeftWidth: 4, borderLeftColor: entry.textColor }]} mode="outlined">
                        <Card.Content style={styles.medRow}>
                          <View style={styles.medInfo}>
                            <Text style={styles.medName} numberOfLines={1}>{item.medicationName}</Text>
                            {/* `route` là enum thô của backend ('oral'…) — luôn dịch qua getRouteLabel. */}
                            <Text style={styles.medDosage}>{[formatDosage(item.dosage), getRouteLabel(item.route), time].filter(Boolean).join(' · ')}</Text>
                            {item.administrationTiming ? (
                              <Text style={[styles.timingTag, { color: roleColor }]}>
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
                            <Button mode="outlined" compact style={[styles.actionBtn, { borderColor: roleColor }]} textColor={roleColor}
                              onPress={() => setConfirmDialog(item.id)}>{t(`${NS}.markTaken`)}</Button>
                            {/* Hex cố định #991B1B chỉ đủ tương phản trên nền sáng. */}
                            <Button mode="outlined" compact style={[styles.actionBtn, { borderColor: semantic.danger }]} textColor={semantic.danger}
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
            <TextInput mode="outlined" placeholder={t(`${NS}.searchPrescriptionsPlaceholder`)} value={prescriptionSearch}
              onChangeText={setPrescriptionSearch} dense left={<TextInput.Icon icon="magnify" />}
              right={prescriptionSearch ? <TextInput.Icon icon="close" onPress={() => setPrescriptionSearch('')} /> : undefined} />
          </View>
          <View style={styles.filterRow}>
            {PRESCRIPTION_STATUS_FILTERS.map((f) => (
              <Chip key={f.value} selected={prescriptionStatus === f.value} onPress={() => setPrescriptionStatus(f.value)}
                style={[styles.chip, prescriptionStatus === f.value && { backgroundColor: roleColor }]}
                textStyle={prescriptionStatus === f.value ? { color: '#fff' } : undefined} compact>{f.label}</Chip>
            ))}
          </View>
          <ScreenLayout loading={prescriptionsQ.isLoading} error={prescriptionsQ.error ? t(`${NS}.prescriptionLoadError`) : null}
            onRetry={prescriptionsQ.refetch} isEmpty={prescriptions.length === 0} emptyMessage={t(`${NS}.emptyPrescriptions`)}>
            <FlatList data={prescriptions} keyExtractor={(item: any) => item._id} contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={prescriptionsQ.isFetching} onRefresh={prescriptionsQ.refetch} tintColor={roleColor} />}
              renderItem={({ item }) => {
                const expanded = expandedPrescriptionId === item._id;
                const items = item.items ?? [];
                // `statusMap` chỉ biết trạng thái *lịch phát thuốc*; trạng thái
                // *đơn thuốc* có bảng hue riêng nên tô màu trực tiếp từ đó thay
                // vì mượn tạm một khoá gần giống.
                const accent = getHueColors(PRESCRIPTION_STATUS_HUE[item.status] ?? 'neutral', scheme);

                return (
                  <Card style={[styles.medCard, { borderLeftWidth: 4, borderLeftColor: accent.text }]} mode="outlined">
                    <Pressable onPress={() => setExpandedPrescriptionId(expanded ? null : item._id)}>
                      <Card.Content>
                        <View style={styles.rxHead}>
                          <Text style={styles.rxResident} numberOfLines={1}>
                            {item.residentId?.fullName ?? t(`${NS}.resident`)}
                          </Text>
                          <Text style={[styles.rxStatus, { color: accent.text, backgroundColor: accent.bg }]}>
                            {getPrescriptionStatusLabel(item.status)}
                          </Text>
                        </View>
                        <Text style={styles.rxDiagnosis} numberOfLines={2}>{item.diagnosisNote || t(`${NS}.noDiagnosis`)}</Text>
                        <Text style={styles.medDosage}>{t(`${NS}.doctorLabel`, { name: item.doctorId?.fullName ?? '—' })}</Text>
                        <Text style={styles.medDosage}>
                          {t(`${NS}.validUntil`, { date: vnDate(item.validUntil) || '--' })} · {t(`${NS}.medicationCount`, { count: items.length })}
                        </Text>
                        {item.status === 'SUSPENDED' && item.suspendedReason ? (
                          <Text style={styles.itemNote}>{t(`${NS}.suspendedReasonLabel`)}: {item.suspendedReason}</Text>
                        ) : null}
                        <View style={styles.expandRow}>
                          <Text style={[styles.expandLabel, { color: roleColor }]}>
                            {expanded ? t(`${NS}.collapse`) : t(`${NS}.expand`)}
                          </Text>
                          <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={roleColor} />
                        </View>
                      </Card.Content>
                    </Pressable>
                    {expanded ? (
                      <Card.Content style={styles.itemsBox}>
                        <Text style={styles.itemsHeading}>{t(`${NS}.itemsHeading`, { count: items.length })}</Text>
                        {items.map(renderPrescriptionItem)}
                        {item.prescriptionDate ? (
                          <Text style={styles.itemMeta}>{t(`${NS}.prescribedOn`, { date: vnDate(item.prescriptionDate) })}</Text>
                        ) : null}
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
            <Button mode="contained" buttonColor={roleColor} onPress={() => handleMarkTaken(confirmDialog!)}>{t('common.confirm')}</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={!!missedDialog} onDismiss={() => setMissedDialog(null)}>
          <Dialog.Title>{t(`${NS}.confirmMissedTitle`)}</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: 8, color: colors.textSecondary }}>{t(`${NS}.confirmMissedIrreversible`)}</Text>
            <View style={styles.reasonRow}>
              {MISSED_REASONS.map((r) => (
                <Chip
                  key={r.value}
                  selected={missedReason === r.value}
                  onPress={() => setMissedReason(r.value)}
                  compact
                  style={missedReason === r.value ? { backgroundColor: semantic.dangerSoft } : undefined}
                  textStyle={missedReason === r.value ? { color: semantic.danger } : undefined}
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
            <Button mode="contained" buttonColor={semantic.danger} onPress={handleMarkMissed}>{t('common.confirm')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const createStyles = (c: AppColors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.background },
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 8 },
  searchBar: { paddingHorizontal: 16, paddingTop: 8 },
  dateBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingTop: 8 },
  dateArrow: { margin: 0 },
  dateLabelWrap: { flex: 1 },
  todayBtnRow: { alignItems: 'center', paddingBottom: 2 },
  filterRow: { flexDirection: 'row', gap: 6, padding: 12, paddingBottom: 4, flexWrap: 'wrap' },
  chip: { borderRadius: 20 },
  list: { padding: 16, paddingBottom: 32 },
  medCard: { borderRadius: 12, marginBottom: 8, backgroundColor: c.surface, overflow: 'hidden' },
  medRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  medInfo: { flex: 1 },
  medName: { fontSize: 14, fontWeight: '600', color: c.text },
  medDosage: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
  timingTag: { fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  medNotes: { fontSize: 11, color: c.textSecondary, marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  actionBtn: { flex: 1, borderRadius: 8 },
  reasonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  groupSection: { marginBottom: 16 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  groupName: { fontSize: 14, fontWeight: '600', color: c.text },
  groupRoom: { fontSize: 12, color: c.textSecondary, marginLeft: 'auto' },

  // Thẻ đơn thuốc
  rxHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rxResident: { flex: 1, fontSize: 15, fontWeight: '700', color: c.text },
  rxStatus: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  rxDiagnosis: { fontSize: 13, color: c.text, marginTop: 4, lineHeight: 18 },
  expandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2, marginTop: 6 },
  expandLabel: { fontSize: 12, fontWeight: '600' },
  itemsBox: { paddingTop: 8, borderTopWidth: 1, borderTopColor: c.border },
  itemsHeading: { fontSize: 12, fontWeight: '700', color: c.textSecondary, marginBottom: 6 },
  itemRow: { paddingVertical: 6, borderTopWidth: 1, borderTopColor: c.divider },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemName: { flex: 1, fontSize: 13, fontWeight: '600', color: c.text },
  prnTag: { fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  itemMeta: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
  itemNote: { fontSize: 12, color: c.textSecondary, marginTop: 3, lineHeight: 17 },
});
