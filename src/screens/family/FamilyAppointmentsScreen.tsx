import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { CalendarPicker } from '../../components/shared/CalendarPicker';
import { BackHeader } from '../../components/layout/BackHeader';
import { useFamilyAppointments } from '../../hooks/useFamilyAppointments';

const COLOR = '#2E7D32';
const NS = 'family.appointments';
const STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'];

const isUpcoming = (start?: Date | null) => {
  if (!start) return false;
  const diff = start.getTime() - Date.now();
  return diff > 0 && diff < 24 * 60 * 60 * 1000;
};

const staffFullName = (staffRef: any): string | null => staffRef?.userId?.fullName ?? null;

// Read-only port of `src/pages/family/FamilyAppointmentsPage.jsx` — backed by
// `FAMILY.CARE_APPOINTMENTS`, which was already wired into `endpoints.ts` but had no consuming
// screen until now.
export const FamilyAppointmentsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();

  const residentsQ = useQuery({
    queryKey: ['familyResidents'],
    queryFn: async () => { const r = await api.get(FAMILY.RESIDENTS); return r.data; },
  });
  const residents = residentsQ.data?.data ?? residentsQ.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId = selectedId ?? residents[0]?._id;

  const [status, setStatus] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const appointmentsQ = useFamilyAppointments(activeId, {
    status: status ?? undefined,
    from: from ? `${from}T00:00:00.000Z` : undefined,
    to: to ? `${to}T23:59:59.999Z` : undefined,
  });
  const items = appointmentsQ.data?.data ?? appointmentsQ.data ?? [];
  const sorted = [...items].sort((a: any, b: any) =>
    String(b.scheduledStartAt ?? '').localeCompare(String(a.scheduledStartAt ?? '')));

  const total = sorted.length;
  const scheduledCount = sorted.filter((a: any) => a.status === 'scheduled').length;
  const inProgressCount = sorted.filter((a: any) => a.status === 'in_progress').length;
  const completedCount = sorted.filter((a: any) => a.status === 'completed').length;

  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.title`)} color={COLOR} onBack={() => navigation?.goBack()} />

      {residents.length > 1 ? (
        <View style={styles.chipRow}>
          {residents.map((r: any) => (
            <Chip key={r._id} selected={activeId === r._id} onPress={() => setSelectedId(r._id)}
              style={activeId === r._id ? { backgroundColor: COLOR } : undefined}
              textStyle={activeId === r._id ? { color: '#fff' } : undefined} compact>{r.fullName}</Chip>
          ))}
        </View>
      ) : null}

      <View style={styles.filterRow}>
        <Chip selected={status === null} onPress={() => setStatus(null)}
          style={status === null ? { backgroundColor: COLOR } : undefined}
          textStyle={status === null ? { color: '#fff' } : undefined} compact>{t('common.all')}</Chip>
        {STATUSES.map((s) => (
          <Chip key={s} selected={status === s} onPress={() => setStatus(s)}
            style={[styles.chip, status === s ? { backgroundColor: COLOR } : undefined]}
            textStyle={status === s ? { color: '#fff' } : undefined} compact>{t(`${NS}.status_${s}`)}</Chip>
        ))}
      </View>

      <View style={styles.dateRow}>
        <View style={{ flex: 1 }}>
          <CalendarPicker label={t(`${NS}.fromDate`)} value={from} onChange={setFrom} color={COLOR} />
        </View>
        <View style={{ width: 8 }} />
        <View style={{ flex: 1 }}>
          <CalendarPicker label={t(`${NS}.toDate`)} value={to} onChange={setTo} color={COLOR} />
        </View>
      </View>

      <ScreenLayout loading={appointmentsQ.isLoading || residentsQ.isLoading}
        error={appointmentsQ.error ? (appointmentsQ.error as Error).message : null}
        onRetry={() => appointmentsQ.refetch()} isEmpty={!activeId || sorted.length === 0}
        emptyMessage={t(`${NS}.empty`)}>
        {sorted.length > 0 && (
          <View style={styles.statRow}>
            {[
              { label: t(`${NS}.statTotal`), value: total },
              { label: t(`${NS}.status_scheduled`), value: scheduledCount },
              { label: t(`${NS}.status_in_progress`), value: inProgressCount },
              { label: t(`${NS}.status_completed`), value: completedCount },
            ].map((s) => (
              <View key={s.label} style={styles.statTile}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}
        <FlatList data={sorted} keyExtractor={(item: any) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={appointmentsQ.isFetching} onRefresh={() => appointmentsQ.refetch()} tintColor={COLOR} />}
          renderItem={({ item }) => {
            const start = item.scheduledStartAt ? new Date(item.scheduledStartAt) : null;
            const end = item.scheduledEndAt ? new Date(item.scheduledEndAt) : null;
            const doctorName = staffFullName(item.doctorStaffId);
            const nurseName = staffFullName(item.nurseStaffId);
            const upcoming = item.status === 'scheduled' && isUpcoming(start);
            return (
              <Card style={styles.card} mode="outlined">
                <Card.Content style={styles.cardContent}>
                  <View style={styles.dateCol}>
                    <Text style={styles.dateDay}>{start ? String(start.getDate()).padStart(2, '0') : '—'}</Text>
                    <Text style={styles.dateMonth}>
                      {start ? `${String(start.getMonth() + 1).padStart(2, '0')}/${start.getFullYear()}` : ''}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.apptType}>{item.appointmentType || t(`${NS}.defaultType`)}</Text>
                    <Text style={styles.apptTime}>
                      {start && end
                        ? `${start.toLocaleDateString('vi-VN', { weekday: 'long' })} · ${start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
                        : '—'}
                    </Text>
                    {doctorName ? (
                      <Text style={styles.apptStaff}>{nurseName ? `${doctorName} · ${nurseName}` : doctorName}</Text>
                    ) : null}
                    <View style={styles.badgeRow}>
                      <StatusBadge status={item.status} size="sm" />
                      {upcoming ? (
                        <View style={styles.upcomingBadge}>
                          <Text style={styles.upcomingText}>{t(`${NS}.upcoming`)}</Text>
                        </View>
                      ) : null}
                      {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
                    </View>
                  </View>
                </Card.Content>
              </Card>
            );
          }}
        />
      </ScreenLayout>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  chipRow: { flexDirection: 'row', gap: 6, padding: 12, flexWrap: 'wrap' },
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, flexWrap: 'wrap' },
  chip: { marginLeft: 0 },
  dateRow: { flexDirection: 'row', padding: 12 },
  statRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 4, gap: 6 },
  statTile: { flex: 1, backgroundColor: 'rgba(46,125,50,0.08)', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 10, color: '#6B7280', textAlign: 'center' },
  list: { padding: 12, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  cardContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  dateCol: { width: 48, alignItems: 'center' },
  dateDay: { fontSize: 20, fontWeight: '700', color: '#111827' },
  dateMonth: { fontSize: 10, color: '#9CA3AF' },
  apptType: { fontWeight: '600', color: '#111827' },
  apptTime: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  apptStaff: { fontSize: 12, color: '#374151', marginTop: 2 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 6 },
  upcomingBadge: { backgroundColor: 'rgba(255,152,0,0.15)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  upcomingText: { fontSize: 10, color: '#E65100' },
  notes: { fontSize: 11, color: '#9CA3AF' },
});
