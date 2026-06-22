import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Platform } from 'react-native';
import { Text, Chip, Card, Button, Dialog, Portal, TextInput, SegmentedButtons } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLeaveRequests, useCreateLeaveRequest, useCancelLeaveRequest } from '../../hooks/useLeaveRequests';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { useToast } from '../../utils/toast';

const COLOR = '#0F5040';

const LEAVE_TYPES = [
  { value: 'annual', label: 'Nghỉ phép năm' },
  { value: 'sick', label: 'Nghỉ bệnh' },
  { value: 'emergency', label: 'Khẩn cấp' },
  { value: 'unpaid', label: 'Không lương' },
  { value: 'other', label: 'Khác' },
];

const STATUS_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Từ chối' },
];

const formatDate = (d: string) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return d; }
};

const getLeaveLabel = (type: string) => LEAVE_TYPES.find((t) => t.value === type)?.label ?? type;

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

export const LeaveRequestScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const [leaveType, setLeaveType] = useState('annual');
  const [startDate, setStartDate] = useState(tomorrow());
  const [endDate, setEndDate] = useState(tomorrow());
  const [reason, setReason] = useState('');

  const requestsQ = useLeaveRequests({ status: filter || undefined });
  const createMut = useCreateLeaveRequest();
  const cancelMut = useCancelLeaveRequest();

  const requests = requestsQ.data?.data ?? requestsQ.data ?? [];

  const handleCreate = async () => {
    if (!reason.trim()) { toast('Vui lòng nhập lý do', 'error'); return; }
    if (startDate > endDate) { toast('Ngày bắt đầu phải trước ngày kết thúc', 'error'); return; }
    try {
      await createMut.mutateAsync({ leaveType, startDate, endDate, reason: reason.trim() });
      toast('Đã gửi đơn nghỉ phép', 'success');
      setShowCreate(false);
      setReason('');
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Không thể gửi đơn. Thử lại.', 'error');
    }
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    try {
      await cancelMut.mutateAsync(cancelId);
      toast('Đã hủy đơn nghỉ phép', 'success');
    } catch {
      toast('Không thể hủy. Thử lại.', 'error');
    } finally {
      setCancelId(null);
    }
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.topTitle}>Nghỉ phép</Text>
          <Text style={styles.topSub}>Quản lý đơn xin nghỉ</Text>
        </View>
        <Button mode="contained" compact buttonColor="#fff" textColor={COLOR} onPress={() => setShowCreate(true)}>
          + Tạo đơn
        </Button>
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

      <ScreenLayout
        loading={requestsQ.isLoading}
        error={requestsQ.error ? (requestsQ.error as Error).message : null}
        onRetry={requestsQ.refetch}
        isEmpty={requests.length === 0}
        emptyMessage="Chưa có đơn nghỉ phép nào"
      >
        <FlatList
          data={requests}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={requestsQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined">
              <Card.Content>
                <View style={styles.cardHeader}>
                  <View style={styles.typeBox}>
                    <MaterialCommunityIcons name="calendar-remove" size={16} color="#7C3AED" />
                    <Text style={styles.typeText}>{getLeaveLabel(item.leaveType)}</Text>
                  </View>
                  <StatusBadge status={item.status} size="sm" />
                </View>
                <View style={styles.dateRow}>
                  <Text style={styles.dateLabel}>Từ:</Text>
                  <Text style={styles.dateValue}>{formatDate(item.startDate)}</Text>
                  <Text style={styles.dateLabel}>→ Đến:</Text>
                  <Text style={styles.dateValue}>{formatDate(item.endDate)}</Text>
                </View>
                {item.reason && <Text style={styles.reason} numberOfLines={2}>{item.reason}</Text>}
                {item.reviewNotes && (
                  <View style={styles.reviewBox}>
                    <Text style={styles.reviewLabel}>Phản hồi:</Text>
                    <Text style={styles.reviewText}>{item.reviewNotes}</Text>
                  </View>
                )}
              </Card.Content>
              {item.status === 'pending' && (
                <Card.Actions>
                  <Button compact textColor="#991B1B" onPress={() => setCancelId(item._id)}>Hủy đơn</Button>
                </Card.Actions>
              )}
            </Card>
          )}
        />
      </ScreenLayout>

      <Portal>
        <Dialog visible={showCreate} onDismiss={() => setShowCreate(false)}>
          <Dialog.Title>Tạo đơn nghỉ phép</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 420 }}>
            <View style={{ padding: 8, gap: 12 }}>
              <Text style={styles.formLabel}>Loại nghỉ phép</Text>
              <View style={styles.typeGrid}>
                {LEAVE_TYPES.map((t) => (
                  <Chip
                    key={t.value}
                    selected={leaveType === t.value}
                    onPress={() => setLeaveType(t.value)}
                    compact
                    style={leaveType === t.value ? { backgroundColor: '#EDE9FE' } : undefined}
                  >
                    {t.label}
                  </Chip>
                ))}
              </View>

              <TextInput label="Ngày bắt đầu (YYYY-MM-DD)" mode="outlined" dense value={startDate} onChangeText={setStartDate} />
              <TextInput label="Ngày kết thúc (YYYY-MM-DD)" mode="outlined" dense value={endDate} onChangeText={setEndDate} />
              <TextInput label="Lý do *" mode="outlined" dense multiline numberOfLines={3} value={reason} onChangeText={setReason} />
            </View>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowCreate(false)}>Hủy</Button>
            <Button mode="contained" buttonColor={COLOR} onPress={handleCreate} loading={createMut.isPending}>
              Gửi đơn
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={!!cancelId} onDismiss={() => setCancelId(null)}>
          <Dialog.Title>Hủy đơn nghỉ phép?</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: '#6B7280' }}>Đơn đã hủy không thể khôi phục.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCancelId(null)}>Quay lại</Button>
            <Button mode="contained" buttonColor="#DC2626" onPress={handleCancel} loading={cancelMut.isPending}>
              Xác nhận hủy
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  topSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: 6, padding: 12, paddingBottom: 4, flexWrap: 'wrap' },
  chip: { borderRadius: 20 },
  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 10, backgroundColor: '#fff' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeText: { fontSize: 14, fontWeight: '600', color: '#111827' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  dateLabel: { fontSize: 12, color: '#6B7280' },
  dateValue: { fontSize: 13, fontWeight: '500', color: '#374151' },
  reason: { fontSize: 12, color: '#6B7280', fontStyle: 'italic' },
  reviewBox: { marginTop: 8, padding: 8, backgroundColor: '#F3F4F6', borderRadius: 8 },
  reviewLabel: { fontSize: 11, fontWeight: '600', color: '#374151' },
  reviewText: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  formLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
