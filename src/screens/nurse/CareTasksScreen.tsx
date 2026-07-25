import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip, Button, Dialog, Portal, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { CARE_TASKS } from '../../api/endpoints';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { useToast } from '../../utils/toast';

const COLOR = '#0F5040';
const NS = 'nurse.careTasks';

export const CareTasksScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [filter, setFilter] = useState('');
  const [actionTask, setActionTask] = useState<any>(null);

  const STATUS_FILTERS = [
    { value: '', label: t(`${NS}.filterAll`) },
    { value: 'pending', label: t(`${NS}.filterPending`) },
    { value: 'in_progress', label: t(`${NS}.filterInProgress`) },
    { value: 'completed', label: t(`${NS}.filterCompleted`) },
    { value: 'skipped', label: t(`${NS}.filterSkipped`) },
  ];

  const today = new Date().toISOString().split('T')[0];
  const tasksQ = useQuery({
    queryKey: ['nurseTasks', filter, today],
    queryFn: async () => {
      const res = await api.get(CARE_TASKS.LIST, { params: { workDate: today, status: filter || undefined } });
      return res.data;
    },
  });
  const items = tasksQ.data?.data ?? tasksQ.data ?? [];

  const updateMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.put(CARE_TASKS.UPDATE_STATUS(id), { status });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nurseTasks'] });
      setActionTask(null);
      toast(t(`${NS}.toastUpdated`), 'success');
    },
    onError: () => toast(t(`${NS}.toastError`), 'error'),
  });

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <View style={styles.topRow}>
          <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation.goBack()} />
          <Text style={styles.topTitle}>{t(`${NS}.title`)}</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(f => (
          <Chip key={f.value} selected={filter === f.value} onPress={() => setFilter(f.value)}
            style={filter === f.value ? { backgroundColor: COLOR } : undefined}
            textStyle={filter === f.value ? { color: '#fff' } : undefined} compact>{f.label}</Chip>
        ))}
      </View>

      <ScreenLayout loading={tasksQ.isLoading} error={tasksQ.error ? (tasksQ.error as Error).message : null}
        onRetry={tasksQ.refetch} isEmpty={items.length === 0} emptyMessage={t(`${NS}.empty`)}>
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={tasksQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined" onPress={() => setActionTask(item)}>
              <Card.Content>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{item.taskType ?? item.title ?? t(`${NS}.defaultTitle`)}</Text>
                    <Text style={styles.resident}>{item.residentId?.fullName ?? ''}</Text>
                    <View style={styles.timeRow}>
                      <MaterialCommunityIcons name="clock-outline" size={14} color="#6B7280" />
                      <Text style={styles.time}>
                        {item.scheduledTime ? new Date(item.scheduledTime).toLocaleString('vi-VN') : item.date ? new Date(item.date).toLocaleDateString('vi-VN') : ''}
                      </Text>
                    </View>
                    {item.notes ? <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text> : null}
                  </View>
                  <StatusBadge status={item.status} size="sm" />
                </View>
              </Card.Content>
            </Card>
          )} />
      </ScreenLayout>

      <Portal>
        <Dialog visible={!!actionTask} onDismiss={() => setActionTask(null)} style={{ borderRadius: 16 }}>
          <Dialog.Title>{actionTask?.taskType ?? t(`${NS}.defaultTitle`)}</Dialog.Title>
          <Dialog.Content>
            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>{t(`${NS}.residentLabel`, { name: actionTask?.residentId?.fullName ?? '--' })}</Text>
            {actionTask?.notes ? <Text style={{ fontSize: 13, color: '#374151', marginBottom: 8 }}>{actionTask.notes}</Text> : null}
            <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{t(`${NS}.statusLabel`, { status: actionTask?.status })}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setActionTask(null)}>{t('common.close')}</Button>
            {actionTask?.status === 'pending' && (
              <Button mode="contained" buttonColor="#1565C0" onPress={() => updateMut.mutate({ id: actionTask._id, status: 'in_progress' })}
                loading={updateMut.isPending}>{t(`${NS}.start`)}</Button>
            )}
            {(actionTask?.status === 'pending' || actionTask?.status === 'in_progress') && (
              <Button mode="contained" buttonColor={COLOR} onPress={() => updateMut.mutate({ id: actionTask._id, status: 'completed' })}
                loading={updateMut.isPending}>{t(`${NS}.complete`)}</Button>
            )}
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 4, paddingBottom: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  filterRow: { flexDirection: 'row', gap: 6, padding: 12, flexWrap: 'wrap' },
  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: '600', color: '#111827', textTransform: 'capitalize' },
  resident: { fontSize: 12, color: COLOR, marginTop: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  time: { fontSize: 12, color: '#6B7280' },
  notes: { fontSize: 12, color: '#374151', marginTop: 4 },
});
