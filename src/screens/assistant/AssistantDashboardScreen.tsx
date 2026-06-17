import React from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../auth/useAuth';
import { RoleHeader } from '../../components/layout/RoleHeader';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { useCaregiverTasks } from '../../hooks/useTasks';
import { getStatusEntry } from '../../utils/statusMap';

const COLOR = '#6B4200';
const today = () => new Date().toISOString().split('T')[0];

const STATUS_ICON: Record<string, { name: string; color: string }> = {
  completed: { name: 'check-circle', color: '#065F46' },
  in_progress: { name: 'progress-clock', color: '#92400E' },
  pending: { name: 'clock-outline', color: '#92400E' },
  skipped: { name: 'close-circle', color: '#991B1B' },
  missed: { name: 'alert-circle', color: '#991B1B' },
};

export const AssistantDashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const tasksQ = useCaregiverTasks({ workDate: today() });
  const tasks = tasksQ.data?.data ?? tasksQ.data ?? [];

  const completedCount = tasks.filter((t: any) => t.status === 'completed').length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  return (
    <View style={styles.flex}>
      <RoleHeader
        title="Công việc hôm nay"
        subtitle={`${user?.fullName ?? ''} · Hộ lý`}
        stats={[
          { value: totalCount, label: 'Tổng' },
          { value: completedCount, label: 'Xong' },
          { value: totalCount - completedCount, label: 'Còn lại' },
        ]}
        roleColor={COLOR}
      />

      <ScreenLayout
        loading={tasksQ.isLoading}
        error={tasksQ.error ? (tasksQ.error as Error).message : null}
        onRetry={tasksQ.refetch}
        isEmpty={tasks.length === 0}
        emptyMessage="Không có nhiệm vụ nào hôm nay"
      >
        <FlatList
          data={tasks}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={tasksQ.refetch} tintColor={COLOR} />}
          ListHeaderComponent={
            <View style={styles.progressSection}>
              <ProgressBar progress={progress} color={COLOR} style={styles.progressBar} />
              <Text style={styles.progressText}>
                {Math.round(progress * 100)}% hoàn thành · {completedCount}/{totalCount}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const iconCfg = STATUS_ICON[item.status] ?? STATUS_ICON.pending;
            return (
              <View style={styles.taskRow}>
                <MaterialCommunityIcons name={iconCfg.name as any} size={24} color={iconCfg.color} />
                <View style={styles.taskInfo}>
                  <Text style={styles.taskTitle} numberOfLines={1}>
                    {getStatusEntry(item.taskType)?.label ?? item.taskType?.replace(/_/g, ' ')}
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
