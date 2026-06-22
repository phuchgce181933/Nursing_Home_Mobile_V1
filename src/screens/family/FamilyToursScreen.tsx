import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Card, Button, FAB, Dialog, Portal, TextInput, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { useToast } from '../../utils/toast';

const COLOR = '#2E7D32';

const STATUS_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'completed', label: 'Hoàn tất' },
  { value: 'cancelled', label: 'Đã hủy' },
];

const TIME_SLOTS = ['08:00 - 10:00', '10:00 - 12:00', '14:00 - 16:00', '16:00 - 18:00'];
const CANCELLABLE = ['pending', 'confirmed'];

const formatDate = (d: string) => {
  if (!d) return 'N/A';
  try { return new Date(d).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return d; }
};

const TIMELINE_STEPS = [
  { key: 'submitted', label: 'Đã gửi yêu cầu', icon: 'send' },
  { key: 'pending', label: 'Đang xem xét', icon: 'clock-outline' },
  { key: 'confirmed', label: 'Đã xác nhận', icon: 'check-decagram' },
  { key: 'completed', label: 'Hoàn tất tham quan', icon: 'flag-checkered' },
];

export const FamilyToursScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const toast = useToast();
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [form, setForm] = useState({
    contactName: '', contactPhone: '', contactEmail: '',
    preferredDate: '', preferredTimeSlot: TIME_SLOTS[0], numberOfVisitors: '1', notes: '',
  });

  const listQ = useQuery({
    queryKey: ['tours', statusFilter],
    queryFn: async () => (await api.get(FAMILY.TOURS, { params: { status: statusFilter || undefined } })).data,
  });
  const items = listQ.data?.data ?? listQ.data ?? [];

  const createMut = useMutation({
    mutationFn: async () => (await api.post(FAMILY.TOURS, {
      ...form,
      numberOfVisitors: Number(form.numberOfVisitors) || 1,
      contactEmail: form.contactEmail || undefined,
      notes: form.notes || undefined,
    })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tours'] });
      setShowCreate(false);
      setForm({ contactName: '', contactPhone: '', contactEmail: '', preferredDate: '', preferredTimeSlot: TIME_SLOTS[0], numberOfVisitors: '1', notes: '' });
      toast('Đã đặt lịch tham quan thành công', 'success');
    },
    onError: (e: any) => toast(e?.response?.data?.message || 'Không thể đặt lịch', 'error'),
  });

  const cancelMut = useMutation({
    mutationFn: async () => (await api.patch(FAMILY.TOUR_CANCEL(cancelId!), { cancellationReason: cancelReason || undefined })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tours'] });
      setCancelId(null); setCancelReason(''); setDetailItem(null);
      toast('Đã hủy lịch tham quan', 'success');
    },
    onError: (e: any) => toast(e?.response?.data?.message || 'Không thể hủy', 'error'),
  });

  const getTimelineIndex = (status: string) => {
    if (status === 'completed') return 3;
    if (status === 'confirmed') return 2;
    if (status === 'pending') return 1;
    return 0;
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.topTitle}>Lịch tham quan</Text>
          <Text style={styles.topSub}>{items.length} lịch hẹn</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <Chip key={f.value} selected={statusFilter === f.value} onPress={() => setStatusFilter(f.value)} compact
            style={statusFilter === f.value ? { backgroundColor: COLOR } : undefined}
            textStyle={statusFilter === f.value ? { color: '#fff' } : undefined}>
            {f.label}
          </Chip>
        ))}
      </ScrollView>

      <ScreenLayout loading={listQ.isLoading} error={listQ.error ? (listQ.error as Error).message : null}
        onRetry={listQ.refetch} isEmpty={items.length === 0} emptyMessage="Chưa có lịch tham quan nào">
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={listQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined" onPress={() => setDetailItem(item)}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <Text style={styles.name}>{item.contactName}</Text>
                  <StatusBadge status={item.status} size="sm" />
                </View>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="calendar" size={14} color="#6B7280" />
                  <Text style={styles.infoText}>{formatDate(item.preferredDate)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color="#6B7280" />
                  <Text style={styles.infoText}>{item.confirmedTimeSlot || item.preferredTimeSlot || 'Chưa có'}</Text>
                  <MaterialCommunityIcons name="account-group" size={14} color="#6B7280" style={{ marginLeft: 12 }} />
                  <Text style={styles.infoText}>{item.numberOfVisitors ?? 1} người</Text>
                </View>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="phone" size={14} color="#6B7280" />
                  <Text style={styles.infoText}>{item.contactPhone}</Text>
                </View>
              </Card.Content>
              {CANCELLABLE.includes(item.status) && (
                <Card.Actions>
                  <Button compact textColor={COLOR} icon="eye" onPress={() => setDetailItem(item)}>Chi tiết</Button>
                  <Button compact textColor="#991B1B" icon="close-circle-outline" onPress={() => setCancelId(item._id)}>Hủy</Button>
                </Card.Actions>
              )}
            </Card>
          )}
        />
      </ScreenLayout>

      <FAB icon="plus" style={[styles.fab, { backgroundColor: COLOR }]} color="#fff" onPress={() => setShowCreate(true)} />

      {/* Detail dialog */}
      <Portal>
        <Dialog visible={!!detailItem} onDismiss={() => setDetailItem(null)} style={{ borderRadius: 16, maxHeight: '85%' }}>
          <Dialog.Title style={{ fontSize: 16 }}>Chi tiết lịch tham quan</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView style={{ paddingHorizontal: 4 }}>
              {detailItem && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Thông tin liên hệ</Text>
                    <DetailRow label="Người liên hệ" value={detailItem.contactName} />
                    <DetailRow label="Số điện thoại" value={detailItem.contactPhone} />
                    {detailItem.contactEmail && <DetailRow label="Email" value={detailItem.contactEmail} />}
                    <DetailRow label="Số người" value={`${detailItem.numberOfVisitors ?? 1} người`} />
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Lịch hẹn</Text>
                    <DetailRow label="Ngày mong muốn" value={formatDate(detailItem.preferredDate)} />
                    <DetailRow label="Khung giờ" value={detailItem.preferredTimeSlot || 'Chưa chọn'} />
                    {detailItem.confirmedTimeSlot && (
                      <DetailRow label="Giờ xác nhận" value={detailItem.confirmedTimeSlot} />
                    )}
                    {detailItem.confirmedAt && <DetailRow label="Xác nhận lúc" value={formatDate(detailItem.confirmedAt)} />}
                    {detailItem.completedAt && <DetailRow label="Hoàn tất lúc" value={formatDate(detailItem.completedAt)} />}
                  </View>

                  {detailItem.notes && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Ghi chú từ gia đình</Text>
                      <Text style={{ fontSize: 13, color: '#374151', fontStyle: 'italic' }}>"{detailItem.notes}"</Text>
                    </View>
                  )}

                  {detailItem.adminNotes && (
                    <View style={[styles.detailSection, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                      <Text style={[styles.detailSectionTitle, { color: '#1E40AF' }]}>Ghi chú từ nhân viên</Text>
                      <Text style={{ fontSize: 13, color: '#1E3A5F' }}>"{detailItem.adminNotes}"</Text>
                    </View>
                  )}

                  {detailItem.status === 'cancelled' && (detailItem.cancellationReason || detailItem.rejectionReason) && (
                    <View style={[styles.detailSection, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}>
                      <Text style={[styles.detailSectionTitle, { color: '#991B1B' }]}>
                        {detailItem.rejectionReason ? 'Lý do từ chối' : 'Lý do hủy'}
                      </Text>
                      <Text style={{ fontSize: 13, color: '#7F1D1D', fontStyle: 'italic' }}>
                        "{detailItem.cancellationReason || detailItem.rejectionReason}"
                      </Text>
                    </View>
                  )}

                  {detailItem.status !== 'cancelled' && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Tiến trình</Text>
                      {TIMELINE_STEPS.map((step, idx) => {
                        const activeIdx = getTimelineIndex(detailItem.status);
                        const isDone = idx <= activeIdx;
                        const isActive = idx === activeIdx;
                        return (
                          <View key={step.key} style={styles.timelineRow}>
                            <View style={[styles.timelineDot, isDone && { backgroundColor: COLOR, borderColor: COLOR }, isActive && styles.timelineDotActive]}>
                              <MaterialCommunityIcons name={isDone ? 'check' : (step.icon as any)} size={12} color={isDone ? '#fff' : '#9CA3AF'} />
                            </View>
                            {idx < TIMELINE_STEPS.length - 1 && <View style={[styles.timelineLine, isDone && { backgroundColor: COLOR }]} />}
                            <Text style={[styles.timelineLabel, isActive && { color: COLOR, fontWeight: '700' }]}>{step.label}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            {detailItem && CANCELLABLE.includes(detailItem.status) && (
              <Button textColor="#991B1B" onPress={() => { setCancelId(detailItem._id); setDetailItem(null); }}>Hủy lịch</Button>
            )}
            <Button onPress={() => setDetailItem(null)}>Đóng</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Create dialog */}
        <Dialog visible={showCreate} onDismiss={() => setShowCreate(false)} style={{ borderRadius: 16 }}>
          <Dialog.Title style={{ fontSize: 16 }}>Đặt lịch tham quan</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 420 }}>
            <View style={{ paddingHorizontal: 4, gap: 2 }}>
              <TextInput label="Tên liên hệ *" mode="outlined" value={form.contactName} onChangeText={(v) => setForm((f) => ({ ...f, contactName: v }))} dense style={styles.input} />
              <TextInput label="Số điện thoại *" mode="outlined" value={form.contactPhone} onChangeText={(v) => setForm((f) => ({ ...f, contactPhone: v }))} dense keyboardType="phone-pad" style={styles.input} />
              <TextInput label="Email" mode="outlined" value={form.contactEmail} onChangeText={(v) => setForm((f) => ({ ...f, contactEmail: v }))} dense keyboardType="email-address" style={styles.input} />
              <TextInput label="Ngày mong muốn * (YYYY-MM-DD)" mode="outlined" value={form.preferredDate} onChangeText={(v) => setForm((f) => ({ ...f, preferredDate: v }))} dense style={styles.input} />

              <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>Khung giờ</Text>
              <View style={styles.slotRow}>
                {TIME_SLOTS.map((slot) => (
                  <Chip key={slot} selected={form.preferredTimeSlot === slot} onPress={() => setForm((f) => ({ ...f, preferredTimeSlot: slot }))} compact
                    style={form.preferredTimeSlot === slot ? { backgroundColor: COLOR } : undefined}
                    textStyle={form.preferredTimeSlot === slot ? { color: '#fff', fontSize: 11 } : { fontSize: 11 }}>
                    {slot}
                  </Chip>
                ))}
              </View>

              <TextInput label="Số người tham quan" mode="outlined" value={form.numberOfVisitors} onChangeText={(v) => setForm((f) => ({ ...f, numberOfVisitors: v }))} dense keyboardType="numeric" style={styles.input} />
              <TextInput label="Ghi chú" mode="outlined" value={form.notes} onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))} dense multiline style={styles.input} />
            </View>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowCreate(false)}>Hủy</Button>
            <Button mode="contained" buttonColor={COLOR} onPress={() => createMut.mutate()} loading={createMut.isPending}
              disabled={!form.contactName || !form.contactPhone || !form.preferredDate}>
              Đặt lịch
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Cancel dialog */}
        <Dialog visible={!!cancelId} onDismiss={() => setCancelId(null)}>
          <Dialog.Title>Hủy lịch tham quan?</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: '#6B7280', marginBottom: 10 }}>Lịch đã hủy không thể khôi phục.</Text>
            <TextInput label="Lý do hủy (tùy chọn)" mode="outlined" value={cancelReason} onChangeText={setCancelReason} dense multiline numberOfLines={3} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => { setCancelId(null); setCancelReason(''); }}>Quay lại</Button>
            <Button mode="contained" buttonColor="#991B1B" onPress={() => cancelMut.mutate()} loading={cancelMut.isPending}>Xác nhận hủy</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const DetailRow: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value || 'N/A'}</Text>
  </View>
);

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  topSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  filterScroll: { flexGrow: 0 },
  filterRow: { gap: 6, padding: 12 },
  list: { padding: 16, paddingBottom: 80 },
  card: { borderRadius: 12, marginBottom: 10, backgroundColor: '#fff' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  name: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  infoText: { fontSize: 13, color: '#374151' },
  fab: { position: 'absolute' as const, bottom: 16, right: 16 },
  input: { marginBottom: 8 },
  slotRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  detailSection: { marginBottom: 14, padding: 12, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  detailSectionTitle: { fontSize: 12, fontWeight: '700', color: COLOR, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  detailLabel: { fontSize: 13, color: '#6B7280' },
  detailValue: { fontSize: 13, fontWeight: '500', color: '#111827', maxWidth: '55%', textAlign: 'right' },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6, position: 'relative' },
  timelineDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#D1D5DB', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  timelineDotActive: { borderWidth: 3, borderColor: COLOR },
  timelineLine: { position: 'absolute', left: 11, top: 24, width: 2, height: 14, backgroundColor: '#D1D5DB' },
  timelineLabel: { fontSize: 13, color: '#6B7280' },
});
