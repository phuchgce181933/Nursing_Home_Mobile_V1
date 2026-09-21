import React, { useState, useMemo } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Button, Dialog, Portal, TextInput, Chip } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { ADMIN_ADMISSIONS, MEDICAL_ADMISSIONS } from '../../api/endpoints';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { BackHeader } from '../../components/layout/BackHeader';
import { CalendarPicker } from '../../components/shared/CalendarPicker';
import { useAuth } from '../../auth/useAuth';
import { useToast } from '../../utils/toast';
import { useAppTheme } from '../../theme/useAppTheme';
import type { AppColors } from '../../constants/theme';
import { formatLocalDate } from '../../utils/date';

const NS = 'nurse.admissions';
const MAX_TEXT_LENGTH = 500;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const todayStr = () => formatLocalDate(new Date());

type ScreenStyles = ReturnType<typeof createStyles>;

const InfoRow: React.FC<{ label: string; value?: string | null; styles: ScreenStyles }> = ({ label, value, styles }) => {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
};

export const AdmissionDetailScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const toast = useToast();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { colors, roleColor } = useAppTheme('nurse');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isDoctor = user?.role === 'doctor';
  const admissionId = route.params?.admissionId;

  const STATUS_LABELS: Record<string, string> = {
    new_request: t(`${NS}.filterNew`), consulting: t(`${NS}.filterConsulting`), assessing: t(`${NS}.filterAssessing`),
    contracting: t(`${NS}.filterContracting`), checked_in: t(`${NS}.filterCheckedIn`), cancelled: t(`${NS}.filterCancelled`),
  };

  const detailQ = useQuery({
    queryKey: ['nurseAdmissionDetail', admissionId],
    queryFn: async () => { const r = await api.get(ADMIN_ADMISSIONS.DETAIL(admissionId)); return r.data; },
    enabled: !!admissionId,
  });
  const item = detailQ.data?.admission ?? detailQ.data?.data ?? detailQ.data;

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['nurseAdmissionDetail', admissionId] });
    qc.invalidateQueries({ queryKey: ['adminAdmissions'] });
  };

  // ── Consultation ──────────────────────────────────────────────────────
  const [showConsult, setShowConsult] = useState(false);
  const [consultNotes, setConsultNotes] = useState('');
  const [consultGenNotes, setConsultGenNotes] = useState('');
  const [consultErrors, setConsultErrors] = useState<Record<string, string>>({});

  const consultMut = useMutation({
    mutationFn: async () => (await api.patch(MEDICAL_ADMISSIONS.CONSULTATION(admissionId), {
      consultationNotes: consultNotes.trim(),
      notes: consultGenNotes.trim() || undefined,
    })).data,
    onSuccess: () => { setShowConsult(false); setConsultNotes(''); setConsultGenNotes(''); invalidateAll(); toast(t(`${NS}.toastConsultationSaved`), 'success'); },
    onError: (err: any) => toast(err?.response?.data?.message || t(`${NS}.toastConsultationError`), 'error'),
  });

  const submitConsultation = () => {
    const next: Record<string, string> = {};
    if (!consultNotes.trim()) next.consultNotes = t(`${NS}.consultationNotesRequired`);
    if (consultNotes.length > MAX_TEXT_LENGTH || consultGenNotes.length > MAX_TEXT_LENGTH) next.consultNotes = t(`${NS}.errTooLong`);
    setConsultErrors(next);
    if (Object.keys(next).length === 0) consultMut.mutate();
  };

  // ── Schedule assessment ──────────────────────────────────────────────
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [assessmentNotes, setAssessmentNotes] = useState('');
  const [scheduleGenNotes, setScheduleGenNotes] = useState('');
  const [scheduleErrors, setScheduleErrors] = useState<Record<string, string>>({});

  const scheduleMut = useMutation({
    mutationFn: async () => {
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`);
      return (await api.patch(MEDICAL_ADMISSIONS.SCHEDULE_ASSESSMENT(admissionId), {
        scheduledAt: scheduledAt.toISOString(),
        initialAssessmentNotes: assessmentNotes.trim() || undefined,
        notes: scheduleGenNotes.trim() || undefined,
      })).data;
    },
    onSuccess: () => { setShowSchedule(false); setScheduleDate(''); setScheduleTime('09:00'); setAssessmentNotes(''); setScheduleGenNotes(''); invalidateAll(); toast(t(`${NS}.toastScheduleSaved`), 'success'); },
    onError: (err: any) => toast(err?.response?.data?.message || t(`${NS}.toastScheduleError`), 'error'),
  });

  const submitSchedule = () => {
    const next: Record<string, string> = {};
    if (!scheduleDate) next.scheduleDate = t(`${NS}.assessmentDateLabel`);
    if (!TIME_REGEX.test(scheduleTime)) next.scheduleTime = t(`${NS}.assessmentTimeInvalid`);
    if (scheduleDate && TIME_REGEX.test(scheduleTime)) {
      const dt = new Date(`${scheduleDate}T${scheduleTime}:00`);
      if (dt.getTime() <= Date.now()) next.scheduleDate = t(`${NS}.assessmentDateTimeFuture`);
    }
    setScheduleErrors(next);
    if (Object.keys(next).length === 0) scheduleMut.mutate();
  };

  // ── Evaluate eligibility (doctor only) ────────────────────────────────
  const [showEligibility, setShowEligibility] = useState(false);
  const [eligibilityStatus, setEligibilityStatus] = useState<'eligible' | 'not_eligible'>('eligible');
  const [assessmentResult, setAssessmentResult] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [eligibilityGenNotes, setEligibilityGenNotes] = useState('');
  const [eligibilityErrors, setEligibilityErrors] = useState<Record<string, string>>({});

  const eligibilityMut = useMutation({
    mutationFn: async () => (await api.patch(MEDICAL_ADMISSIONS.EVALUATE_ELIGIBILITY(admissionId), {
      eligibilityStatus,
      assessmentResult: assessmentResult.trim(),
      rejectionReason: eligibilityStatus === 'not_eligible' ? (rejectionReason.trim() || undefined) : undefined,
      notes: eligibilityGenNotes.trim() || undefined,
    })).data,
    onSuccess: () => { setShowEligibility(false); setAssessmentResult(''); setRejectionReason(''); setEligibilityGenNotes(''); invalidateAll(); toast(t(`${NS}.toastEvaluateSaved`), 'success'); },
    onError: (err: any) => toast(err?.response?.data?.message || t(`${NS}.toastEvaluateError`), 'error'),
  });

  const submitEligibility = () => {
    const next: Record<string, string> = {};
    if (!assessmentResult.trim()) next.assessmentResult = t(`${NS}.assessmentResultRequired`);
    if (assessmentResult.length > MAX_TEXT_LENGTH) next.assessmentResult = t(`${NS}.errTooLong`);
    if (eligibilityStatus === 'not_eligible' && rejectionReason.length > MAX_TEXT_LENGTH) next.rejectionReason = t(`${NS}.errTooLong`);
    setEligibilityErrors(next);
    if (Object.keys(next).length === 0) eligibilityMut.mutate();
  };

  const canConsult = item && ['new_request', 'consulting', 'assessing', 'contracting'].includes(item.status);
  const canSchedule = item && ['new_request', 'consulting', 'assessing'].includes(item.status);
  const canEvaluate = isDoctor && item && ['new_request', 'consulting', 'assessing', 'contracting'].includes(item.status);

  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.detailTitle`)} color={roleColor} onBack={() => navigation.goBack()} />

      <ScrollView style={styles.flex} contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={detailQ.isFetching} onRefresh={detailQ.refetch} tintColor={roleColor} />}>
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

              <SectionHeader title={t(`${NS}.fullName`)} roleColor={roleColor} />
              <Card style={styles.card} mode="outlined">
                <Card.Content>
                  <InfoRow label={t(`${NS}.fullName`)} value={item.applicant?.fullName} styles={styles} />
                  <InfoRow label={t(`${NS}.relationship`)} value={item.applicant?.relationshipToRequester} styles={styles} />
                  <InfoRow label={t(`${NS}.dob`)} value={item.applicant?.dateOfBirth ? new Date(item.applicant.dateOfBirth).toLocaleDateString('vi-VN') : null} styles={styles} />
                  <InfoRow label={t(`${NS}.gender`)} value={item.applicant?.gender === 'male' ? t(`${NS}.male`) : item.applicant?.gender === 'female' ? t(`${NS}.female`) : item.applicant?.gender} styles={styles} />
                  {item.applicant?.allergies?.length > 0 && <InfoRow label={t(`${NS}.allergies`)} value={item.applicant.allergies.join(', ')} styles={styles} />}
                  {item.applicant?.chronicConditions?.length > 0 && <InfoRow label={t(`${NS}.chronicConditions`)} value={item.applicant.chronicConditions.join(', ')} styles={styles} />}
                </Card.Content>
              </Card>

              <SectionHeader title={t(`${NS}.reason`)} roleColor={roleColor} />
              <Card style={styles.card} mode="outlined">
                <Card.Content>
                  <InfoRow label={t(`${NS}.preferredDate`)} value={item.preferredAdmissionDate ? new Date(item.preferredAdmissionDate).toLocaleDateString('vi-VN') : null} styles={styles} />
                  <InfoRow label={t(`${NS}.reason`)} value={item.reasonForAdmission} styles={styles} />
                  <InfoRow label={t(`${NS}.phone`)} value={item.requestedByPhone} styles={styles} />
                  <InfoRow label={t(`${NS}.notes`)} value={item.notes} styles={styles} />
                  <InfoRow label={t(`${NS}.consultationNotes`)} value={item.consultationNotes} styles={styles} />
                  <InfoRow label={t(`${NS}.assessmentResultLabel`)} value={item.assessmentResult} styles={styles} />
                </Card.Content>
              </Card>

              <View style={styles.actionsRow}>
                {canConsult && (
                  <Button mode="contained" buttonColor={roleColor} onPress={() => setShowConsult(true)} style={styles.actionBtn}>
                    {t(`${NS}.actionConsultation`)}
                  </Button>
                )}
                {canSchedule && (
                  <Button mode="contained" buttonColor={roleColor} onPress={() => setShowSchedule(true)} style={styles.actionBtn}>
                    {t(`${NS}.actionScheduleAssessment`)}
                  </Button>
                )}
                {canEvaluate && (
                  <Button mode="contained" buttonColor="#1E3A8A" onPress={() => setShowEligibility(true)} style={styles.actionBtn}>
                    {t(`${NS}.actionEvaluateEligibility`)}
                  </Button>
                )}
              </View>
            </>
          ) : null}
        </ScreenLayout>
      </ScrollView>

      <Portal>
        {/* Consultation modal */}
        <Dialog visible={showConsult} onDismiss={() => setShowConsult(false)} style={{ borderRadius: 16 }}>
          <Dialog.Title>{t(`${NS}.actionConsultation`)}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 400 }}>
            <TextInput label={t(`${NS}.consultationNotesLabel`)} mode="outlined" value={consultNotes} onChangeText={setConsultNotes} dense multiline style={styles.input} error={!!consultErrors.consultNotes} maxLength={MAX_TEXT_LENGTH} />
            {consultErrors.consultNotes ? <Text style={styles.errText}>{consultErrors.consultNotes}</Text> : null}
            <Text style={styles.charCount}>{consultNotes.length}/{MAX_TEXT_LENGTH}</Text>
            <TextInput label={t(`${NS}.generalNotesLabel`)} mode="outlined" value={consultGenNotes} onChangeText={setConsultGenNotes} dense multiline style={styles.input} maxLength={MAX_TEXT_LENGTH} />
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowConsult(false)}>{t('common.cancel')}</Button>
            <Button mode="contained" buttonColor={roleColor} onPress={submitConsultation} loading={consultMut.isPending}>{t(`${NS}.save`)}</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Schedule assessment modal */}
        <Dialog visible={showSchedule} onDismiss={() => setShowSchedule(false)} style={{ borderRadius: 16 }}>
          <Dialog.Title>{t(`${NS}.actionScheduleAssessment`)}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 400 }}>
            <CalendarPicker label={t(`${NS}.assessmentDateLabel`)} value={scheduleDate} onChange={setScheduleDate} minDate={todayStr()} color={roleColor} />
            {scheduleErrors.scheduleDate ? <Text style={styles.errText}>{scheduleErrors.scheduleDate}</Text> : null}
            <TextInput label={t(`${NS}.assessmentTimeLabel`)} mode="outlined" value={scheduleTime} onChangeText={setScheduleTime} dense style={styles.input} placeholder="09:00" error={!!scheduleErrors.scheduleTime} maxLength={5} />
            {scheduleErrors.scheduleTime ? <Text style={styles.errText}>{scheduleErrors.scheduleTime}</Text> : null}
            <TextInput label={t(`${NS}.initialAssessmentNotesLabel`)} mode="outlined" value={assessmentNotes} onChangeText={setAssessmentNotes} dense multiline style={styles.input} maxLength={MAX_TEXT_LENGTH} />
            <TextInput label={t(`${NS}.generalNotesLabel`)} mode="outlined" value={scheduleGenNotes} onChangeText={setScheduleGenNotes} dense multiline style={styles.input} maxLength={MAX_TEXT_LENGTH} />
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowSchedule(false)}>{t('common.cancel')}</Button>
            <Button mode="contained" buttonColor={roleColor} onPress={submitSchedule} loading={scheduleMut.isPending}>{t(`${NS}.save`)}</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Evaluate eligibility modal (doctor only) */}
        <Dialog visible={showEligibility} onDismiss={() => setShowEligibility(false)} style={{ borderRadius: 16 }}>
          <Dialog.Title>{t(`${NS}.actionEvaluateEligibility`)}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 440 }}>
            <Text style={styles.chipLabel}>{t(`${NS}.eligibilityStatusLabel`)}</Text>
            <View style={styles.chipRow}>
              <Chip selected={eligibilityStatus === 'eligible'} onPress={() => setEligibilityStatus('eligible')}
                style={eligibilityStatus === 'eligible' ? { backgroundColor: roleColor } : undefined}
                textStyle={eligibilityStatus === 'eligible' ? { color: '#fff' } : undefined}>
                {t(`${NS}.eligibleOption`)}
              </Chip>
              <Chip selected={eligibilityStatus === 'not_eligible'} onPress={() => setEligibilityStatus('not_eligible')}
                style={eligibilityStatus === 'not_eligible' ? { backgroundColor: '#991B1B' } : undefined}
                textStyle={eligibilityStatus === 'not_eligible' ? { color: '#fff' } : undefined}>
                {t(`${NS}.notEligibleOption`)}
              </Chip>
            </View>
            <TextInput label={t(`${NS}.assessmentResultLabel`)} mode="outlined" value={assessmentResult} onChangeText={setAssessmentResult} dense multiline style={styles.input} error={!!eligibilityErrors.assessmentResult} maxLength={MAX_TEXT_LENGTH} />
            {eligibilityErrors.assessmentResult ? <Text style={styles.errText}>{eligibilityErrors.assessmentResult}</Text> : null}
            <Text style={styles.charCount}>{assessmentResult.length}/{MAX_TEXT_LENGTH}</Text>
            {eligibilityStatus === 'not_eligible' && (
              <>
                <TextInput label={t(`${NS}.rejectionReasonLabel`)} mode="outlined" value={rejectionReason} onChangeText={setRejectionReason} dense multiline style={styles.input} error={!!eligibilityErrors.rejectionReason} maxLength={MAX_TEXT_LENGTH} />
                {eligibilityErrors.rejectionReason ? <Text style={styles.errText}>{eligibilityErrors.rejectionReason}</Text> : null}
              </>
            )}
            <TextInput label={t(`${NS}.generalNotesLabel`)} mode="outlined" value={eligibilityGenNotes} onChangeText={setEligibilityGenNotes} dense multiline style={styles.input} maxLength={MAX_TEXT_LENGTH} />
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowEligibility(false)}>{t('common.cancel')}</Button>
            <Button mode="contained" buttonColor="#1E3A8A" onPress={submitEligibility} loading={eligibilityMut.isPending}>{t(`${NS}.save`)}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const createStyles = (c: AppColors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.background },
  body: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 12, backgroundColor: c.surface },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  requestCode: { fontSize: 18, fontWeight: '700', color: c.text },
  statusLabel: { fontSize: 13, color: c.textSecondary, marginTop: 2 },
  infoRow: { marginBottom: 10 },
  infoLabel: { fontSize: 11, color: c.textMuted, marginBottom: 2 },
  infoValue: { fontSize: 14, color: c.text },
  actionsRow: { gap: 8, marginTop: 8 },
  actionBtn: { borderRadius: 8 },
  input: { marginBottom: 8 },
  errText: { color: '#DC2626', fontSize: 11, marginTop: -4, marginBottom: 8 },
  charCount: { color: c.textMuted, fontSize: 10, textAlign: 'right', marginTop: -4, marginBottom: 8 },
  chipLabel: { fontSize: 11, color: c.textSecondary, marginBottom: 6, marginTop: 2 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
});
