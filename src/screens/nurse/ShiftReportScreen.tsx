import React from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useShifts } from '../../hooks/useShifts';
import { useManagerTasks } from '../../hooks/useTasks';
import { useIncidents } from '../../hooks/useIncidents';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { StatusBadge } from '../../components/shared/StatusBadge';

const COLOR = '#1B3A6B';
const today = () => new Date().toISOString().split('T')[0];

export const ShiftReportScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const shiftsQ = useShifts({ fromDate: today(), toDate: today() });
  const tasksQ = useManagerTasks({ workDate: today() });
  const incidentsQ = useIncidents({ status: 'open' });

  const shifts = shiftsQ.data?.data?.data ?? [];
  const tasks = tasksQ.data?.data ?? [];
  const incidents = incidentsQ.data?.items ?? [];

  const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const activeIncidents = incidents.length;

  const loading = shiftsQ.isLoading || tasksQ.isLoading;
  const error = shiftsQ.error || tasksQ.error;

  const refetch = () => {
    shiftsQ.refetch();
    tasksQ.refetch();
    incidentsQ.refetch();
  };

  const stats = [
    { label: 'Ca hôm nay', value: shifts.length, icon: 'calendar-clock' as const, color: '#1E40AF' },
    { label: 'Nhiệm vụ hoàn thành', value: `${completedTasks}/${totalTasks}`, icon: 'check-circle-outline' as const, color: '#065F46' },
    { label: 'Sự cố mở', value: activeIncidents, icon: 'alert-circle-outline' as const, color: '#991B1B' },
    { label: 'Nhân viên', value: new Set(shifts.map((s: any) => typeof s.assignedStaffId === 'object' ? s.assignedStaffId?._id : s.assignedStaffId)).size, icon: 'account-group-outline' as const, color: '#92400E' },
  ];

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Báo cáo ca</Text>
        <Text style={styles.topSub}>{today()}</Text>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={COLOR} />}
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

          <SectionHeader title="Sự kiện trong ca" roleColor={COLOR} />
          {tasks.filter((t: any) => t.status !== 'pending').slice(0, 20).map((t: any) => (
            <View key={t._id} style={styles.eventRow}>
              <StatusBadge status={t.status} size="sm" />
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle} numberOfLines={1}>
                  {t.taskType ? t.taskType.replace(/_/g, ' ') : 'Task'} — {t.residentId?.fullName ?? ''}
                </Text>
                <Text style={styles.eventTime}>{t.scheduledTime}</Text>
              </View>
            </View>
          ))}

          {tasks.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có sự kiện nào</Text>
          ) : null}
        </ScreenLayout>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  topSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  body: { padding: 16, paddingBottom: 32 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { width: '48%', borderRadius: 12 },
  statContent: { alignItems: 'center', paddingVertical: 12 },
  statValue: { fontSize: 20, fontWeight: '700', marginTop: 4 },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 13, color: '#111827' },
  eventTime: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 24 },
});
