import React from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Text, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/useAuth';
import { RoleHeader } from '../../components/layout/RoleHeader';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { useCaregiverTasks } from '../../hooks/useTasks';
import { getStatusEntry } from '../../utils/statusMap';

const COLOR = '#6B4200';
const NS = 'assistant.dashboard';
const today = () => new Date().toISOString().split('T')[0];

const STATUS_ICON: Record<string, { name: string; color: string }> = {
  completed: { name: 'check-circle', color: '#065F46' },
  in_progress: { name: 'progress-clock', color: '#92400E' },
  pending: { name: 'clock-outline', color: '#92400E' },
  skipped: { name: 'close-circle', color: '#991B1B' },
  missed: { name: 'alert-circle', color: '#991B1B' },
};

const FEATURES = [
  { icon: 'clock-outline', labelKey: 'featureShifts', screen: 'MyShifts', color: '#1565C0' },
  { icon: 'calendar-remove-outline', labelKey: 'featureLeave', screen: 'LeaveRequests', color: '#E65100' },
  { icon: 'account-group-outline', labelKey: 'featureResidents', screen: 'AssignedResidents', color: '#2E7D32' },
  { icon: 'food-apple-outline', labelKey: 'featureDietPlans', screen: 'DietPlans', color: '#F57F17' },
  { icon: 'run', labelKey: 'featureRehab', screen: 'RehabSchedule', color: '#6A1B9A' },
  { icon: 'door-open', labelKey: 'featureRoomStatus', screen: 'RoomStatus', color: '#00838F' },
  { icon: 'heart-pulse', labelKey: 'featureVitals', screen: 'Vitals', color: '#C62828' },
  { icon: 'notebook-outline', labelKey: 'featureCareNotes', screen: 'CareNotes', color: '#00796B' },
  { icon: 'chat-outline', labelKey: 'featureMessages', screen: 'Messages', color: '#00695C' },
  { icon: 'bell-outline', labelKey: 'featureNotifications', screen: 'Notifications', color: '#5D4037' },
];

export const AssistantDashboardScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const tasksQ = useCaregiverTasks({ workDate: today() });
  const tasks = tasksQ.data?.data ?? tasksQ.data ?? [];

  const completedCount = tasks.filter((t: any) => t.status === 'completed').length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  return (
    <View style={styles.flex}>
      <RoleHeader
        title={t(`${NS}.title`)}
        subtitle={t(`${NS}.subtitle`, { name: user?.fullName ?? '' })}
        stats={[
          { value: totalCount, label: t(`${NS}.total`), icon: 'format-list-checks' },
          { value: completedCount, label: t(`${NS}.done`), icon: 'check-circle-outline' },
          { value: totalCount - completedCount, label: t(`${NS}.remaining`), icon: 'clock-outline' },
        ]}
        roleColor={COLOR}
      />

      <ScreenLayout
        loading={tasksQ.isLoading}
        error={tasksQ.error ? (tasksQ.error as Error).message : null}
        onRetry={tasksQ.refetch}
        isEmpty={tasks.length === 0}
        emptyMessage={t(`${NS}.empty`)}
      >
        <FlatList
          data={tasks}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={tasksQ.isFetching} onRefresh={tasksQ.refetch} tintColor={COLOR} />}
          ListHeaderComponent={
            <View>
              <View style={styles.progressSection}>
                <ProgressBar progress={progress} color={COLOR} style={styles.progressBar} />
                <Text style={styles.progressText}>
                  {t(`${NS}.progressText`, { percent: Math.round(progress * 100), done: completedCount, total: totalCount })}
                </Text>
              </View>

              <SectionHeader title={t(`${NS}.featuresTitle`)} roleColor={COLOR} />
              <View style={styles.grid}>
                {FEATURES.map(f => (
                  <Pressable key={f.screen} style={styles.featureCard}
                    onPress={() => navigation?.navigate(f.screen)}>
                    <View style={[styles.featureIcon, { backgroundColor: f.color + '15' }]}>
                      <MaterialCommunityIcons name={f.icon as any} size={26} color={f.color} />
                    </View>
                    <Text style={styles.featureLabel}>{t(`${NS}.${f.labelKey}`)}</Text>
                  </Pressable>
                ))}
              </View>

              <SectionHeader title={t(`${NS}.tasksTitle`)} roleColor={COLOR} />
            </View>
          }
          renderItem={({ item }) => {
            const iconCfg = STATUS_ICON[item.status] ?? STATUS_ICON.pending;
            const entry = getStatusEntry(item.taskType);
            const taskTypeLabel = entry.i18nKey ? t(entry.i18nKey, { defaultValue: item.taskType?.replace(/_/g, ' ') }) : item.taskType?.replace(/_/g, ' ');
            return (
              <View style={styles.taskRow}>
                <MaterialCommunityIcons name={iconCfg.name as any} size={24} color={iconCfg.color} />
                <View style={styles.taskInfo}>
                  <Text style={styles.taskTitle} numberOfLines={1}>
                    {taskTypeLabel}
                  </Text>
                  <Text style={styles.taskSub} numberOfLines={1}>
                    {item.residentId?.fullName ?? ''} · {item.scheduledTime}
                  </Text>
                </View>
                <StatusBadge status={item.status} size="sm" />
              </View>
            );
          }}
        />
      </ScreenLayout>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  list: { padding: 16, paddingBottom: 32 },
  progressSection: { marginBottom: 16 },
  progressBar: { borderRadius: 4, height: 8 },
  progressText: { fontSize: 12, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  featureCard: { width: '30%', alignItems: 'center', gap: 6, paddingVertical: 8 },
  featureIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  featureLabel: { fontSize: 11, fontWeight: '500', color: '#374151', textAlign: 'center' },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 14, fontWeight: '500', color: '#111827', textTransform: 'capitalize' },
  taskSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});
