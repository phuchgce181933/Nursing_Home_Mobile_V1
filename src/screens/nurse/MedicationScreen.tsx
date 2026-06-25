import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Chip, Card, Button, Dialog, Portal, TextInput, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDailyMedSchedule, useMarkTaken, useMarkMissed } from '../../hooks/useMedications';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { AlertBanner } from '../../components/shared/AlertBanner';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { CalendarPicker } from '../../components/shared/CalendarPicker';
import { useToast } from '../../utils/toast';
import { getStatusEntry } from '../../utils/statusMap';

const COLOR = '#0F5040';
const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => toDateStr(new Date());

const shiftDay = (dateStr: string, delta: number) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d + delta);
  return toDateStr(date);
};

const STATUS_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ' },
  { value: 'TAKEN', label: 'Đã cho' },
  { value: 'MISSED', label: 'Bỏ qua' },
  { value: 'OVERDUE', label: 'Quá hạn' },
];

const MISSED_REASONS = [
  { value: 'refused', label: 'Từ chối' },
  { value: 'asleep', label: 'Đang ngủ' },
  { value: 'vomiting', label: 'Nôn' },
  { value: 'hospitalized', label: 'Nhập viện' },
  { value: 'other', label: 'Khác' },
];

export const MedicationScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [selectedDate, setSelectedDate] = useState(today());
  const [filter, setFilter] = useState('');
  const [missedDialog, setMissedDialog] = useState<string | null>(null);
  const [missedReason, setMissedReason] = useState('refused');
  const [missedNotes, setMissedNotes] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<string | null>(null);

  const isToday = selectedDate === today();

  const params = { date: selectedDate, status: filter || undefined };
  const scheduleQ = useDailyMedSchedule(params);
  const markTaken = useMarkTaken();
  const markMissed = useMarkMissed();

  const groups = scheduleQ.data?.data ?? [];
  const allSchedules = Array.isArray(groups) ? groups.flatMap((g: any) => g.schedules ?? []) : [];
  const overdueCount = allSchedules.filter((s: any) => s.status === 'OVERDUE').length;

  const handleMarkTaken = async (id: string) => {
    setConfirmDialog(null);
    try {
      await markTaken.mutateAsync({ id });
      toast('Đã xác nhận cho thuốc', 'success');
    } catch {
      toast('Không thể cập nhật. Thử lại.', 'error');
    }
  };

  const handleMarkMissed = async () => {
    if (!missedDialog) return;
    try {
      await markMissed.mutateAsync({ id: missedDialog, reason: missedReason, notes: missedNotes });
      toast('Đã ghi nhận bỏ qua', 'success');
    } catch {
      toast('Không thể cập nhật. Thử lại.', 'error');
    } finally {
      setMissedDialog(null);
      setMissedNotes('');
    }
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Lịch phát thuốc</Text>
      </View>

      <View style={styles.dateBar}>
        <IconButton icon="chevron-left" size={22} iconColor={COLOR} onPress={() => setSelectedDate(d => shiftDay(d, -1))} style={styles.dateArrow} />
        <View style={styles.dateLabelWrap}>
          <CalendarPicker label="Ngày xem" value={selectedDate} onChange={setSelectedDate} color={COLOR} />
        </View>
        <IconButton icon="chevron-right" size={22} iconColor={COLOR} onPress={() => setSelectedDate(d => shiftDay(d, 1))} style={styles.dateArrow} />
      </View>

      {!isToday && (
        <View style={styles.todayBtnRow}>
          <Button compact mode="text" textColor={COLOR} icon="calendar-today" onPress={() => setSelectedDate(today())}>
            Về hôm nay
          </Button>
        </View>
      )}

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
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

      {overdueCount > 0 ? (
        <View style={{ paddingHorizontal: 16 }}>
          <AlertBanner message={`${overdueCount} thuốc quá hạn cần xử lý`} severity="warning" />
        </View>
      ) : null}

      <ScreenLayout
        loading={scheduleQ.isLoading}
        error={scheduleQ.error ? (scheduleQ.error as Error).message : null}
        onRetry={scheduleQ.refetch}
        isEmpty={allSchedules.length === 0}
        emptyMessage="Không có thuốc nào cần phát"
      >
        <FlatList
          data={groups}
          keyExtractor={(item: any) => item.residentId}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={scheduleQ.refetch} tintColor={COLOR} />}
          renderItem={({ item: group }) => (
            <View style={styles.groupSection}>
              <View style={styles.groupHeader}>
                <MaterialCommunityIcons name="account" size={18} color={COLOR} />
                <Text style={styles.groupName}>{group.residentName}</Text>
                {group.room ? <Text style={styles.groupRoom}>Phòng {group.room}</Text> : null}
              </View>
              {(group.schedules ?? []).map((item: any) => {
                const entry = getStatusEntry(item.status);
                const time = item.scheduledTime ? new Date(item.scheduledTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
                const isPending = item.status === 'PENDING' || item.status === 'OVERDUE';

                return (
                  <Card key={item.id} style={[styles.medCard, { borderLeftWidth: 4, borderLeftColor: entry.textColor }]} mode="outlined">
                    <Card.Content style={styles.medRow}>
                      <View style={styles.medInfo}>
                        <Text style={styles.medName} numberOfLines={1}>{item.medicationName}</Text>
                        <Text style={styles.medDosage}>{item.dosage} · {item.route} · {time}</Text>
                      </View>
                      <StatusBadge status={item.status} size="sm" />
                    </Card.Content>
                    {isPending ? (
                      <View style={styles.actionRow}>
                        <Button mode="outlined" compact style={styles.actionBtn} textColor={COLOR}
                          onPress={() => setConfirmDialog(item.id)}>Đã cho</Button>
                        <Button mode="outlined" compact style={[styles.actionBtn, styles.actionBtnDanger]} textColor="#991B1B"
                          onPress={() => setMissedDialog(item.id)}>Bỏ qua</Button>
                      </View>
                    ) : null}
                  </Card>
                );
              })}
            </View>
          )}
        />
      </ScreenLayout>

      <Portal>
        <Dialog visible={!!confirmDialog} onDismiss={() => setConfirmDialog(null)}>
          <Dialog.Title>Xác nhận cho thuốc?</Dialog.Title>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDialog(null)}>Hủy</Button>
            <Button mode="contained" buttonColor={COLOR} onPress={() => handleMarkTaken(confirmDialog!)}>Xác nhận</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={!!missedDialog} onDismiss={() => setMissedDialog(null)}>
          <Dialog.Title>Xác nhận bỏ qua liều thuốc này?</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: 8, color: '#6B7280' }}>Hành động không thể hoàn tác.</Text>
            <View style={styles.reasonRow}>
              {MISSED_REASONS.map((r) => (
                <Chip
                  key={r.value}
                  selected={missedReason === r.value}
                  onPress={() => setMissedReason(r.value)}
                  compact
                  style={missedReason === r.value ? { backgroundColor: '#FEE2E2' } : undefined}
                >
                  {r.label}
                </Chip>
              ))}
            </View>
            <TextInput
              label="Ghi chú"
              mode="outlined"
              value={missedNotes}
              onChangeText={setMissedNotes}
              dense
              style={{ marginTop: 8 }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setMissedDialog(null)}>Hủy</Button>
            <Button mode="contained" buttonColor="#991B1B" onPress={handleMarkMissed}>Xác nhận</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  dateBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingTop: 8 },
  dateArrow: { margin: 0 },
  dateLabelWrap: { flex: 1 },
  todayBtnRow: { alignItems: 'center', paddingBottom: 2 },
  filterRow: { flexDirection: 'row', gap: 6, padding: 12, paddingBottom: 4, flexWrap: 'wrap' },
  chip: { borderRadius: 20 },
  list: { padding: 16, paddingBottom: 32 },
  medCard: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff', overflow: 'hidden' },
  medRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  medInfo: { flex: 1 },
  medName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  medDosage: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  actionBtn: { flex: 1, borderRadius: 8, borderColor: COLOR },
  actionBtnDanger: { borderColor: '#991B1B' },
  reasonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  groupSection: { marginBottom: 16 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  groupName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  groupRoom: { fontSize: 12, color: '#6B7280', marginLeft: 'auto' },
});
