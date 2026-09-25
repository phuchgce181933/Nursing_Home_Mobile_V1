import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Button, Dialog, Portal, TextInput } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { useToast } from '../../utils/toast';
import { BackHeader } from '../../components/layout/BackHeader';
import { formatRelationship, formatAdmissionReason, formatGender } from '../../utils/admissionOptions';

const COLOR = '#2E7D32';
const NS = 'family.admissions';

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
  const toast = useToast();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const admissionId = route.params?.admissionId;
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const STATUS_LABELS: Record<string, string> = {
    new_request: t(`${NS}.statusNew`), consulting: t(`${NS}.statusConsulting`), assessing: t(`${NS}.statusAssessing`),
    contracting: t(`${NS}.statusContracting`), checked_in: t(`${NS}.statusCheckedIn`), cancelled: t(`${NS}.statusCancelled`),
  };

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
      toast(t(`${NS}.toastCancelled`), 'success');
    },
    onError: () => toast(t(`${NS}.toastCancelError`), 'error'),
  });

  const item = detailQ.data?.data ?? detailQ.data;
  const canCancel = item?.status === 'new_request' || item?.status === 'consulting';

  const timelineEvents = item ? [
    { label: t(`${NS}.timelineRequested`), date: item.requestedAt ?? item.createdAt },
    { label: t(`${NS}.timelineConsulted`), date: item.consultedAt },
    { label: t(`${NS}.timelineAssessed`), date: item.assessedAt },
    { label: t(`${NS}.timelineApproved`), date: item.approvedAt },
    { label: t(`${NS}.timelineContractSigned`), date: item.contractSignedAt },
    { label: t(`${NS}.timelineCheckedIn`), date: item.checkInAt },
    { label: t(`${NS}.timelineCancelled`), date: item.cancelledAt },
  ].filter(e => e.date) : [];

  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.detailTitle`)} color={COLOR} onBack={() => navigation.goBack()} />

      <ScrollView style={styles.flex} contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={detailQ.isFetching} onRefresh={detailQ.refetch} tintColor={COLOR} />}>
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

              <SectionHeader title={t(`${NS}.relativeInfoTitle`)} roleColor={COLOR} />
              <Card style={styles.card} mode="outlined">
                <Card.Content>
                  <InfoRow label={t(`${NS}.fullName`)} value={item.applicant?.fullName} />
                  <InfoRow label={t(`${NS}.relationship`)} value={formatRelationship(item.applicant?.relationshipToRequester) || null} />
                  <InfoRow label={t(`${NS}.dob`)} value={item.applicant?.dateOfBirth ? new Date(item.applicant.dateOfBirth).toLocaleDateString('vi-VN') : null} />
                  <InfoRow label={t(`${NS}.gender`)} value={formatGender(item.applicant?.gender) || null} />
                  <InfoRow label={t(`${NS}.citizenId`)} value={item.applicant?.citizenId} />
                  <InfoRow label={t(`${NS}.bloodType`)} value={item.applicant?.bloodType} />
                  <InfoRow label={t(`${NS}.address`)} value={item.applicant?.personalAddress} />
                  {item.applicant?.allergies?.length > 0 && <InfoRow label={t(`${NS}.allergies`)} value={item.applicant.allergies.join(', ')} />}
                  {item.applicant?.chronicConditions?.length > 0 && <InfoRow label={t(`${NS}.chronicConditions`)} value={item.applicant.chronicConditions.join(', ')} />}
                  <InfoRow label={t(`${NS}.initialHealth`)} value={item.applicant?.initialHealthCondition} />
                </Card.Content>
              </Card>

              <SectionHeader title={t(`${NS}.requestDetailTitle`)} roleColor={COLOR} />
              <Card style={styles.card} mode="outlined">
                <Card.Content>
                  <InfoRow label={t(`${NS}.preferredDate`)} value={item.preferredAdmissionDate ? new Date(item.preferredAdmissionDate).toLocaleDateString('vi-VN') : null} />
                  <InfoRow label={t(`${NS}.reason`)} value={formatAdmissionReason(item.reasonForAdmission) || null} />
                  <InfoRow label={t(`${NS}.contactPhone`)} value={item.requestedByPhone} />
                  <InfoRow label={t(`${NS}.notes`)} value={item.notes} />
                  <InfoRow label={t(`${NS}.consultationNotes`)} value={item.consultationNotes} />
                </Card.Content>
              </Card>

              {item.contractNumber && (
                <>
                  <SectionHeader title={t(`${NS}.contractInfoTitle`)} roleColor={COLOR} />
                  <Card style={styles.card} mode="outlined">
                    <Card.Content>
                      <InfoRow label={t(`${NS}.contractNumber`)} value={item.contractNumber} />
                      <InfoRow label={t(`${NS}.startDate`)} value={item.contractStartDate ? new Date(item.contractStartDate).toLocaleDateString('vi-VN') : null} />
                      <InfoRow label={t(`${NS}.endDate`)} value={item.contractEndDate ? new Date(item.contractEndDate).toLocaleDateString('vi-VN') : null} />
                      <InfoRow label={t(`${NS}.duration`)} value={item.contractDurationMonths ? t(`${NS}.durationMonths`, { count: item.contractDurationMonths }) : null} />
                      <InfoRow label={t(`${NS}.discount`)} value={item.contractDiscountPercent ? `${item.contractDiscountPercent}%` : null} />
                    </Card.Content>
                  </Card>
                </>
              )}

              {timelineEvents.length > 0 && (
                <>
                  <SectionHeader title={t(`${NS}.progressTitle`)} roleColor={COLOR} />
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
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#991B1B', marginBottom: 4 }}>{t(`${NS}.cancellationReasonTitle`)}</Text>
                    <Text style={{ fontSize: 13, color: '#374151' }}>{item.cancellationReason}</Text>
                  </Card.Content>
                </Card>
              )}

              {canCancel && (
                <Button mode="contained" buttonColor="#991B1B" style={styles.cancelBtn}
                  onPress={() => setCancelId(item._id)}>
                  {t(`${NS}.cancelRequest`)}
                </Button>
              )}
            </>
          ) : null}
        </ScreenLayout>
      </ScrollView>

      <Portal>
        <Dialog visible={!!cancelId} onDismiss={() => setCancelId(null)}>
          <Dialog.Title>{t(`${NS}.cancelConfirmTitle`)}</Dialog.Title>
          <Dialog.Content>
            <TextInput label={t(`${NS}.cancelReasonLabel`)} mode="outlined" value={cancelReason} onChangeText={setCancelReason} dense multiline />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCancelId(null)}>{t(`${NS}.close`)}</Button>
            <Button mode="contained" buttonColor="#991B1B" onPress={() => cancelMut.mutate()} loading={cancelMut.isPending}>{t(`${NS}.cancelRequest`)}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
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
