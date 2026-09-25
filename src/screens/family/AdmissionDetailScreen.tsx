import React from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Button, Dialog, Portal, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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

// Nhóm máu: web hiển thị "Chưa xác định" khi giá trị rỗng/`unknown`, còn lại giữ nguyên
// (BLOOD_TYPES lưu ở backend là 'A+','O-',... nên không cần bảng dịch).
const formatBloodType = (v?: string | null, fallback = 'Chưa xác định') =>
  !v || v.toLowerCase() === 'unknown' ? fallback : v;

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : null);
const fmtDateTime = (d?: string | null) => (d ? new Date(d).toLocaleString('vi-VN') : null);

type StepState = 'done' | 'active' | 'pending';

const InfoRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
};

const Chips: React.FC<{ items?: string[]; emptyText: string; tone?: 'danger' | 'neutral' }> = ({
  items,
  emptyText,
  tone = 'neutral',
}) => {
  if (!items || items.length === 0) return <Text style={styles.emptyChipText}>{emptyText}</Text>;
  return (
    <View style={styles.chipWrap}>
      {items.map((c, i) => (
        <View key={`${c}-${i}`} style={[styles.chip, tone === 'danger' && styles.chipDanger]}>
          <Text style={[styles.chipText, tone === 'danger' && styles.chipTextDanger]}>{c}</Text>
        </View>
      ))}
    </View>
  );
};

