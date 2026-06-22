import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Chip, Card, Button, Dialog, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMyShifts, useConfirmShift } from '../../hooks/useShifts';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { useToast } from '../../utils/toast';

const COLOR = '#0F5040';
const FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'published', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
];

const formatDate = (d: string) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }); }
  catch { return d; }
};

export const MyShiftsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [filter, setFilter] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const now = new Date();
  const fromDate = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
  const toDate = new Date(now.getTime() + 21 * 86400000).toISOString().split('T')[0];

  const shiftsQ = useMyShifts({ fromDate, toDate, status: filter || undefined });
  const confirmMut = useConfirmShift();

  const shifts = shiftsQ.data?.data ?? shiftsQ.data ?? [];

  const handleConfirm = async () => {
    if (!confirmId) return;
    try {
      await confirmMut.mutateAsync(confirmId);
      toast('Đã xác nhận ca làm', 'success');
    } catch {
      toast('Không thể xác nhận. Thử lại.', 'error');
    } finally {
      setConfirmId(null);
    }
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Ca làm của tôi</Text>
        <Text style={styles.topSub}>7 ngày trước → 21 ngày tới</Text>
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
        loading={shiftsQ.isLoading}
        error={shiftsQ.error ? (shiftsQ.error as Error).message : null}
        onRetry={shiftsQ.refetch}
        isEmpty={shifts.length === 0}
        emptyMessage="Không có ca làm nào"
      >
        <FlatList
          data={shifts}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={shiftsQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined">
              <Card.Content>
                <View style={styles.cardHeader}>
                  <View style={styles.dateBox}>
                    <MaterialCommunityIcons name="calendar" size={16} color={COLOR} />
                    <Text style={styles.dateText}>{formatDate(item.shiftDate)}</Text>
                  </View>
                  <StatusBadge status={item.status} size="sm" />
                </View>
                <View style={styles.timeRow}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color="#6B7280" />
                  <Text style={styles.timeText}>{item.startTime} - {item.endTime}</Text>
                </View>
                <View style={styles.metaRow}>
                  {item.shiftType && (
                    <Text style={styles.metaChip}>{item.shiftType.replace(/_/g, ' ')}</Text>
                  )}
                  {item.location && (
                    <View style={styles.locationRow}>
                      <MaterialCommunityIcons name="map-marker-outline" size={12} color="#6B7280" />
                      <Text style={styles.metaText}>{item.location}</Text>
                    </View>
                  )}
                </View>
                {item.notes && <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text>}
              </Card.Content>
              {item.status === 'published' && (
                <Card.Actions>
                  <Button
                    mode="contained"
                    buttonColor={COLOR}
                    compact
                    onPress={() => setConfirmId(item._id)}
                  >
                    Xác nhận ca làm
                  </Button>
                </Card.Actions>
              )}
            </Card>
          )}
        />
      </ScreenLayout>

      <Portal>
        <Dialog visible={!!confirmId} onDismiss={() => setConfirmId(null)}>
          <Dialog.Title>Xác nhận ca làm?</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: '#6B7280' }}>Bạn xác nhận sẽ tham gia ca làm này.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmId(null)}>Hủy</Button>
            <Button mode="contained" buttonColor={COLOR} onPress={handleConfirm} loading={confirmMut.isPending}>
              Xác nhận
            </Button>
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
  card: { borderRadius: 12, marginBottom: 10, backgroundColor: '#fff' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dateBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 14, fontWeight: '600', color: '#111827' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  timeText: { fontSize: 13, color: '#374151' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaChip: { fontSize: 11, color: '#6B7280', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, textTransform: 'capitalize', overflow: 'hidden' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: '#6B7280' },
  notes: { fontSize: 12, color: '#6B7280', marginTop: 6, fontStyle: 'italic' },
});
