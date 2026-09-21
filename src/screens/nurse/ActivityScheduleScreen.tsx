import React, { useState, useEffect, useMemo } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip, Dialog, Portal, Button, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useActivities, useActivityDetail, useRecordActivityParticipation } from '../../hooks/useActivities';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { BackHeader } from '../../components/layout/BackHeader';
import { useToast } from '../../utils/toast';
import { useAppTheme } from '../../theme/useAppTheme';
import type { AppColors } from '../../constants/theme';

const NS = 'nurse.activities';

type AttendanceState = { status: string; note: string };
type ParticipationState = { participationLevel: string; comment: string; incident: string };

export const ActivityScheduleScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const toast = useToast();
  const { t } = useTranslation();
  const { colors, roleColor } = useAppTheme('nurse');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [filter, setFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Record<string, AttendanceState>>({});
  const [participation, setParticipation] = useState<Record<string, ParticipationState>>({});
  const [overallNotes, setOverallNotes] = useState('');

  const STATUS_FILTERS = [
    { value: '', label: t('common.all') },
    { value: 'scheduled', label: t(`${NS}.filterScheduled`) },
    { value: 'ongoing', label: t(`${NS}.filterOngoing`) },
    { value: 'completed', label: t(`${NS}.filterCompleted`) },
    { value: 'cancelled', label: t(`${NS}.filterCancelled`) },
  ];

  const ATTENDANCE_OPTIONS = [
    { value: 'present', label: t('status.present') },
    { value: 'absent', label: t('status.absent') },
    { value: 'late', label: t('status.late') },
    { value: 'left_early', label: t('status.left_early') },
  ];

  const PARTICIPATION_OPTIONS = [
    { value: 'active', label: t('status.active') },
    { value: 'partial', label: t('status.partial') },
    { value: 'passive', label: t('status.passive') },
  ];

  const activitiesQ = useActivities({ status: filter || undefined });
  const items = activitiesQ.data?.data ?? activitiesQ.data ?? [];

  const detailQ = useActivityDetail(selectedId ?? undefined);
  const detail = detailQ.data?.data ?? detailQ.data;
  const recordMut = useRecordActivityParticipation();

  useEffect(() => {
    if (!detail) return;
    const nextAttendance: Record<string, AttendanceState> = {};
    const nextParticipation: Record<string, ParticipationState> = {};
    (detail.participants ?? []).forEach((p: any) => {
      const rid = p.residentId?._id ?? p.residentId ?? p._id;
      if (!rid) return;
      const existingAttendance = (detail.attendanceRecords ?? []).find((a: any) => (a.residentId?._id ?? a.residentId) === rid);
      const existingParticipation = (detail.participationRecords ?? []).find((a: any) => (a.residentId?._id ?? a.residentId) === rid);
      nextAttendance[rid] = { status: existingAttendance?.status ?? 'present', note: existingAttendance?.note ?? '' };
      nextParticipation[rid] = {
        participationLevel: existingParticipation?.participationLevel ?? 'active',
        comment: existingParticipation?.comment ?? '',
        incident: existingParticipation?.incident ?? '',
      };
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrates the editable form from the freshly-fetched activity whenever selection changes
    setAttendance(nextAttendance);
    setParticipation(nextParticipation);
    setOverallNotes(detail.participantResultNotes ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed on the activity id, not the (unstable) query object identity
  }, [detail?._id]);

  const now = new Date();
  const activityStatus = String(detail?.status ?? '').toLowerCase();
  const startAt = detail?.startAt ? new Date(detail.startAt) : detail?.scheduledAt ? new Date(detail.scheduledAt) : null;
  const endAt = detail?.endAt ? new Date(detail.endAt) : null;
  const canRecord = !!detail && !['draft', 'cancelled', 'completed'].includes(activityStatus)
    && !!startAt && !!endAt && now >= startAt && now <= endAt;

  const handleSaveAttendance = () => {
    if (!selectedId) return;
    recordMut.mutate({
      id: selectedId,
      participantResultNotes: overallNotes || undefined,
      attendanceRecords: Object.entries(attendance).map(([residentId, v]) => ({ residentId, status: v.status, note: v.note || undefined })),
      participationRecords: Object.entries(participation).map(([residentId, v]) => ({
        residentId, participationLevel: v.participationLevel, comment: v.comment || undefined, incident: v.incident || undefined,
      })),
    }, {
      onSuccess: () => toast(t(`${NS}.toastAttendanceSaved`), 'success'),
      onError: (e: any) => toast(e.response?.data?.message ?? t(`${NS}.toastAttendanceError`), 'error'),
    });
  };

  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.title`)} color={roleColor} onBack={() => navigation.goBack()} />

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(f => (
          <Chip key={f.value} selected={filter === f.value} onPress={() => setFilter(f.value)}
            style={filter === f.value ? { backgroundColor: roleColor } : undefined}
            textStyle={filter === f.value ? { color: '#fff' } : undefined} compact>{f.label}</Chip>
        ))}
      </View>

      <ScreenLayout loading={activitiesQ.isLoading} error={activitiesQ.error ? (activitiesQ.error as Error).message : null}
        onRetry={activitiesQ.refetch} isEmpty={items.length === 0} emptyMessage={t(`${NS}.title`)}>
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={activitiesQ.isFetching} onRefresh={activitiesQ.refetch} tintColor={roleColor} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined" onPress={() => setSelectedId(item._id)}>
              <Card.Content>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{item.title}</Text>
                    {item.category ? <Text style={[styles.category, { color: roleColor }]}>{item.category}</Text> : null}
                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="calendar-outline" size={14} color="#6B7280" />
                      <Text style={styles.info}>
                        {item.scheduledAt ? new Date(item.scheduledAt).toLocaleString('vi-VN') : ''}
                      </Text>
                    </View>
                    {item.location ? (
                      <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="map-marker-outline" size={14} color="#6B7280" />
                        <Text style={styles.info}>{item.location}</Text>
                      </View>
                    ) : null}
                    {item.durationMinutes ? (
                      <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="timer-outline" size={14} color="#6B7280" />
                        <Text style={styles.info}>{item.durationMinutes} {t(`${NS}.minutes`)}</Text>
                      </View>
                    ) : null}
                    {item.participants?.length > 0 && (
                      <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="account-group-outline" size={14} color="#6B7280" />
                        <Text style={styles.info}>{t(`${NS}.participants`, { count: item.participants.length })}</Text>
                      </View>
                    )}
                  </View>
                  <StatusBadge status={item.status} size="sm" />
                </View>
              </Card.Content>
            </Card>
          )} />
      </ScreenLayout>

      <Portal>
        <Dialog visible={!!selectedId} onDismiss={() => setSelectedId(null)} style={{ borderRadius: 16 }}>
          <Dialog.Title>{detail?.title ?? t(`${NS}.detailTitle`)}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 520 }}>
            {detail ? (
              <View style={{ padding: 4 }}>
                {detail.category ? <Text style={styles.detailLabel}>{t(`${NS}.category`)}: <Text style={styles.detailValue}>{detail.category}</Text></Text> : null}
                {detail.scheduledAt ? <Text style={styles.detailLabel}>{t(`${NS}.time`)}: <Text style={styles.detailValue}>{new Date(detail.scheduledAt).toLocaleString('vi-VN')}</Text></Text> : null}
                {detail.location ? <Text style={styles.detailLabel}>{t(`${NS}.location`)}: <Text style={styles.detailValue}>{detail.location}</Text></Text> : null}
                {detail.durationMinutes ? <Text style={styles.detailLabel}>{t(`${NS}.duration`)}: <Text style={styles.detailValue}>{detail.durationMinutes} {t(`${NS}.minutes`)}</Text></Text> : null}
                {detail.description ? <Text style={[styles.detailLabel, { marginTop: 8 }]}>{t(`${NS}.description`)}:{'\n'}<Text style={styles.detailValue}>{detail.description}</Text></Text> : null}

                {detail.participants?.length > 0 && (
                  <>
                    <Text style={[styles.detailLabel, { marginTop: 12, fontWeight: '700' }]}>{t(`${NS}.attendanceTitle`, { count: detail.participants.length })}</Text>
                    {!canRecord ? (
                      <Text style={styles.warning}>{t(`${NS}.attendanceLocked`)}</Text>
                    ) : null}
                    {detail.participants.map((p: any, i: number) => {
                      const rid = p.residentId?._id ?? p.residentId ?? p._id;
                      const name = p.residentId?.fullName ?? p.fullName ?? `${i + 1}`;
                      const att = attendance[rid] ?? { status: 'present', note: '' };
                      const part = participation[rid] ?? { participationLevel: 'active', comment: '', incident: '' };
                      return (
                        <Card key={rid ?? i} style={styles.participantCard} mode="outlined">
                          <Card.Content>
                            <Text style={styles.participantName}>{name}</Text>
                            <View style={styles.chipRow}>
                              {ATTENDANCE_OPTIONS.map(o => (
                                <Chip key={o.value} compact selected={att.status === o.value} disabled={!canRecord}
                                  onPress={() => setAttendance(prev => ({ ...prev, [rid]: { ...att, status: o.value } }))}
                                  style={att.status === o.value ? { backgroundColor: roleColor } : undefined}
                                  textStyle={att.status === o.value ? { color: '#fff' } : undefined}>{o.label}</Chip>
                              ))}
                            </View>
                            <View style={styles.chipRow}>
                              {PARTICIPATION_OPTIONS.map(o => (
                                <Chip key={o.value} compact selected={part.participationLevel === o.value} disabled={!canRecord}
                                  onPress={() => setParticipation(prev => ({ ...prev, [rid]: { ...part, participationLevel: o.value } }))}
                                  style={part.participationLevel === o.value ? { backgroundColor: roleColor } : undefined}
                                  textStyle={part.participationLevel === o.value ? { color: '#fff' } : undefined}>{o.label}</Chip>
                              ))}
                            </View>
                            <TextInput mode="outlined" label={t(`${NS}.comment`)} dense value={part.comment} disabled={!canRecord}
                              onChangeText={v => setParticipation(prev => ({ ...prev, [rid]: { ...part, comment: v } }))}
                              style={styles.smallInput} />
                            <TextInput mode="outlined" label={t(`${NS}.incident`)} dense value={part.incident} disabled={!canRecord}
                              onChangeText={v => setParticipation(prev => ({ ...prev, [rid]: { ...part, incident: v } }))}
                              style={styles.smallInput} />
                          </Card.Content>
                        </Card>
                      );
                    })}

                    <TextInput mode="outlined" label={t(`${NS}.overallComment`)} multiline dense value={overallNotes} disabled={!canRecord}
                      onChangeText={setOverallNotes} style={[styles.smallInput, { marginTop: 8 }]} />
                  </>
                )}
              </View>
            ) : <Text style={{ color: '#9CA3AF' }}>{t('common.loading')}</Text>}
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setSelectedId(null)}>{t('common.close')}</Button>
            {detail?.participants?.length > 0 ? (
              <Button mode="contained" buttonColor={roleColor} disabled={!canRecord} loading={recordMut.isPending}
                onPress={handleSaveAttendance}>{t(`${NS}.saveAttendance`)}</Button>
            ) : null}
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const createStyles = (c: AppColors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.background },
  filterRow: { flexDirection: 'row', gap: 6, padding: 12, flexWrap: 'wrap' },
  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: c.surface },
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: '600', color: c.text },
  category: { fontSize: 12, marginTop: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  info: { fontSize: 12, color: c.textSecondary },
  detailLabel: { fontSize: 13, fontWeight: '500', color: c.textSecondary, marginBottom: 4 },
  detailValue: { fontWeight: '400', color: c.text },
  warning: { fontSize: 12, color: '#991B1B', marginTop: 4, marginBottom: 8, fontStyle: 'italic' },
  participantCard: { marginTop: 8, borderRadius: 10 },
  participantName: { fontSize: 13, fontWeight: '600', color: c.text, marginBottom: 6 },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  smallInput: { marginBottom: 6, backgroundColor: c.surface },
});
