import React, { useState, useMemo } from 'react';
import { ScrollView, View, FlatList, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Text, Card, Button, TextInput, Portal, Modal, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useResidents, useResidentDetail, useResidentVitals, useCaregiverResidents, useCaregiverResidentDetail } from '../../hooks/useResidents';
import { useAuth } from '../../auth/useAuth';
import { AlertBanner } from '../../components/shared/AlertBanner';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { BackHeader } from '../../components/layout/BackHeader';
import { AvatarCircle } from '../../components/shared/AvatarCircle';
import { useToast } from '../../utils/toast';
import api from '../../api/axiosInstance';
import { RESIDENTS } from '../../api/endpoints';
import { getStatusEntry } from '../../utils/statusMap';
import { useAppTheme } from '../../theme/useAppTheme';
import type { AppColors } from '../../constants/theme';

const NS = 'nurse.vitalSigns';

type Severity = 'critical' | 'warning' | 'normal';
// Proxy status keys reused from statusMap's hue table so vital-sign severity gets the
// same success/warning/danger hues (with dark-mode variants) as everywhere else in the app.
const SEVERITY_STATUS_KEY: Record<Severity, string> = { normal: 'low', warning: 'medium', critical: 'critical' };

export const VitalSignsScreen: React.FC<{ route?: any; navigation?: any }> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { colors, roleColor, scheme } = useAppTheme('nurse');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isCaregiver = user?.role === 'caregiver';

  const [selectedId, setSelectedId] = useState<string | undefined>(route?.params?.residentId);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    bloodPressureSystolic: '', bloodPressureDiastolic: '', pulse: '',
    temperatureCelsius: '', oxygenSaturation: '', bloodSugar: '',
  });

  const nurseResidentsQ = useResidents({ status: 'admitted', search: search || undefined }, { enabled: !isCaregiver });
  const caregiverResidentsQ = useCaregiverResidents({ search: search || undefined }, { enabled: isCaregiver });
  const residentsQ = isCaregiver ? caregiverResidentsQ : nurseResidentsQ;
  const allResidents = Array.isArray(residentsQ.data) ? residentsQ.data : (residentsQ.data?.data ?? []);

  const nurseResidentQ = useResidentDetail(selectedId, { enabled: !isCaregiver });
  const caregiverResidentQ = useCaregiverResidentDetail(selectedId, { enabled: isCaregiver });
  const residentQ = isCaregiver ? caregiverResidentQ : nurseResidentQ;
  const vitalsQ = useResidentVitals(selectedId);
  // Nurse detail endpoint returns { resident }, caregiver endpoint returns { data } — unwrap both.
  const resident = residentQ.data?.resident ?? residentQ.data?.data ?? residentQ.data;
  const vitals = vitalsQ.data?.data ?? vitalsQ.data ?? [];
  const latest = Array.isArray(vitals) ? vitals[0] : vitals;

  const recordMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await api.post(RESIDENTS.MEDICAL_RECORDS(selectedId!), body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vitals', selectedId] });
      setShowForm(false);
      setForm({ bloodPressureSystolic: '', bloodPressureDiastolic: '', pulse: '', temperatureCelsius: '', oxygenSaturation: '', bloodSugar: '' });
      toast(t(`${NS}.toastSaved`), 'success');
    },
    onError: (e: any) => toast(e.response?.data?.message ?? t(`${NS}.toastSaveError`), 'error'),
  });

  // Kept in sync with backend VITAL_RANGES (services/medicalRecordService.js) so client rejection matches server rejection.
  const RANGES: Record<string, { min: number; max: number; label: string }> = {
    bloodPressureSystolic: { min: 60, max: 260, label: t(`${NS}.bloodPressureSystolic`) },
    bloodPressureDiastolic: { min: 30, max: 160, label: t(`${NS}.bloodPressureDiastolic`) },
    pulse: { min: 30, max: 220, label: t(`${NS}.pulse`) },
    temperatureCelsius: { min: 30, max: 45, label: t(`${NS}.temperature`) },
    oxygenSaturation: { min: 0, max: 100, label: t(`${NS}.spo2`) },
    bloodSugar: { min: 20, max: 800, label: t(`${NS}.bloodSugar`) },
  };

  const WARN: Record<string, { low?: number; high?: number }> = {
    bloodPressureSystolic: { high: 140 },
    bloodPressureDiastolic: { high: 90 },
    pulse: { low: 50, high: 120 },
    temperatureCelsius: { high: 38 },
    oxygenSaturation: { low: 95 },
    bloodSugar: { low: 70, high: 200 },
  };

  const [formError, setFormError] = useState('');

  const handleSubmit = () => {
    setFormError('');
    const body: Record<string, number> = {};
    const errors: string[] = [];
    Object.entries(form).forEach(([k, v]) => {
      if (!v) return;
      const n = Number(v);
      const r = RANGES[k];
      if (r && (n < r.min || n > r.max)) {
        errors.push(t(`${NS}.warnOutOfRange`, { label: r.label, min: r.min, max: r.max }));
      } else {
        body[k] = n;
      }
    });
    if (
      body.bloodPressureSystolic !== undefined &&
      body.bloodPressureDiastolic !== undefined &&
      body.bloodPressureDiastolic >= body.bloodPressureSystolic
    ) {
      errors.push(t(`${NS}.warnDiastolicTooHigh`));
    }
    if (errors.length > 0) { setFormError(errors.join('\n')); return; }
    if (Object.keys(body).length === 0) { setFormError(t(`${NS}.warnMinOneField`)); return; }
    recordMutation.mutate(body);
  };

  const CRITICAL: Record<string, { low?: number; high?: number }> = {
    bloodPressureSystolic: { low: 70, high: 180 },
    bloodPressureDiastolic: { low: 40, high: 120 },
    pulse: { low: 40, high: 150 },
    temperatureCelsius: { low: 34, high: 39.5 },
    oxygenSaturation: { low: 90 },
    bloodSugar: { low: 50, high: 400 },
  };

  const getVitalSeverity = (key: string, val: number | undefined): Severity => {
    if (val == null) return 'normal';
    const c = CRITICAL[key];
    if (c) {
      if ((c.low != null && val < c.low) || (c.high != null && val > c.high)) return 'critical';
    }
    const w = WARN[key];
    if (w) {
      if ((w.low != null && val < w.low) || (w.high != null && val > w.high)) return 'warning';
    }
    return 'normal';
  };

  const getSevColors = (sev: Severity) => {
    const entry = getStatusEntry(SEVERITY_STATUS_KEY[sev], scheme);
    return { bg: entry.bgColor, text: entry.textColor, value: entry.textColor };
  };

  const getAlerts = (): { severity: 'critical' | 'warning'; messages: string[] } | null => {
    if (!latest) return null;
    const criticals: string[] = [];
    const warnings: string[] = [];
    const checks: { key: string; val: number | undefined; label: string }[] = [
      { key: 'bloodPressureSystolic', val: latest.bloodPressureSystolic, label: t(`${NS}.bloodPressureSystolic`) },
      { key: 'bloodPressureDiastolic', val: latest.bloodPressureDiastolic, label: t(`${NS}.bloodPressureDiastolic`) },
      { key: 'pulse', val: latest.pulse, label: t(`${NS}.pulse`) },
      { key: 'temperatureCelsius', val: latest.temperatureCelsius, label: t(`${NS}.temperature`) },
      { key: 'oxygenSaturation', val: latest.oxygenSaturation, label: t(`${NS}.spo2`) },
      { key: 'bloodSugar', val: latest.bloodSugar, label: t(`${NS}.bloodSugar`) },
    ];
    for (const { key, val, label } of checks) {
      if (val == null) continue;
      const sev = getVitalSeverity(key, val);
      if (sev === 'critical') criticals.push(label);
      else if (sev === 'warning') warnings.push(label);
    }
    if (criticals.length > 0) return { severity: 'critical', messages: criticals };
    if (warnings.length > 0) return { severity: 'warning', messages: warnings };
    return null;
  };

  const alerts = getAlerts();

  const getCardSeverity = (keys: { key: string; val: number | undefined }[]): Severity => {
    const sevs = keys.map(k => getVitalSeverity(k.key, k.val));
    if (sevs.includes('critical')) return 'critical';
    if (sevs.includes('warning')) return 'warning';
    return 'normal';
  };

  const vitalCards = latest ? [
    { label: t(`${NS}.bloodPressure`), value: `${latest.bloodPressureSystolic ?? '--'}/${latest.bloodPressureDiastolic ?? '--'}`, unit: 'mmHg',
      severity: getCardSeverity([{ key: 'bloodPressureSystolic', val: latest.bloodPressureSystolic }, { key: 'bloodPressureDiastolic', val: latest.bloodPressureDiastolic }]) },
    { label: t(`${NS}.pulse`), value: latest.pulse ?? '--', unit: 'bpm',
      severity: getVitalSeverity('pulse', latest.pulse) },
    { label: t(`${NS}.temperature`), value: latest.temperatureCelsius ?? '--', unit: '°C',
      severity: getVitalSeverity('temperatureCelsius', latest.temperatureCelsius) },
    { label: t(`${NS}.spo2`), value: latest.oxygenSaturation ?? '--', unit: '%',
      severity: getVitalSeverity('oxygenSaturation', latest.oxygenSaturation) },
    { label: t(`${NS}.bloodSugar`), value: latest.bloodSugar ?? '--', unit: 'mg/dL',
      severity: getVitalSeverity('bloodSugar', latest.bloodSugar) },
  ] : [];

  if (!selectedId) {
    return (
      <View style={styles.flex}>
        <BackHeader title={t(`${NS}.title`)} color={roleColor} onBack={() => navigation?.goBack()} />
        <View style={{ padding: 12 }}>
          <TextInput placeholder={t(`${NS}.searchPlaceholder`)} mode="outlined" value={search}
            onChangeText={setSearch} dense style={{ backgroundColor: colors.surface, marginBottom: 8 }}
            left={<TextInput.Icon icon="magnify" />} />
        </View>
        <ScreenLayout loading={residentsQ.isLoading} error={residentsQ.error ? (residentsQ.error as Error).message : null}
          onRetry={residentsQ.refetch} isEmpty={allResidents.length === 0} emptyMessage={t(`${NS}.empty`)}>
          <FlatList data={allResidents} keyExtractor={(i: any) => i._id} contentContainerStyle={{ padding: 16 }}
            refreshControl={<RefreshControl refreshing={residentsQ.isFetching} onRefresh={residentsQ.refetch} tintColor={roleColor} />}
            renderItem={({ item }) => (
              <Pressable onPress={() => setSelectedId(item._id)} style={styles.residentItem}>
                <AvatarCircle name={item.fullName} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.residentName}>{item.fullName}</Text>
                  <Text style={styles.residentCode}>{item.residentCode} · {(item.roomId?.roomNumber ?? item.area?.room?.roomNumber) ? t(`${NS}.room`, { room: item.roomId?.roomNumber ?? item.area?.room?.roomNumber }) : ''}</Text>
                </View>
              </Pressable>
            )} />
        </ScreenLayout>
      </View>
    );
  }

  const refetch = () => { residentQ.refetch(); vitalsQ.refetch(); };
  const isFetching = residentQ.isFetching || vitalsQ.isFetching;

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { backgroundColor: roleColor, paddingTop: insets.top }]}>
        <View style={styles.topRow}>
          <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => setSelectedId(undefined)} />
          <View style={{ flex: 1 }}>
            <Text style={styles.topTitle}>{resident?.fullName ?? t(`${NS}.title`)}</Text>
            <Text style={styles.topSub}>{resident?.residentCode ?? ''} · {resident?.gender === 'male' ? t(`${NS}.male`) : t(`${NS}.female`)}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={roleColor} />}>
        <ScreenLayout loading={residentQ.isLoading || vitalsQ.isLoading}
          error={residentQ.error ? (residentQ.error as Error).message : null} onRetry={refetch}>
          {alerts ? (
            <AlertBanner
              message={alerts.severity === 'critical'
                ? `${alerts.messages.join(', ')} — ${t(`${NS}.criticalSuffix`)}`
                : `${alerts.messages.join(', ')} — ${t(`${NS}.warningSuffix`)}`}
              severity={alerts.severity}
            />
          ) : null}

          <SectionHeader title={t(`${NS}.currentVitals`)} roleColor={roleColor} />
          {vitalCards.length > 0 ? (
            <View style={styles.vitalsGrid}>
              {vitalCards.map((v, i) => {
                const sc = getSevColors(v.severity);
                return (
                  <Card key={i} style={[styles.vitalCard, { backgroundColor: sc.bg }]}>
                    <Card.Content style={styles.vitalContent}>
                      <Text style={[styles.vitalValue, { color: sc.value }]}>{v.value}</Text>
                      <Text style={[styles.vitalUnit, { color: sc.text }]}>{v.unit}</Text>
                      <Text style={[styles.vitalLabel, { color: sc.text }]}>{v.label}</Text>
                    </Card.Content>
                  </Card>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyText}>{t(`${NS}.noVitalsData`)}</Text>
          )}

          {latest?.measuredAt && (
            <Text style={styles.measuredAt}>{t(`${NS}.measuredAt`, { time: new Date(latest.measuredAt).toLocaleString('vi-VN') })}</Text>
          )}

          <Button mode="contained" buttonColor={roleColor} style={styles.updateBtn} onPress={() => setShowForm(true)}>
            {t(`${NS}.updateButton`)}
          </Button>
        </ScreenLayout>
      </ScrollView>

      <Portal>
        <Modal visible={showForm} onDismiss={() => setShowForm(false)} contentContainerStyle={styles.modal}>
          <Text style={styles.modalTitle}>{t(`${NS}.modalTitle`)}</Text>
          <Text style={styles.modalSub}>{resident?.fullName ?? ''}</Text>
          {[
            { key: 'bloodPressureSystolic', label: t(`${NS}.bpSystolicUnit`) },
            { key: 'bloodPressureDiastolic', label: t(`${NS}.bpDiastolicUnit`) },
            { key: 'pulse', label: t(`${NS}.pulseUnit`) },
            { key: 'temperatureCelsius', label: t(`${NS}.temperatureUnit`) },
            { key: 'oxygenSaturation', label: t(`${NS}.spo2Unit`) },
            { key: 'bloodSugar', label: t(`${NS}.bloodSugarUnit`) },
          ].map(({ key, label }) => {
            const v = (form as any)[key];
            const n = v ? Number(v) : null;
            const r = RANGES[key];
            const w = WARN[key];
            const isOutOfRange = n !== null && r && (n < r.min || n > r.max);
            const isAbnormal = n !== null && w && !isOutOfRange && ((w.low && n < w.low) || (w.high && n > w.high));
            return (
              <View key={key}>
                <TextInput label={label} mode="outlined" keyboardType="numeric"
                  value={v} onChangeText={(val) => { setForm((f) => ({ ...f, [key]: val })); setFormError(''); }}
                  style={styles.formInput} dense
                  error={!!isOutOfRange} />
                {isOutOfRange && <Text style={styles.fieldError}>{t(`${NS}.rangeError`, { min: r.min, max: r.max })}</Text>}
                {isAbnormal && <Text style={styles.fieldWarn}>{t(`${NS}.abnormalWarning`)}</Text>}
              </View>
            );
          })}
          {formError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <Button mode="outlined" onPress={() => { setShowForm(false); setFormError(''); }} style={{ flex: 1 }}>{t('common.cancel')}</Button>
            <Button mode="contained" buttonColor={roleColor} onPress={handleSubmit}
              loading={recordMutation.isPending} style={{ flex: 1 }}>{t('common.save')}</Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
};

const createStyles = (c: AppColors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.background },
  topBar: { paddingHorizontal: 4, paddingBottom: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  topSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 1 },
  body: { padding: 16, paddingBottom: 32 },
  residentItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderRadius: 12, padding: 14, marginBottom: 8 },
  residentName: { fontSize: 14, fontWeight: '600', color: c.text },
  residentCode: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vitalCard: { width: '48%', borderRadius: 12 },
  vitalContent: { alignItems: 'center', paddingVertical: 12 },
  vitalValue: { fontSize: 20, fontWeight: '700', color: c.text },
  vitalUnit: { fontSize: 11, color: c.textMuted },
  vitalLabel: { fontSize: 12, color: c.textSecondary, marginTop: 4 },
  emptyText: { fontSize: 13, color: c.textMuted, textAlign: 'center', paddingVertical: 24 },
  measuredAt: { fontSize: 11, color: c.textMuted, textAlign: 'center', marginTop: 8 },
  updateBtn: { marginTop: 24, borderRadius: 8 },
  modal: { backgroundColor: c.surface, margin: 24, padding: 20, borderRadius: 16 },
  modalTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2, color: c.text },
  modalSub: { fontSize: 13, color: c.textSecondary, marginBottom: 12 },
  formInput: { marginBottom: 2 },
  fieldError: { fontSize: 11, color: '#DC2626', marginBottom: 6, marginLeft: 4 },
  fieldWarn: { fontSize: 11, color: '#D97706', marginBottom: 6, marginLeft: 4 },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 8, padding: 10, marginTop: 4, borderLeftWidth: 3, borderLeftColor: '#EF4444' },
  errorText: { fontSize: 12, color: '#991B1B' },
  warningBox: { backgroundColor: '#FFFBEB', borderRadius: 8, padding: 10, marginTop: 4, borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
  warningTitle: { fontSize: 12, fontWeight: '600', color: '#92400E', marginBottom: 4 },
  warningText: { fontSize: 12, color: '#92400E', marginBottom: 2 },
});
