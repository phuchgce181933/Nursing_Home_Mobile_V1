import React, { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Button, Chip, FAB, Dialog, Portal, TextInput } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { CARE_APPOINTMENTS, RESIDENTS } from '../../api/endpoints';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { BackHeader } from '../../components/layout/BackHeader';
import { CalendarPicker } from '../../components/shared/CalendarPicker';
import { useToast } from '../../utils/toast';
import { useAppTheme } from '../../theme/useAppTheme';
import type { AppColors } from '../../constants/theme';
import { formatLocalDate } from '../../utils/date';
import { useAppointmentLabels } from '../../utils/appointmentLabels';

const NS = 'nurse.careAppointments';
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const todayStr = () => formatLocalDate(new Date());

export const CareAppointmentsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const toast = useToast();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { colors, roleColor, semantic } = useAppTheme('nurse');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { getTypeLabel, getStatusLabel } = useAppointmentLabels();
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ residentId: '', appointmentType: '', notes: '' });
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('09:00');

  const STATUS_FILTERS = [
    { value: '', label: t(`${NS}.filterAll`) },
    { value: 'scheduled', label: t(`${NS}.filterScheduled`) },
    { value: 'in_progress', label: t(`${NS}.filterInProgress`) },
    { value: 'completed', label: t(`${NS}.filterCompleted`) },
    { value: 'cancelled', label: t(`${NS}.filterCancelled`) },
  ];
  // Màu lấy từ `semantic` (theo scheme sáng/tối) thay vì hex cố định: các giá trị
  // cũ `#065F46`/`#991B1B` chỉ đủ tương phản trên nền sáng, sang chế độ tối thành
  // chữ tối trên nền tối.
  const NEXT_STATUS: Record<string, { status: string; label: string; color: string }[]> = {
    scheduled: [{ status: 'in_progress', label: t(`${NS}.actionStart`), color: semantic.success }, { status: 'cancelled', label: t(`${NS}.actionCancel`), color: semantic.danger }],
    in_progress: [{ status: 'completed', label: t(`${NS}.actionComplete`), color: semantic.success }, { status: 'cancelled', label: t(`${NS}.actionCancel`), color: semantic.danger }],
  };

  const listQ = useQuery({ queryKey: ['appointments', filter], queryFn: async () => (await api.get(CARE_APPOINTMENTS.LIST, { params: { status: filter || undefined } })).data });
  const residentsQ = useQuery({ queryKey: ['residentsForAppt'], queryFn: async () => (await api.get(RESIDENTS.LIST, { params: { status: 'admitted' } })).data });
  const items = listQ.data?.data ?? listQ.data ?? [];
  const residents = Array.isArray(residentsQ.data) ? residentsQ.data : (residentsQ.data?.data ?? []);

  const isValidCreate = !!form.residentId && !!startDate && TIME_REGEX.test(startTime) && !!endDate && TIME_REGEX.test(endTime);

  const createMut = useMutation({
    mutationFn: async () => (await api.post(CARE_APPOINTMENTS.CREATE, {
      ...form,
      scheduledStartAt: new Date(`${startDate}T${startTime}:00`).toISOString(),
      scheduledEndAt: new Date(`${endDate}T${endTime}:00`).toISOString(),
    })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      setShowCreate(false);
      setForm({ residentId: '', appointmentType: '', notes: '' });
      setStartDate(''); setStartTime('08:00'); setEndDate(''); setEndTime('09:00');
      toast(t(`${NS}.toastCreated`), 'success');
    },
    onError: (e: any) => toast(e.response?.data?.message ?? t(`${NS}.toastCreateError`), 'error'),
  });

  const statusMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => (await api.put(CARE_APPOINTMENTS.UPDATE_STATUS(id), { status })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments'] }); toast(t(`${NS}.toastUpdated`), 'success'); },
    onError: (e: any) => toast(e?.response?.data?.message ?? t(`${NS}.toastUpdateError`), 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => (await api.delete(CARE_APPOINTMENTS.DELETE(id))).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments'] }); toast(t(`${NS}.toastDeleted`), 'success'); },
    onError: (e: any) => toast(e?.response?.data?.message ?? t(`${NS}.toastDeleteError`), 'error'),
  });

  // Trong lúc một mutation đang chạy, mọi nút hành động phải *trông* bị khóa,
  // nếu không người dùng bấm tiếp và gửi trùng lệnh đổi trạng thái.
  const actionsBusy = statusMut.isPending || deleteMut.isPending;

  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.title`)} color={roleColor} onBack={() => navigation?.goBack()} />
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(f => <Chip key={f.value} selected={filter === f.value} onPress={() => setFilter(f.value)} style={filter === f.value ? { backgroundColor: roleColor } : { backgroundColor: colors.surfaceMuted }} textStyle={filter === f.value ? { color: '#fff', fontWeight: '600' } : { color: colors.text }} compact>{f.label}</Chip>)}
      </View>
      <ScreenLayout loading={listQ.isLoading} error={listQ.error ? t(`${NS}.loadError`) : null} onRetry={listQ.refetch} isEmpty={items.length === 0} emptyMessage={t(`${NS}.empty`)}>
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={listQ.isFetching} onRefresh={listQ.refetch} tintColor={roleColor} />}
          renderItem={({ item }) => {
            const resName = item.residentId?.fullName ?? '--';
            const actions = NEXT_STATUS[item.status] ?? [];
            return (
              <Card style={styles.card} mode="outlined">
                <Card.Content>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{resName}</Text>
                      <Text style={styles.sub}>{getTypeLabel(item.appointmentType, t(`${NS}.defaultType`))} · {item.scheduledStartAt ? new Date(item.scheduledStartAt).toLocaleString('vi-VN') : ''}</Text>
                      {item.notes ? <Text style={styles.reason} numberOfLines={1}>{item.notes}</Text> : null}
                    </View>
                    <StatusBadge status={item.status} size="sm" label={getStatusLabel(item.status)} />
                  </View>
                </Card.Content>
                {actions.length > 0 ? (
                  <Card.Actions>
                    {actions.map(a => (
                      <Button key={a.status} compact mode="text" disabled={actionsBusy} textColor={a.color} onPress={() => statusMut.mutate({ id: item._id, status: a.status })}>{a.label}</Button>
                    ))}
                    {/* "Xóa" trước đây dùng `textSecondary` nên trông như đang bị khóa;
                        nó là hành động phá hủy đang bật, phải mang màu danger. */}
                    <Button compact mode="text" disabled={actionsBusy} textColor={semantic.danger} onPress={() => deleteMut.mutate(item._id)}>{t(`${NS}.delete`)}</Button>
                  </Card.Actions>
                ) : null}
              </Card>
            );
          }} />
      </ScreenLayout>
      <FAB icon="plus" style={[styles.fab, { backgroundColor: roleColor }]} color="#fff" onPress={() => setShowCreate(true)} />

      <Portal>
        <Dialog visible={showCreate} onDismiss={() => setShowCreate(false)} style={{ borderRadius: 16 }}>
          <Dialog.Title>{t(`${NS}.createTitle`)}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 400 }}>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 8 }}>{t(`${NS}.selectResident`)}</Text>
            <View style={styles.residentPicker}>
              {residents.slice(0, 20).map((r: any) => (
                <Chip key={r._id} selected={form.residentId === r._id} onPress={() => setForm(f => ({ ...f, residentId: r._id }))} compact style={form.residentId === r._id ? { backgroundColor: roleColor } : undefined} textStyle={form.residentId === r._id ? { color: '#fff' } : undefined}>{r.fullName}</Chip>
              ))}
            </View>
            <CalendarPicker label={t(`${NS}.startDateLabel`)} value={startDate} onChange={setStartDate} minDate={todayStr()} color={roleColor} />
            <TextInput label={t(`${NS}.startTimeLabel`)} mode="outlined" value={startTime} onChangeText={setStartTime} dense style={styles.input} placeholder="08:00" maxLength={5} />
            <CalendarPicker label={t(`${NS}.endDateLabel`)} value={endDate} onChange={setEndDate} minDate={todayStr()} color={roleColor} />
            <TextInput label={t(`${NS}.endTimeLabel`)} mode="outlined" value={endTime} onChangeText={setEndTime} dense style={styles.input} placeholder="09:00" maxLength={5} />
            <TextInput label={t(`${NS}.typeLabel`)} mode="outlined" value={form.appointmentType} onChangeText={v => setForm(f => ({ ...f, appointmentType: v }))} dense style={styles.input} placeholder={t(`${NS}.typePlaceholder`)} />
            <TextInput label={t(`${NS}.notesLabel`)} mode="outlined" value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} dense multiline style={styles.input} />
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowCreate(false)}>{t('common.cancel')}</Button>
            <Button mode="contained" buttonColor={roleColor} onPress={() => createMut.mutate()} loading={createMut.isPending} disabled={!isValidCreate}>{t(`${NS}.create`)}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const createStyles = (c: AppColors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.background }, filterRow: { flexDirection: 'row', gap: 6, padding: 12, flexWrap: 'wrap' }, list: { padding: 16, paddingBottom: 80 }, card: { borderRadius: 12, marginBottom: 8, backgroundColor: c.surface }, row: { flexDirection: 'row', alignItems: 'center' }, name: { fontSize: 14, fontWeight: '600', color: c.text }, sub: { fontSize: 12, color: c.textSecondary, marginTop: 2 }, reason: { fontSize: 12, color: c.text, marginTop: 4 }, fab: { position: 'absolute', bottom: 16, right: 16 }, input: { marginBottom: 8 }, residentPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
});
