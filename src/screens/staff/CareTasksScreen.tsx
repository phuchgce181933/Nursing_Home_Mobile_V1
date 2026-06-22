import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Chip, Card, Button, Dialog, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { CARE_TASKS } from '../../api/endpoints';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { getStatusEntry } from '../../utils/statusMap';
import { useToast } from '../../utils/toast';

const COLOR = '#0F5040';
const today = () => new Date().toISOString().split('T')[0];

const FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ' },
  { value: 'in_progress', label: 'Đang làm' },
  { value: 'completed', label: 'Xong' },
  { value: 'skipped', label: 'Bỏ qua' },
];

const NEXT_STATUS: Record<string, string> = {
  pending: 'in_progress',
  in_progress: 'completed',
};

export const CareTasksScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');
  const [actionTask, setActionTask] = useState<any>(null);

  const tasksQ = useQuery({
    queryKey: ['staffCareTasks', { workDate: today(), status: filter || undefined }],
    queryFn: async () => {
      const res = await api.get(CARE_TASKS.LIST, { params: { workDate: today(), status: filter || undefined } });
      return res.data;
    },
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.put(CARE_TASKS.UPDATE_STATUS(id), { status });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staffCareTasks'] });
    },
  });

  const tasks = tasksQ.data?.data ?? tasksQ.data ?? [];
  const completedCount = tasks.filter((t: any) => t.status === 'completed').length;

  const handleUpdateStatus = async (status: string) => {
    if (!actionTask) return;
    try {
      await updateMut.mutateAsync({ id: actionTask._id, status });
      toast(status === 'completed' ? 'Đã hoàn thành nhiệm vụ' : 'Đã cập nhật trạng thái', 'success');
    } catch {
      toast('Không thể cập nhật. Thử lại.', 'error');
    } finally {
      setActionTask(null);
    }
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Nhiệm vụ chăm sóc</Text>
        <Text style={styles.topSub}>{today()} · {completedCount}/{tasks.length} hoàn thành</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
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
          renderItem={({ item }) => {
            const entry = getStatusEntry(item.taskType);
            const canProgress = !!NEXT_STATUS[item.status];
            return (
              <Card style={styles.card} mode="outlined" onPress={() => canProgress && setActionTask(item)}>
                <Card.Content style={styles.cardRow}>
                  <View style={[styles.iconBox, { backgroundColor: entry.bgColor }]}>
                    <MaterialCommunityIcons name={(entry.icon || 'clipboard-text-outline') as any} size={20} color={entry.textColor} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {entry.label || item.taskType?.replace(/_/g, ' ') || 'Nhiệm vụ'}
                    </Text>
                    <Text style={styles.cardSub} numberOfLines={1}>
                      {item.residentId?.fullName ?? ''} · {item.scheduledTime ?? ''}
                    </Text>
                    {item.notes ? <Text style={styles.cardNotes} numberOfLines={1}>{item.notes}</Text> : null}
                  </View>
                  <StatusBadge status={item.status} size="sm" />
                </Card.Content>
              </Card>
            );
          }}
        />
      </ScreenLayout>

      <Portal>
        <Dialog visible={!!actionTask} onDismiss={() => setActionTask(null)}>
          <Dialog.Title>Cập nhật nhiệm vụ</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: '#374151', fontWeight: '500', marginBottom: 4 }}>
              {actionTask?.taskType?.replace(/_/g, ' ')}
            </Text>
            <Text style={{ color: '#6B7280', fontSize: 13 }}>
              {actionTask?.residentId?.fullName} · {actionTask?.scheduledTime}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setActionTask(null)}>Đóng</Button>
            {actionTask?.status === 'pending' && (
              <Button mode="contained" buttonColor="#1E40AF" onPress={() => handleUpdateStatus('in_progress')}>
                Bắt đầu
              </Button>
            )}
            {(actionTask?.status === 'pending' || actionTask?.status === 'in_progress') && (
              <Button mode="contained" buttonColor={COLOR} onPress={() => handleUpdateStatus('completed')}>
                Hoàn thành
              </Button>
            )}
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  topSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: 6, padding: 12, paddingBottom: 4, flexWrap: 'wrap' },
  chip: { borderRadius: 20 },
  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '500', color: '#111827', textTransform: 'capitalize' },
  cardSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  cardNotes: { fontSize: 11, color: '#9CA3AF', marginTop: 2, fontStyle: 'italic' },
});
