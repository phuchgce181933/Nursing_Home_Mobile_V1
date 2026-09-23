import React, { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip, Button, Dialog, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { CARE_TASKS } from '../../api/endpoints';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { BackHeader } from '../../components/layout/BackHeader';
import { useToast } from '../../utils/toast';
import { useAppTheme } from '../../theme/useAppTheme';
import type { AppColors } from '../../constants/theme';
import { formatLocalDate } from '../../utils/date';
import { useStatusLabel } from '../../utils/statusMap';

const NS = 'nurse.careTasks';

/** Một dòng "nhãn — giá trị" trong hộp thoại chi tiết. Giữ gọn cho màn hình Android. */
const DetailRow: React.FC<{
  label: string;
  value?: string | null;
  children?: React.ReactNode;
  styles: ReturnType<typeof createStyles>;
}> = ({ label, value, children, styles }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    {children ?? (
      <Text style={styles.detailValue} numberOfLines={2}>
        {value || '—'}
      </Text>
    )}
  </View>
);

export const CareTasksScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const toast = useToast();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { colors, roleColor } = useAppTheme('nurse');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [filter, setFilter] = useState('');
  const [actionTask, setActionTask] = useState<any>(null);
  const statusLabel = useStatusLabel();

  // taskType là enum backend (morning_care, ...) -> luôn dịch trước khi hiển thị.
  const taskTitle = (task: any) =>
    statusLabel(task?.taskType, task?.title ?? t(`${NS}.defaultTitle`));

  const residentName = (task: any) => task?.residentId?.fullName ?? task?.residentId?.residentCode ?? '';

  // API đã populate residentId.roomId.roomNumber — dùng trực tiếp, không suy diễn.
  const roomText = (task: any) => {
    const num = task?.residentId?.roomId?.roomNumber;
    return num == null || num === '' ? '' : t(`${NS}.roomValue`, { number: num });
  };

  // Chỉ hiện khung giờ ca. Tên ca trong DB là chuỗi kỹ thuật của seed
  // ("[DOCQA] ... 2026-09-20") nên không bao giờ đưa ra UI.
  const shiftText = (task: any) => {
    const shift = task?.shiftId;
    return shift?.startTime && shift?.endTime
      ? t(`${NS}.shiftRange`, { start: shift.startTime, end: shift.endTime })
      : '';
  };

  const STATUS_FILTERS = [
    { value: '', label: t(`${NS}.filterAll`) },
    { value: 'pending', label: t(`${NS}.filterPending`) },
    { value: 'in_progress', label: t(`${NS}.filterInProgress`) },
    { value: 'completed', label: t(`${NS}.filterCompleted`) },
    { value: 'skipped', label: t(`${NS}.filterSkipped`) },
  ];

  const today = formatLocalDate(new Date());
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
      <BackHeader title={t(`${NS}.title`)} color={roleColor} onBack={() => navigation.goBack()} />

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(f => (
          <Chip key={f.value} selected={filter === f.value} onPress={() => setFilter(f.value)}
            style={filter === f.value ? { backgroundColor: roleColor } : undefined}
            textStyle={filter === f.value ? { color: '#fff' } : undefined} compact>{f.label}</Chip>
        ))}
      </View>

      <ScreenLayout loading={tasksQ.isLoading} error={tasksQ.error ? (tasksQ.error as Error).message : null}
        onRetry={tasksQ.refetch} isEmpty={items.length === 0} emptyMessage={t(`${NS}.empty`)}>
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={tasksQ.isFetching} onRefresh={tasksQ.refetch} tintColor={roleColor} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined" onPress={() => setActionTask(item)}>
              <Card.Content>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{taskTitle(item)}</Text>
                    <Text style={[styles.resident, { color: roleColor }]}>{item.residentId?.fullName ?? ''}</Text>
                    <View style={styles.timeRow}>
                      <MaterialCommunityIcons name="clock-outline" size={14} color="#6B7280" />
                      <Text style={styles.time}>
                        {item.scheduledTime ? item.scheduledTime : item.date ? new Date(item.date).toLocaleDateString('vi-VN') : ''}
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
          <Dialog.Title style={styles.dialogTitle}>{t(`${NS}.detailTitle`)}</Dialog.Title>
          <Dialog.Content>
            <DetailRow label={t(`${NS}.fieldTime`)} value={actionTask?.scheduledTime} styles={styles} />
            <DetailRow label={t(`${NS}.fieldResident`)} value={residentName(actionTask)} styles={styles} />
            <DetailRow label={t(`${NS}.fieldRoom`)} value={roomText(actionTask)} styles={styles} />
            <DetailRow label={t(`${NS}.fieldTaskType`)} value={actionTask ? taskTitle(actionTask) : ''} styles={styles} />
            <DetailRow label={t(`${NS}.fieldCareLevel`)} value={statusLabel(actionTask?.careLevel)} styles={styles} />
            <DetailRow label={t(`${NS}.fieldShift`)} value={shiftText(actionTask)} styles={styles} />
            <DetailRow label={t(`${NS}.fieldStatus`)} styles={styles}>
              <StatusBadge status={actionTask?.status} size="sm" />
            </DetailRow>
            <View style={styles.notesBlock}>
              <Text style={styles.detailLabel}>{t(`${NS}.fieldNotes`)}</Text>
              <Text style={styles.notesValue}>{actionTask?.notes?.trim() || t(`${NS}.noNotes`)}</Text>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setActionTask(null)}>{t('common.close')}</Button>
            {actionTask?.status === 'pending' && (
              <Button mode="contained" buttonColor="#1565C0" onPress={() => updateMut.mutate({ id: actionTask._id, status: 'in_progress' })}
                loading={updateMut.isPending}>{t(`${NS}.start`)}</Button>
            )}
            {(actionTask?.status === 'pending' || actionTask?.status === 'in_progress') && (
              <Button mode="contained" buttonColor={roleColor} onPress={() => updateMut.mutate({ id: actionTask._id, status: 'completed' })}
                loading={updateMut.isPending}>{t(`${NS}.complete`)}</Button>
            )}
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
  // Không dùng textTransform: nhãn đã là tiếng Việt viết hoa sẵn đúng chuẩn;
  // 'capitalize' sẽ biến "Chăm sóc buổi sáng" thành "Chăm Sóc Buổi Sáng".
  title: { fontSize: 14, fontWeight: '600', color: c.text },
  resident: { fontSize: 12, marginTop: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  time: { fontSize: 12, color: c.textSecondary },
  notes: { fontSize: 12, color: c.text, marginTop: 4 },
  dialogTitle: { fontSize: 17, fontWeight: '700', color: c.text },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.divider,
  },
  detailLabel: { fontSize: 12, color: c.textSecondary },
  detailValue: { fontSize: 13, fontWeight: '600', color: c.text, flexShrink: 1, textAlign: 'right' },
  notesBlock: { paddingTop: 10 },
  notesValue: { fontSize: 13, color: c.text, marginTop: 4, lineHeight: 19 },
});