export const AdmissionDetailScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const toast = useToast();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const admissionId: string | undefined = route.params?.admissionId;
  const [cancelId, setCancelId] = React.useState<string | null>(null);
  const [cancelReason, setCancelReason] = React.useState('');

  const STATUS_LABELS: Record<string, string> = {
    new_request: t(`${NS}.statusNew`),
    consulting: t(`${NS}.statusConsulting`),
    assessing: t(`${NS}.statusAssessing`),
    contracting: t(`${NS}.statusContracting`),
    checked_in: t(`${NS}.statusCheckedIn`),
    cancelled: t(`${NS}.statusCancelled`),
  };

  const detailQ = useQuery({
    queryKey: ['admissionDetail', admissionId],
    queryFn: async () => {
      const r = await api.get(FAMILY.ADMISSION_DETAIL(admissionId!));
      return r.data;
    },
    enabled: !!admissionId,
  });

  const cancelMut = useMutation({
    mutationFn: async () =>
      (await api.patch(FAMILY.ADMISSION_CANCEL(cancelId!), { cancellationReason: cancelReason })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admissionDetail'] });
      qc.invalidateQueries({ queryKey: ['admissions'] });
      qc.invalidateQueries({ queryKey: ['admissionsStats'] });
      setCancelId(null);
      setCancelReason('');
      toast(t(`${NS}.toastCancelled`), 'success');
    },
    onError: () => toast(t(`${NS}.toastCancelError`), 'error'),
  });

  // Backend GET /api/family/admission-requests/:id trả về { admission: {...} }
  // (admissionService.getAdmissionRequest → { admission: formatAdmission(...) }).
  // Lấy đúng nhánh `.admission`; giữ fallback phòng khi shape đổi.
  const item = detailQ.data?.admission ?? detailQ.data?.data ?? detailQ.data ?? null;

  // Mã yêu cầu hiển thị: khớp đúng web (#requestCode, fallback ANH-<4 ký tự đầu của _id>).
  const requestCode = item
    ? item.requestCode || (item._id ? `ANH-${String(item._id).substring(0, 4).toUpperCase()}` : '')
    : '';

  // Điều kiện hủy — giống hệt web (isCancellable): các trạng thái trước khi nhận viện và
  // chưa hoàn thành khám lâm sàng đầu vào.
  const intakeApptCompleted = item?.assignedCareAppointment?.status === 'completed';
  const canCancel =
    !!item &&
    ['new_request', 'consulting', 'assessing', 'contracting'].includes(item.status) &&
    !intakeApptCompleted;

  // Tiến trình xử lý — sao chép logic getTimelineSteps của web (done/active/pending).
  const status: string = item?.status;
  const timelineSteps: { key: string; title: string; statusText: string; date?: string | null; datePrefix?: string; state: StepState }[] = item
    ? [
        {
          key: 'new_request',
          title: t(`${NS}.tlNewRequest`),
          statusText: t(`${NS}.tlSent`),
          date: item.createdAt,
          state: 'done',
        },
        {
          key: 'consulting',
          title: t(`${NS}.tlConsulting`),
          statusText: ['consulting', 'assessing', 'contracting', 'checked_in'].includes(status)
            ? t(`${NS}.tlDone`)
            : t(`${NS}.tlPending`),
          date: item.consultedAt || item.consultationScheduledAt,
          datePrefix: !item.consultedAt && item.consultationScheduledAt ? `${t(`${NS}.tlScheduleLabel`)}: ` : undefined,
          state:
            ['assessing', 'contracting', 'checked_in'].includes(status) || item.consultedAt
              ? 'done'
              : status === 'consulting'
                ? 'active'
                : 'pending',
        },
        {
          key: 'assessing',
          title: t(`${NS}.tlAssessing`),
          statusText: ['assessing', 'contracting', 'checked_in'].includes(status)
            ? item.eligibilityStatus === 'eligible'
              ? t(`${NS}.tlEligible`)
              : item.eligibilityStatus === 'not_eligible'
                ? t(`${NS}.tlNotEligible`)
                : t(`${NS}.tlInProgress`)
            : t(`${NS}.tlPending`),
          date: item.assessedAt,
          state:
            ['contracting', 'checked_in'].includes(status) && item.eligibilityStatus === 'eligible'
              ? 'done'
              : status === 'assessing'
                ? 'active'
                : 'pending',
        },
        {
          key: 'contracting',
          title: t(`${NS}.tlContracting`),
          statusText: ['contracting', 'checked_in'].includes(status)
            ? status === 'checked_in'
              ? t(`${NS}.tlDone`)
              : t(`${NS}.tlContractInProgress`)
            : t(`${NS}.tlPending`),
          date: item.contractSignedAt,
          state: status === 'checked_in' ? 'done' : status === 'contracting' ? 'active' : 'pending',
        },
        {
          key: 'checked_in',
          title: t(`${NS}.tlCheckedIn`),
          statusText: status === 'checked_in' ? t(`${NS}.tlDone`) : t(`${NS}.tlPending`),
          date: item.checkInAt,
          state: status === 'checked_in' ? 'done' : 'pending',
        },
      ]
    : [];

  const scheduledDate =
    item?.assignedCareAppointment?.scheduledStartAt ||
    item?.initialAssessmentScheduledAt ||
    item?.consultationScheduledAt;
  const doctor = item?.assignedCareAppointment?.doctor;
  const nurse = item?.assignedCareAppointment?.nurse;

  const pkgName = item?.servicePackageId?.name || item?.assignedServicePackage;
  const hasContractCard =
    item &&
    (item.contractNumber ||
      item.assignedRoom ||
      item.assignedBed ||
      ['contracting', 'checked_in'].includes(item.status));

  // Không có admissionId (điều hướng sai) → trạng thái lỗi có kiểm soát, không render "#undefined".
  if (!admissionId) {
    return (
      <View style={styles.flex}>
        <BackHeader title={t(`${NS}.detailTitle`)} color={COLOR} onBack={() => navigation.goBack()} />
        <View style={styles.centerBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={40} color="#9CA3AF" />
          <Text style={styles.centerText}>{t(`${NS}.missingId`)}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.detailTitle`)} color={COLOR} onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={detailQ.isFetching} onRefresh={detailQ.refetch} tintColor={COLOR} />}
      >
        <ScreenLayout
          loading={detailQ.isLoading}
          error={detailQ.error ? (detailQ.error as Error).message : null}
          onRetry={detailQ.refetch}
        >
          {item ? (
            <>
              {/* Summary card */}
              <Card style={styles.card} mode="elevated">
                <Card.Content>
                  <View style={styles.headerRow}>
                    <View style={{ flex: 1 }}>
                      {!!requestCode && <Text style={styles.requestCode}>#{requestCode}</Text>}
                      <Text style={styles.statusLabel}>{STATUS_LABELS[item.status] ?? item.status}</Text>
                      {!!(item.requestedAt || item.createdAt) && (
                        <Text style={styles.submittedAt}>
                          {t(`${NS}.requestedAtLabel`)}: {fmtDate(item.requestedAt || item.createdAt)}
                        </Text>
                      )}
                    </View>
                    <StatusBadge status={item.status} size="md" />
                  </View>
                </Card.Content>
              </Card>

              {/* Tiến trình xử lý */}
              <SectionHeader title={t(`${NS}.processTitle`)} roleColor={COLOR} />
              <Card style={styles.card} mode="outlined">
                <Card.Content>
                  {item.status === 'cancelled' && (
                    <View style={styles.cancelledBanner}>
                      <Text style={styles.cancelledTitle}>{t(`${NS}.tlCancelledTitle`)}</Text>
                      {!!(item.cancelledAt || item.updatedAt) && (
                        <Text style={styles.cancelledDate}>
                          {t(`${NS}.tlCancelledDate`)}: {fmtDate(item.cancelledAt || item.updatedAt)}
                        </Text>
                      )}
                      {!!(item.cancellationReason || item.rejectionReason) && (
                        <Text style={styles.cancelledReason}>
                          {t(`${NS}.cancellationReasonTitle`)}: {item.cancellationReason || item.rejectionReason}
                        </Text>
                      )}
                    </View>
                  )}
                  {timelineSteps.map((step, i) => {
                    const isLast = i === timelineSteps.length - 1;
                    const dotStyle =
                      step.state === 'done'
                        ? styles.dotDone
                        : step.state === 'active'
                          ? styles.dotActive
                          : styles.dotPending;
                    const pillStyle =
                      step.state === 'done'
                        ? styles.pillDone
                        : step.state === 'active'
                          ? styles.pillActive
                          : styles.pillPending;
                    const pillTextStyle =
                      step.state === 'done'
                        ? styles.pillTextDone
                        : step.state === 'active'
                          ? styles.pillTextActive
                          : styles.pillTextPending;
                    return (
                      <View key={step.key} style={styles.timelineItem}>
                        <View style={styles.timelineGutter}>
                          <View style={[styles.timelineDot, dotStyle]}>
                            {step.state === 'done' && <MaterialCommunityIcons name="check" size={9} color="#fff" />}
                          </View>
                          {!isLast && <View style={styles.timelineLine} />}
                        </View>
                        <View style={styles.timelineContent}>
                          <Text style={styles.timelineTitle}>{step.title}</Text>
                          <View style={styles.timelineMetaRow}>
                            <View style={[styles.pill, pillStyle]}>
                              <Text style={[styles.pillText, pillTextStyle]}>{step.statusText}</Text>
                            </View>
                            {!!step.date && (
                              <Text style={styles.timelineDate}>
                                {step.datePrefix ?? ''}
                                {step.key === 'new_request' ? fmtDateTime(step.date) : fmtDate(step.date)}
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </Card.Content>
              </Card>

              {/* Người liên hệ chính */}
              <SectionHeader title={t(`${NS}.primaryContactTitle`)} roleColor={COLOR} />
              <Card style={styles.card} mode="outlined">
                <Card.Content>
                  <Text style={styles.personName}>
                    {item.familyAccount?.fullName || item.requestedByName || t(`${NS}.defaultContactName`)}
                  </Text>
                  <InfoRow
                    label={t(`${NS}.relationship`)}
                    value={formatRelationship(item.applicant?.relationshipToRequester)}
                  />
                  <InfoRow label={t(`${NS}.contactPhoneInForm`)} value={item.requestedByPhone} />
                  <InfoRow label={t(`${NS}.familyAccountPhone`)} value={item.familyAccount?.phone} />
                </Card.Content>
              </Card>

              {/* Thông tin người cao tuổi */}
              <SectionHeader title={t(`${NS}.elderlyInfoTitle`)} roleColor={COLOR} />
              <Card style={styles.card} mode="outlined">
                <Card.Content>
                  <Text style={styles.personName}>{item.applicant?.fullName || '—'}</Text>
                  <Text style={styles.personSubtitle}>{t(`${NS}.elderlySubtitle`)}</Text>
                  <View style={styles.divider} />
                  <InfoRow label={t(`${NS}.dob`)} value={fmtDate(item.applicant?.dateOfBirth)} />
                  <InfoRow label={t(`${NS}.gender`)} value={formatGender(item.applicant?.gender)} />
                  <InfoRow label={t(`${NS}.bloodType`)} value={formatBloodType(item.applicant?.bloodType)} />
                  <InfoRow label={t(`${NS}.citizenId`)} value={item.applicant?.citizenId} />
                  <InfoRow label={t(`${NS}.phone`)} value={item.applicant?.phone} />
                  <InfoRow label={t(`${NS}.address`)} value={item.applicant?.personalAddress} />
                </Card.Content>
              </Card>

              {/* Thông tin sức khỏe */}
              <SectionHeader title={t(`${NS}.healthInfoTitle`)} roleColor={COLOR} />
              <Card style={styles.card} mode="outlined">
                <Card.Content>
                  <Text style={styles.infoLabel}>{t(`${NS}.allergies`)}</Text>
                  <Chips items={item.applicant?.allergies} emptyText={t(`${NS}.noAllergies`)} tone="danger" />
                  <View style={{ height: 12 }} />
                  <Text style={styles.infoLabel}>{t(`${NS}.chronicConditions`)}</Text>
                  <Chips items={item.applicant?.chronicConditions} emptyText={t(`${NS}.noChronic`)} tone="danger" />
                  <View style={{ height: 12 }} />
                  <Text style={styles.infoLabel}>{t(`${NS}.healthSummary`)}</Text>
                  <Text style={styles.healthSummary}>
                    {item.applicant?.initialHealthCondition || t(`${NS}.noHealthSummary`)}
                  </Text>
                </Card.Content>
              </Card>

              {/* Lịch hẹn (nếu có) */}
              {!!scheduledDate && (
                <Card style={styles.card} mode="outlined">
                  <Card.Content>
                    <View style={styles.apptRow}>
                      <MaterialCommunityIcons name="calendar-clock" size={20} color={COLOR} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoLabel}>{t(`${NS}.tlScheduleLabel`)}</Text>
                        <Text style={styles.infoValue}>{fmtDateTime(scheduledDate)}</Text>
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              )}

              {/* Nhân viên y tế phụ trách */}
              {!!(doctor || nurse) && (
                <>
                  <SectionHeader title={t(`${NS}.medicalStaffTitle`)} roleColor={COLOR} />
                  <Card style={styles.card} mode="outlined">
                    <Card.Content>
                      <InfoRow label={t(`${NS}.doctorLabel`)} value={doctor?.fullName} />
                      <InfoRow label={t(`${NS}.nurseLabel`)} value={nurse?.fullName} />
                    </Card.Content>
                  </Card>
                </>
              )}

              {/* Gói dịch vụ được chỉ định */}
              {!!pkgName && (
                <>
                  <SectionHeader title={t(`${NS}.servicePackageTitle`)} roleColor={COLOR} />
                  <Card style={styles.card} mode="outlined">
                    <Card.Content>
                      <Text style={styles.pkgName}>{pkgName}</Text>
                      <InfoRow
                        label={t(`${NS}.packageTier`)}
                        value={item.servicePackageId?.tier ? String(item.servicePackageId.tier).toUpperCase() : null}
                      />
                      <InfoRow
                        label={t(`${NS}.packagePrice`)}
                        value={
                          item.servicePackageId?.monthlyPrice
                            ? t(`${NS}.packagePriceUnit`, { price: item.servicePackageId.monthlyPrice.toLocaleString('vi-VN') })
                            : null
                        }
                      />
                    </Card.Content>
                  </Card>
                </>
              )}

              {/* Hợp đồng & Thông tin lưu trú */}
              {hasContractCard && (
                <>
                  <SectionHeader title={t(`${NS}.contractResidenceTitle`)} roleColor={COLOR} />
                  <Card style={styles.card} mode="outlined">
                    <Card.Content>
                      <InfoRow label={t(`${NS}.contractNumber`)} value={item.contractNumber || t(`${NS}.noContract`)} />
                      <InfoRow label={t(`${NS}.startDate`)} value={fmtDate(item.contractStartDate)} />
                      <InfoRow label={t(`${NS}.endDate`)} value={fmtDate(item.contractEndDate)} />
                      <InfoRow
                        label={t(`${NS}.duration`)}
                        value={item.contractDurationMonths != null ? t(`${NS}.durationMonths`, { count: item.contractDurationMonths }) : null}
                      />
                      <InfoRow
                        label={t(`${NS}.discount`)}
                        value={item.contractDiscountPercent != null ? `${item.contractDiscountPercent}%` : null}
                      />
                      <InfoRow label={t(`${NS}.contractTerms`)} value={item.contractTerms} />
                      <InfoRow
                        label={t(`${NS}.room`)}
                        value={item.assignedRoom?.roomNumber ? `${item.assignedRoom.roomNumber}` : t(`${NS}.notAssignedRoom`)}
                      />
                      <InfoRow
                        label={t(`${NS}.bed`)}
                        value={item.assignedBed?.bedCode ? `${item.assignedBed.bedCode}` : t(`${NS}.notAssignedBed`)}
                      />
                    </Card.Content>
                  </Card>
                </>
              )}

              {/* Chi tiết yêu cầu tiếp nhận */}
              <SectionHeader title={t(`${NS}.intakeDetailTitle`)} roleColor={COLOR} />
              <Card style={styles.card} mode="outlined">
                <Card.Content>
                  <InfoRow label={t(`${NS}.preferredDate`)} value={fmtDate(item.preferredAdmissionDate)} />
                  <InfoRow label={t(`${NS}.relationship`)} value={formatRelationship(item.applicant?.relationshipToRequester)} />
                  <InfoRow
                    label={t(`${NS}.consultant`)}
                    value={
                      item.consultantId?.fullName
                        ? `${item.consultantId.fullName}${item.consultantId.role ? ` (${String(item.consultantId.role).toUpperCase()})` : ''}`
                        : null
                    }
                  />
                  <InfoRow label={t(`${NS}.reason`)} value={formatAdmissionReason(item.reasonForAdmission)} />
                  <InfoRow label={t(`${NS}.notes`)} value={item.notes} />
                  <InfoRow label={t(`${NS}.consultationNotes`)} value={item.consultationNotes} />
                </Card.Content>
              </Card>

              {canCancel && (
                <Button
                  mode="contained"
                  buttonColor="#991B1B"
                  icon="close-circle-outline"
                  style={styles.cancelBtn}
                  onPress={() => setCancelId(item._id)}
                >
                  {t(`${NS}.cancelRequest`)}
                </Button>
              )}
            </>
          ) : !detailQ.isLoading && !detailQ.error ? (
            <View style={styles.centerBox}>
              <MaterialCommunityIcons name="file-search-outline" size={40} color="#9CA3AF" />
              <Text style={styles.centerText}>{t(`${NS}.notFound`)}</Text>
            </View>
          ) : null}
        </ScreenLayout>
      </ScrollView>

      <Portal>
        <Dialog visible={!!cancelId} onDismiss={() => setCancelId(null)}>
          <Dialog.Title>{t(`${NS}.cancelConfirmTitle`)}</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>{t(`${NS}.cancelConfirmContent`)}</Text>
            <TextInput
              label={t(`${NS}.cancelReasonLabel`)}
              mode="outlined"
              value={cancelReason}
              onChangeText={setCancelReason}
              dense
              multiline
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCancelId(null)}>{t(`${NS}.close`)}</Button>
            <Button
              mode="contained"
              buttonColor="#991B1B"
              onPress={() => cancelMut.mutate()}
              loading={cancelMut.isPending}
            >
              {t(`${NS}.cancelRequest`)}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 16, paddingBottom: 48 },
  card: { borderRadius: 12, marginBottom: 12, backgroundColor: '#fff' },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  requestCode: { fontSize: 18, fontWeight: '700', color: '#111827' },
  statusLabel: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  submittedAt: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  infoRow: { marginBottom: 10 },
  infoLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#111827' },
  personName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  personSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  // Timeline
  timelineItem: { flexDirection: 'row' },
  timelineGutter: { alignItems: 'center', width: 22 },
  timelineDot: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  dotDone: { backgroundColor: COLOR },
  dotActive: { backgroundColor: '#1B365D' },
  dotPending: { backgroundColor: '#D1D5DB' },
  timelineLine: { flex: 1, width: 2, backgroundColor: '#E5E7EB', marginVertical: 2 },
  timelineContent: { flex: 1, paddingBottom: 16, paddingLeft: 4 },
  timelineTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  timelineMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  timelineDate: { fontSize: 11, color: '#9CA3AF' },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  pillText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  pillDone: { backgroundColor: '#DCFCE7' },
  pillTextDone: { color: '#15803D' },
  pillActive: { backgroundColor: '#E0E7FF' },
  pillTextActive: { color: '#1B365D' },
  pillPending: { backgroundColor: '#F1F5F9' },
  pillTextPending: { color: '#94A3B8' },
  cancelledBanner: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 10, padding: 12, marginBottom: 14 },
  cancelledTitle: { fontSize: 14, fontWeight: '700', color: '#991B1B' },
  cancelledDate: { fontSize: 12, color: '#B91C1C', marginTop: 3 },
  cancelledReason: { fontSize: 13, color: '#374151', marginTop: 4 },
  // Chips
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: { backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontSize: 12, color: '#334155', fontWeight: '500' },
  chipDanger: { backgroundColor: 'rgba(186,26,26,0.08)' },
  chipTextDanger: { color: '#BA1A1A' },
  emptyChipText: { fontSize: 12, color: '#94A3B8', fontStyle: 'italic', marginTop: 4 },
  healthSummary: {
    fontSize: 13,
    color: '#334155',
    fontStyle: 'italic',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  apptRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pkgName: { fontSize: 14, fontWeight: '700', color: '#1B365D', marginBottom: 8 },
  cancelBtn: { borderRadius: 8, marginTop: 8 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  centerText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  dialogText: { fontSize: 13, color: '#374151', marginBottom: 12 },
});
