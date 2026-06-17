import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Chip, Card, Button, Dialog, Portal, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDailyMedSchedule, useMarkTaken, useMarkMissed } from '../../hooks/useMedications';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { AlertBanner } from '../../components/shared/AlertBanner';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { useToast } from '../../utils/toast';
import { getStatusEntry } from '../../utils/statusMap';

const COLOR = '#0F5040';
const today = () => new Date().toISOString().split('T')[0];

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
  const [filter, setFilter] = useState('');
  const [missedDialog, setMissedDialog] = useState<string | null>(null);
  const [missedReason, setMissedReason] = useState('refused');
  const [missedNotes, setMissedNotes] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<string | null>(null);

  const params = { date: today(), status: filter || undefined };
  const scheduleQ = useDailyMedSchedule(params);
  const markTaken = useMarkTaken();
  const markMissed = useMarkMissed();

  const groups = scheduleQ.data ?? [];
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
        <Text style={styles.topSub}>{today()}</Text>
      </View>

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
          data={allSchedules}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={scheduleQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => {
            const entry = getStatusEntry(item.status);
            const time = item.scheduledTime ? new Date(item.scheduledTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
            const isPending = item.status === 'PENDING' || item.status === 'OVERDUE';

            return (
              <Card style={styles.medCard} mode="outlined">
                <Card.Content style={styles.medRow}>
                  <View style={[styles.iconBox, { backgroundColor: entry.bgColor }]}>
                    <MaterialCommunityIcons name="pill" size={20} color={entry.textColor} />
                  </View>
                  <View style={styles.medInfo}>
                    <Text style={styles.medName} numberOfLines={1}>{item.medicationName}</Text>
                    <Text style={styles.medDosage}>{item.dosage} · {time}</Text>
                  </View>
                  <StatusBadge status={item.status} size="sm" />
                </Card.Content>
                {isPending ? (
                  <Card.Actions>
                    <Button compact textColor={COLOR} onPress={() => setConfirmDialog(item._id)}>Đã cho</Button>
                    <Button compact textColor="#991B1B" onPress={() => setMissedDialog(item._id)}>Bỏ qua</Button>
                  </Card.Actions>
                ) : null}
              </Card>
            );
          }}
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
  topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  topSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: 6, padding: 12, paddingBottom: 4, flexWrap: 'wrap' },
  chip: { borderRadius: 20 },
  list: { padding: 16, paddingBottom: 32 },
  medCard: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  medRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  medInfo: { flex: 1 },
  medName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  medDosage: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  reasonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
