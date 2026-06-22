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
  { value: 'new_request', label: 'Mới' },
  { value: 'consulting', label: 'Tư vấn' },
  { value: 'assessing', label: 'Đánh giá' },
  { value: 'contracting', label: 'Hợp đồng' },
  { value: 'checked_in', label: 'Đã nhận' },
  { value: 'cancelled', label: 'Đã hủy' },
];

const GENDERS = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'unknown', label: 'Không rõ' },
];

const CANCELLABLE = ['new_request', 'consulting'];

const formatDate = (d: string) => {
  if (!d) return 'N/A';
  try { return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return d; }
};

const TIMELINE_STEPS = [
  { key: 'new_request', label: 'Gửi yêu cầu', icon: 'file-document-outline' },
  { key: 'consulting', label: 'Tư vấn', icon: 'account-voice' },
  { key: 'assessing', label: 'Đánh giá', icon: 'clipboard-check-outline' },
  { key: 'contracting', label: 'Ký hợp đồng', icon: 'file-sign' },
  { key: 'checked_in', label: 'Đã nhận', icon: 'account-check' },
];

const getStepIndex = (status: string) => {
  const idx = TIMELINE_STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : -1;
};

export const FamilyAdmissionsScreen: React.FC = () => {
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
    fullName: '', relationshipToRequester: '', dateOfBirth: '', gender: 'unknown',
    preferredAdmissionDate: '', reasonForAdmission: '', notes: '', requestedByPhone: '',
  });

  const listQ = useQuery({
    queryKey: ['admissions', statusFilter],
    queryFn: async () => (await api.get(FAMILY.ADMISSIONS, { params: { status: statusFilter || undefined } })).data,
  });
  const items = listQ.data?.data ?? listQ.data ?? [];

  const createMut = useMutation({
    mutationFn: async () => {
      const body = {
        applicant: { fullName: form.fullName, relationshipToRequester: form.relationshipToRequester, dateOfBirth: form.dateOfBirth || undefined, gender: form.gender },
        preferredAdmissionDate: form.preferredAdmissionDate || undefined,
        reasonForAdmission: form.reasonForAdmission,
        notes: form.notes || undefined,
        requestedByPhone: form.requestedByPhone || undefined,
      };
      return (await api.post(FAMILY.ADMISSIONS, body)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admissions'] });
      setShowCreate(false);
      setForm({ fullName: '', relationshipToRequester: '', dateOfBirth: '', gender: 'unknown', preferredAdmissionDate: '', reasonForAdmission: '', notes: '', requestedByPhone: '' });
      toast('Đã gửi yêu cầu nhập viện', 'success');
    },
    onError: (e: any) => toast(e?.response?.data?.message || 'Không thể gửi yêu cầu', 'error'),
  });

  const cancelMut = useMutation({
    mutationFn: async () => (await api.patch(FAMILY.ADMISSION_CANCEL(cancelId!), { cancellationReason: cancelReason })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admissions'] });
      setCancelId(null); setCancelReason(''); setDetailItem(null);
      toast('Đã hủy yêu cầu', 'success');
    },
    onError: (e: any) => toast(e?.response?.data?.message || 'Không thể hủy', 'error'),
  });

  const activeIdx = detailItem ? getStepIndex(detailItem.status) : -1;
  const isCancelled = detailItem?.status === 'cancelled';

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.topTitle}>Yêu cầu nhập viện</Text>
          <Text style={styles.topSub}>{items.length} yêu cầu</Text>
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

      <ScreenLayout loading={listQ.isLoading} error={listQ.error ? (listQ.error as Error).message : null} onRetry={listQ.refetch} isEmpty={items.length === 0} emptyMessage="Chưa có yêu cầu nhập viện nào">
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={listQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined" onPress={() => setDetailItem(item)}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <Text style={styles.name}>{item.applicant?.fullName ?? '--'}</Text>
                  <StatusBadge status={item.status} size="sm" />
                </View>
                <Text style={styles.sub}>
                  {item.applicant?.relationshipToRequester ?? ''} · Ngày muốn nhập: {formatDate(item.preferredAdmissionDate)}
                </Text>
                {item.reasonForAdmission ? <Text style={styles.reason} numberOfLines={2}>{item.reasonForAdmission}</Text> : null}
                <Text style={styles.dateCreated}>Gửi: {formatDate(item.createdAt)}</Text>
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
          <Dialog.Title style={{ fontSize: 16 }}>Chi tiết yêu cầu nhập viện</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView style={{ paddingHorizontal: 4 }}>
              {detailItem && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Thông tin người thân</Text>
                    <DetailRow label="Họ tên" value={detailItem.applicant?.fullName} />
                    <DetailRow label="Quan hệ" value={detailItem.applicant?.relationshipToRequester} />
                    <DetailRow label="Ngày sinh" value={formatDate(detailItem.applicant?.dateOfBirth)} />
                    <DetailRow label="Giới tính" value={detailItem.applicant?.gender === 'male' ? 'Nam' : detailItem.applicant?.gender === 'female' ? 'Nữ' : 'Không rõ'} />
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Thông tin yêu cầu</Text>
                    <DetailRow label="Ngày nhập viện" value={formatDate(detailItem.preferredAdmissionDate)} />
                    <DetailRow label="Lý do" value={detailItem.reasonForAdmission || 'Không có'} />
                    <DetailRow label="SĐT liên hệ" value={detailItem.requestedByPhone || 'N/A'} />
                    {detailItem.notes ? <DetailRow label="Ghi chú" value={detailItem.notes} /> : null}
                    <DetailRow label="Ngày gửi" value={formatDate(detailItem.createdAt)} />
                  </View>

                  {detailItem.consultationScheduledAt && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Lịch tư vấn</Text>
                      <DetailRow label="Ngày hẹn" value={formatDate(detailItem.consultationScheduledAt)} />
                    </View>
                  )}

                  {isCancelled && (detailItem.cancellationReason || detailItem.rejectionReason) && (
                    <View style={[styles.detailSection, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}>
                      <Text style={[styles.detailSectionTitle, { color: '#991B1B' }]}>Lý do hủy / từ chối</Text>
                      <Text style={{ fontSize: 13, color: '#7F1D1D', fontStyle: 'italic' }}>
                        {detailItem.cancellationReason || detailItem.rejectionReason}
                      </Text>
                    </View>
                  )}

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Tiến trình</Text>
                    {isCancelled ? (
                      <View style={styles.cancelledBanner}>
                        <MaterialCommunityIcons name="close-circle" size={18} color="#991B1B" />
                        <Text style={{ color: '#991B1B', fontWeight: '600', fontSize: 13 }}>Yêu cầu đã bị hủy</Text>
                      </View>
                    ) : (
                      TIMELINE_STEPS.map((step, idx) => {
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
                      })
                    )}
                  </View>
                </>
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            {detailItem && CANCELLABLE.includes(detailItem.status) && (
              <Button textColor="#991B1B" onPress={() => { setCancelId(detailItem._id); setDetailItem(null); }}>Hủy yêu cầu</Button>
            )}
            <Button onPress={() => setDetailItem(null)}>Đóng</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Create dialog */}
        <Dialog visible={showCreate} onDismiss={() => setShowCreate(false)} style={{ borderRadius: 16 }}>
          <Dialog.Title style={{ fontSize: 16 }}>Gửi yêu cầu nhập viện</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 420 }}>
            <View style={{ paddingHorizontal: 4, gap: 2 }}>
              <TextInput label="Họ tên người thân *" mode="outlined" value={form.fullName} onChangeText={(v) => setForm((f) => ({ ...f, fullName: v }))} dense style={styles.input} />
              <TextInput label="Quan hệ *" mode="outlined" value={form.relationshipToRequester} onChangeText={(v) => setForm((f) => ({ ...f, relationshipToRequester: v }))} dense style={styles.input} placeholder="Con, cháu, vợ/chồng..." />
              <TextInput label="Ngày sinh (YYYY-MM-DD)" mode="outlined" value={form.dateOfBirth} onChangeText={(v) => setForm((f) => ({ ...f, dateOfBirth: v }))} dense style={styles.input} />
              <View style={styles.genderRow}>
                <Text style={{ fontSize: 12, color: '#6B7280', marginRight: 8 }}>Giới tính:</Text>
                {GENDERS.map((g) => (
                  <Chip key={g.value} selected={form.gender === g.value} onPress={() => setForm((f) => ({ ...f, gender: g.value }))} compact
                    style={form.gender === g.value ? { backgroundColor: COLOR } : undefined}
                    textStyle={form.gender === g.value ? { color: '#fff', fontSize: 12 } : { fontSize: 12 }}>
                    {g.label}
                  </Chip>
                ))}
              </View>
              <TextInput label="Ngày nhập viện mong muốn (YYYY-MM-DD)" mode="outlined" value={form.preferredAdmissionDate} onChangeText={(v) => setForm((f) => ({ ...f, preferredAdmissionDate: v }))} dense style={styles.input} />
              <TextInput label="Lý do nhập viện *" mode="outlined" value={form.reasonForAdmission} onChangeText={(v) => setForm((f) => ({ ...f, reasonForAdmission: v }))} dense multiline numberOfLines={3} style={styles.input} />
              <TextInput label="SĐT liên hệ" mode="outlined" value={form.requestedByPhone} onChangeText={(v) => setForm((f) => ({ ...f, requestedByPhone: v }))} dense keyboardType="phone-pad" style={styles.input} />
              <TextInput label="Ghi chú thêm" mode="outlined" value={form.notes} onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))} dense multiline style={styles.input} />
            </View>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowCreate(false)}>Hủy</Button>
            <Button mode="contained" buttonColor={COLOR} onPress={() => createMut.mutate()} loading={createMut.isPending}
              disabled={!form.fullName || !form.relationshipToRequester || !form.reasonForAdmission}>
              Gửi yêu cầu
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Cancel dialog */}
        <Dialog visible={!!cancelId} onDismiss={() => setCancelId(null)}>
          <Dialog.Title>Hủy yêu cầu nhập viện?</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: '#6B7280', marginBottom: 10 }}>Yêu cầu đã hủy không thể khôi phục.</Text>
            <TextInput label="Lý do hủy" mode="outlined" value={cancelReason} onChangeText={setCancelReason} dense multiline numberOfLines={3} />
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1 },
  sub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  reason: { fontSize: 12, color: '#374151', marginTop: 4, fontStyle: 'italic' },
  dateCreated: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },
  fab: { position: 'absolute' as const, bottom: 16, right: 16 },
  input: { marginBottom: 8 },
  genderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  detailSection: { marginBottom: 16, padding: 12, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  detailSectionTitle: { fontSize: 12, fontWeight: '700', color: COLOR, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  detailLabel: { fontSize: 13, color: '#6B7280' },
  detailValue: { fontSize: 13, fontWeight: '500', color: '#111827', maxWidth: '55%', textAlign: 'right' },
  cancelledBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6, position: 'relative' },
  timelineDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#D1D5DB', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  timelineDotActive: { borderWidth: 3, borderColor: COLOR },
  timelineLine: { position: 'absolute', left: 11, top: 24, width: 2, height: 14, backgroundColor: '#D1D5DB' },
  timelineLabel: { fontSize: 13, color: '#6B7280' },
});
