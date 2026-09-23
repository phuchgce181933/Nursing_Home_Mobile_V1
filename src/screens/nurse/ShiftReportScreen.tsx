import React, { useMemo } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useShifts } from '../../hooks/useShifts';
import { useManagerTasks } from '../../hooks/useTasks';
import { useIncidents } from '../../hooks/useIncidents';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { useAppTheme } from '../../theme/useAppTheme';
import type { AppColors } from '../../constants/theme';
import { formatLocalDate } from '../../utils/date';
import { useStatusLabel } from '../../utils/statusMap';

const NS = 'nurse.shiftReport';
const today = () => formatLocalDate(new Date());

export const ShiftReportScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const statusLabel = useStatusLabel();
  const { colors, roleColor } = useAppTheme('nurse');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const shiftsQ = useShifts({ fromDate: today(), toDate: today() });
  const tasksQ = useManagerTasks({ workDate: today() });
  const incidentsQ = useIncidents({ status: 'open' });

  const shifts = shiftsQ.data?.data?.data ?? [];
  const tasks = tasksQ.data?.data ?? [];
  const incidents = incidentsQ.data?.items ?? [];

  const completedTasks = tasks.filter((tk: any) => tk.status === 'completed').length;
  const totalTasks = tasks.length;
  const activeIncidents = incidents.length;

  const loading = shiftsQ.isLoading || tasksQ.isLoading;
  const error = shiftsQ.error || tasksQ.error;

  const refetch = () => {
    shiftsQ.refetch();
    tasksQ.refetch();
    incidentsQ.refetch();
  };
  const isFetching = shiftsQ.isFetching || tasksQ.isFetching || incidentsQ.isFetching;

  const stats = [
    { label: t(`${NS}.shiftsToday`), value: shifts.length, icon: 'calendar-clock' as const, color: '#1E40AF' },
    { label: t(`${NS}.tasksCompleted`), value: `${completedTasks}/${totalTasks}`, icon: 'check-circle-outline' as const, color: '#065F46' },
    { label: t(`${NS}.openIncidents`), value: activeIncidents, icon: 'alert-circle-outline' as const, color: '#991B1B' },
    { label: t(`${NS}.staffCount`), value: new Set(shifts.map((s: any) => typeof s.assignedStaffId === 'object' ? s.assignedStaffId?._id : s.assignedStaffId)).size, icon: 'account-group-outline' as const, color: '#92400E' },
  ];

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8, backgroundColor: roleColor }]}>
        <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation?.goBack()} style={styles.backBtn} />
        <View>
          <Text style={styles.topTitle}>{t(`${NS}.title`)}</Text>
          <Text style={styles.topSub}>{today()}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={roleColor} />}
      >
        <ScreenLayout loading={loading} error={error ? (error as Error).message : null} onRetry={refetch}>
          <View style={styles.statsGrid}>
            {stats.map((s, i) => (
              <Card key={i} style={styles.statCard}>
                <Card.Content style={styles.statContent}>
                  <MaterialCommunityIcons name={s.icon} size={24} color={s.color} />
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </Card.Content>
              </Card>
            ))}
          </View>

          <SectionHeader title={t(`${NS}.eventsTitle`)} roleColor={roleColor} />
          {tasks.filter((tk: any) => tk.status !== 'pending').slice(0, 20).map((tk: any) => (
            <View key={tk._id} style={styles.eventRow}>
              <StatusBadge status={tk.status} size="sm" />
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle} numberOfLines={1}>
                  {statusLabel(tk.taskType, t('nurse.careTasks.defaultTitle'))} — {tk.residentId?.fullName ?? ''}
                </Text>
                <Text style={styles.eventTime}>{tk.scheduledTime}</Text>
              </View>
            </View>
          ))}

          {tasks.length === 0 ? (
            <Text style={styles.emptyText}>{t(`${NS}.empty`)}</Text>
          ) : null}
        </ScreenLayout>
      </ScrollView>
    </View>
  );
};

const createStyles = (c: AppColors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.background },
  topBar: { paddingHorizontal: 8, paddingBottom: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center' },
  backBtn: { margin: 0 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  topSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  body: { padding: 16, paddingBottom: 32 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { width: '48%', borderRadius: 12 },
  statContent: { alignItems: 'center', paddingVertical: 12 },
  statValue: { fontSize: 20, fontWeight: '700', marginTop: 4 },
  statLabel: { fontSize: 11, color: c.textSecondary, marginTop: 2 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 13, color: c.text },
  eventTime: { fontSize: 11, color: c.textMuted, marginTop: 2 },
  emptyText: { fontSize: 13, color: c.textMuted, textAlign: 'center', paddingVertical: 24 },
});
