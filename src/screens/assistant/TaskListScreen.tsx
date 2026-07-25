import React, { useState } from 'react';
import { View, SectionList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Chip, Checkbox, FAB, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useCaregiverTasks, useUpdateTaskStatus } from '../../hooks/useTasks';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { useToast } from '../../utils/toast';
import { getStatusEntry } from '../../utils/statusMap';

const COLOR = '#6B4200';
const NS = 'assistant.taskList';
const today = () => new Date().toISOString().split('T')[0];

export const TaskListScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { t } = useTranslation();
  const [filter, setFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const TASK_TYPE_FILTERS = [
    { value: '', label: t(`${NS}.filterAll`) },
    { value: 'morning_care', label: t('status.morning_care') },
    { value: 'meal_assistance', label: t('status.meal_assistance') },
    { value: 'physical_therapy', label: t('status.physical_therapy') },
    { value: 'evening_check', label: t('status.evening_check') },
    { value: 'medication', label: t('status.medication') },
  ];

  const taskTypeLabel = (type?: string) => {
    const entry = getStatusEntry(type);
    return entry.i18nKey ? t(entry.i18nKey, { defaultValue: type?.replace(/_/g, ' ') }) : type?.replace(/_/g, ' ');
  };

  const params = { workDate: today(), taskType: filter || undefined };
  const tasksQ = useCaregiverTasks(params);
  const updateStatus = useUpdateTaskStatus();
  const tasks = tasksQ.data?.data ?? tasksQ.data ?? [];

  const grouped = tasks.reduce((acc: Record<string, any[]>, tk: any) => {
    const key = tk.taskType ?? 'other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(tk);
    return acc;
  }, {});

  const sections = Object.entries(grouped).map(([key, data]) => ({
    title: taskTypeLabel(key),
    data: data as any[],
  }));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleBulkComplete = async () => {
    try {
      await Promise.all(
        selectedIds.map((id) => updateStatus.mutateAsync({ id, status: 'completed', isCaregiver: true })),
      );
      toast(t(`${NS}.toastCompleted`, { count: selectedIds.length }), 'success');
      setSelectedIds([]);
    } catch {
      toast(t(`${NS}.toastError`), 'error');
    }
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation?.goBack()} style={styles.backBtn} />
        <View>
          <Text style={styles.topTitle}>{t(`${NS}.title`)}</Text>
          <Text style={styles.topSub}>{today()}</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {TASK_TYPE_FILTERS.map((f) => (
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
        emptyMessage={t(`${NS}.empty`)}
      >
        <SectionList
          sections={sections}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={tasksQ.refetch} tintColor={COLOR} />}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionTitle}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <View style={styles.taskRow}>
              <Checkbox
                status={selectedIds.includes(item._id) ? 'checked' : (item.status === 'completed' ? 'checked' : 'unchecked')}
                onPress={() => item.status !== 'completed' && toggleSelect(item._id)}
                color={COLOR}
                disabled={item.status === 'completed'}
              />
              <View style={styles.taskInfo}>
                <Text style={styles.taskTitle} numberOfLines={1}>
                  {taskTypeLabel(item.taskType)}
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

      {selectedIds.length > 0 ? (
        <FAB
          label={t(`${NS}.completeCount`, { count: selectedIds.length })}
          icon="check-all"
          onPress={handleBulkComplete}
          style={[styles.fab, { backgroundColor: COLOR }]}
          color="#fff"
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 8, paddingBottom: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center' },
  backBtn: { margin: 0 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  topSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: 6, padding: 12, flexWrap: 'wrap' },
  chip: { borderRadius: 20 },
  list: { padding: 16, paddingBottom: 80 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: COLOR, marginTop: 12, marginBottom: 6, textTransform: 'capitalize' },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    paddingRight: 12,
    marginBottom: 6,
    gap: 4,
  },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 13, fontWeight: '500', color: '#111827' },
  taskSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  fab: { position: 'absolute', bottom: 16, right: 16 },
});
