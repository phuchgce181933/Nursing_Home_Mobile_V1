import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Button, Dialog, Portal, TextInput, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { useToast } from '../../utils/toast';

const COLOR = '#2E7D32';

const STATUS_LABELS: Record<string, string> = {
  new_request: 'Yêu cầu mới',
  consulting: 'Đang tư vấn',
  assessing: 'Đang đánh giá',
  contracting: 'Ký hợp đồng',
  checked_in: 'Đã nhận',
  cancelled: 'Đã hủy',
};

const InfoRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
};

const TimelineItem: React.FC<{ label: string; date?: string | null; isLast?: boolean }> = ({ label, date, isLast }) => {
  if (!date) return null;
  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineDot} />
      {!isLast && <View style={styles.timelineLine} />}
      <View style={styles.timelineContent}>
        <Text style={styles.timelineLabel}>{label}</Text>
        <Text style={styles.timelineDate}>{new Date(date).toLocaleString('vi-VN')}</Text>
      </View>
    </View>
  );
};

export const AdmissionDetailScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const admissionId = route.params?.admissionId;
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const detailQ = useQuery({
    queryKey: ['admissionDetail', admissionId],
    queryFn: async () => { const r = await api.get(FAMILY.ADMISSION_DETAIL(admissionId)); return r.data; },
    enabled: !!admissionId,
  });

  const cancelMut = useMutation({
    mutationFn: async () => (await api.patch(FAMILY.ADMISSION_CANCEL(cancelId!), { cancellationReason: cancelReason })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admissionDetail'] });
      qc.invalidateQueries({ queryKey: ['admissions'] });
      setCancelId(null);
      setCancelReason('');
      toast('Đã hủy yêu cầu', 'success');
    },
    onError: () => toast('Không thể hủy', 'error'),
  });

  const item = detailQ.data?.data ?? detailQ.data;
  const canCancel = item?.status === 'new_request' || item?.status === 'consulting';

  const timelineEvents = item ? [
    { label: 'Gửi yêu cầu', date: item.requestedAt ?? item.createdAt },
    { label: 'Tư vấn', date: item.consultedAt },
    { label: 'Đánh giá', date: item.assessedAt },
    { label: 'Phê duyệt', date: item.approvedAt },
    { label: 'Ký hợp đồng', date: item.contractSignedAt },
    { label: 'Nhận phòng', date: item.checkInAt },
    { label: 'Hủy', date: item.cancelledAt },
  ].filter(e => e.date) : [];

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.topRow}>
          <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation.goBack()} />
          <Text style={styles.topTitle}>Chi tiết yêu cầu</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={false} onRefresh={detailQ.refetch} tintColor={COLOR} />}>
        <ScreenLayout loading={detailQ.isLoading} error={detailQ.error ? (detailQ.error as Error).message : null} onRetry={detailQ.refetch}>
          {item ? (
            <>
              <Card style={styles.card} mode="elevated">
                <Card.Content>
                  <View style={styles.headerRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.requestCode}>{item.requestCode ?? `#${item._id?.slice(-6)}`}</Text>
                      <Text style={styles.statusLabel}>{STATUS_LABELS[item.status] ?? item.status}</Text>
                    </View>
                    <StatusBadge status={item.status} size="md" />
                  </View>
                </Card.Content>
              </Card>

              <SectionHeader title="Thông tin người thân" roleColor={COLOR} />
              <Card style={styles.card} mode="outlined">
                <Card.Content>
                  <InfoRow label="Họ tên" value={item.applicant?.fullName} />
                  <InfoRow label="Quan hệ" value={item.applicant?.relationshipToRequester} />
                  <InfoRow label="Ngày sinh" value={item.applicant?.dateOfBirth ? new Date(item.applicant.dateOfBirth).toLocaleDateString('vi-VN') : null} />
                  <InfoRow label="Giới tính" value={item.applicant?.gender === 'male' ? 'Nam' : item.applicant?.gender === 'female' ? 'Nữ' : item.applicant?.gender} />
                  <InfoRow label="CCCD" value={item.applicant?.citizenId} />
                  <InfoRow label="Nhóm máu" value={item.applicant?.bloodType} />
                  <InfoRow label="Địa chỉ" value={item.applicant?.personalAddress} />
                  {item.applicant?.allergies?.length > 0 && <InfoRow label="Dị ứng" value={item.applicant.allergies.join(', ')} />}
                  {item.applicant?.chronicConditions?.length > 0 && <InfoRow label="Bệnh mãn tính" value={item.applicant.chronicConditions.join(', ')} />}
                  <InfoRow label="Tình trạng sức khỏe ban đầu" value={item.applicant?.initialHealthCondition} />
                </Card.Content>
              </Card>

              <SectionHeader title="Chi tiết yêu cầu" roleColor={COLOR} />
              <Card style={styles.card} mode="outlined">
                <Card.Content>
                  <InfoRow label="Ngày nhập mong muốn" value={item.preferredAdmissionDate ? new Date(item.preferredAdmissionDate).toLocaleDateString('vi-VN') : null} />
                  <InfoRow label="Lý do" value={item.reasonForAdmission} />
                  <InfoRow label="SĐT liên hệ" value={item.requestedByPhone} />
                  <InfoRow label="Ghi chú" value={item.notes} />
                  <InfoRow label="Ghi chú tư vấn" value={item.consultationNotes} />
                </Card.Content>
              </Card>

              {item.contractNumber && (
                <>
                  <SectionHeader title="Thông tin hợp đồng" roleColor={COLOR} />
                  <Card style={styles.card} mode="outlined">
                    <Card.Content>
                      <InfoRow label="Số hợp đồng" value={item.contractNumber} />
                      <InfoRow label="Ngày bắt đầu" value={item.contractStartDate ? new Date(item.contractStartDate).toLocaleDateString('vi-VN') : null} />
                      <InfoRow label="Ngày kết thúc" value={item.contractEndDate ? new Date(item.contractEndDate).toLocaleDateString('vi-VN') : null} />
                      <InfoRow label="Thời hạn" value={item.contractDurationMonths ? `${item.contractDurationMonths} tháng` : null} />
                      <InfoRow label="Giảm giá" value={item.contractDiscountPercent ? `${item.contractDiscountPercent}%` : null} />
                    </Card.Content>
                  </Card>
                </>
              )}

              {timelineEvents.length > 0 && (
                <>
                  <SectionHeader title="Tiến trình" roleColor={COLOR} />
                  <Card style={styles.card} mode="outlined">
                    <Card.Content>
                      {timelineEvents.map((e, i) => (
                        <TimelineItem key={i} label={e.label} date={e.date} isLast={i === timelineEvents.length - 1} />
                      ))}
                    </Card.Content>
                  </Card>
                </>
              )}

              {item.cancellationReason && (
                <Card style={[styles.card, { borderColor: '#FCA5A5' }]} mode="outlined">
                  <Card.Content>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#991B1B', marginBottom: 4 }}>Lý do hủy</Text>
                    <Text style={{ fontSize: 13, color: '#374151' }}>{item.cancellationReason}</Text>
                  </Card.Content>
                </Card>
              )}

              {canCancel && (
                <Button mode="contained" buttonColor="#991B1B" style={styles.cancelBtn}
                  onPress={() => setCancelId(item._id)}>
                  Hủy yêu cầu
                </Button>
              )}
            </>
          ) : null}
        </ScreenLayout>
      </ScrollView>

      <Portal>
        <Dialog visible={!!cancelId} onDismiss={() => setCancelId(null)}>
          <Dialog.Title>Hủy yêu cầu nhập viện?</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Lý do hủy" mode="outlined" value={cancelReason} onChangeText={setCancelReason} dense multiline />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCancelId(null)}>Đóng</Button>
            <Button mode="contained" buttonColor="#991B1B" onPress={() => cancelMut.mutate()} loading={cancelMut.isPending}>Hủy yêu cầu</Button>
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
  body: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 12, backgroundColor: '#fff' },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  requestCode: { fontSize: 18, fontWeight: '700', color: '#111827' },
  statusLabel: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  infoRow: { marginBottom: 10 },
  infoLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#111827' },
  timelineItem: { flexDirection: 'row', minHeight: 40, marginBottom: 4 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLOR, marginTop: 4, marginRight: 12 },
  timelineLine: { position: 'absolute', left: 4, top: 14, width: 2, height: 30, backgroundColor: '#D1D5DB' },
  timelineContent: { flex: 1 },
  timelineLabel: { fontSize: 13, fontWeight: '500', color: '#374151' },
  timelineDate: { fontSize: 11, color: '#9CA3AF' },
  cancelBtn: { borderRadius: 8, marginTop: 8 },
});
