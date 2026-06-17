import React from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Checkbox, ProgressBar } from 'react-native-paper';
import { useAuth } from '../../auth/useAuth';
import { RoleHeader } from '../../components/layout/RoleHeader';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { useCaregiverTasks, useUpdateTaskStatus } from '../../hooks/useTasks';
import { useToast } from '../../utils/toast';
import { useQueryClient } from '@tanstack/react-query';

const COLOR = '#0F5040';
const today = () => new Date().toISOString().split('T')[0];

export const NurseDashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const tasksQ = useCaregiverTasks({ workDate: today() });
  const updateStatus = useUpdateTaskStatus();

  const tasks = tasksQ.data?.data ?? tasksQ.data ?? [];
  const completedCount = tasks.filter((t: any) => t.status === 'completed').length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  const handleToggle = async (task: any) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const prevData = qc.getQueryData(['caregiverTasks', { workDate: today() }]);
    qc.setQueryData(['caregiverTasks', { workDate: today() }], (old: any) => {
      if (!old) return old;
      const list = old.data ?? old;
      const updated = list.map((t: any) => t._id === task._id ? { ...t, status: newStatus } : t);
      return old.data ? { ...old, data: updated } : updated;
    });
    try {
      await updateStatus.mutateAsync({ id: task._id, status: newStatus, isCaregiver: true });
    } catch {
      qc.setQueryData(['caregiverTasks', { workDate: today() }], prevData);
      toast('Không thể cập nhật. Thử lại.', 'error');
    }
  };

  return (
    <View style={styles.flex}>
      <RoleHeader
        title="Nhiệm vụ hôm nay"
        subtitle={`${user?.fullName ?? ''} · Y tá`}
        stats={[
          { value: totalCount, label: 'Tổng' },
          { value: completedCount, label: 'Hoàn thành' },
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
          ListFooterComponent={
            <View style={styles.progressSection}>
              <ProgressBar progress={progress} color={COLOR} style={styles.progressBar} />
              <Text style={styles.progressText}>{completedCount}/{totalCount} nhiệm vụ</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.taskRow}>
              <Checkbox
                status={item.status === 'completed' ? 'checked' : 'unchecked'}
                onPress={() => handleToggle(item)}
                color={COLOR}
              />
              <View style={styles.taskInfo}>
                <Text style={[styles.taskTitle, item.status === 'completed' && styles.taskDone]} numberOfLines={1}>
                  {item.taskType?.replace(/_/g, ' ') ?? 'Task'}
                </Text>
                <Text style={styles.taskSub} numberOfLines={1}>
                  {item.residentId?.fullName ?? ''} · {item.scheduledTime}
                </Text>
              </View>
              <StatusBadge status={item.status} size="sm" />
            </View>
          )}
        />
      </ScreenLayout>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  list: { padding: 16, paddingBottom: 32 },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 14, fontWeight: '500', color: '#111827', textTransform: 'capitalize' },
  taskDone: { textDecorationLine: 'line-through', color: '#9CA3AF' },
  taskSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  progressSection: { marginTop: 16, paddingHorizontal: 4 },
  progressBar: { borderRadius: 4, height: 8 },
  progressText: { fontSize: 12, color: '#6B7280', marginTop: 4, textAlign: 'center' },
});
