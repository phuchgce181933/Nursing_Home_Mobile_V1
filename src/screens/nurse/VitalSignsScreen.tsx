import React, { useState } from 'react';
import { ScrollView, View, FlatList, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Text, Card, Button, TextInput, Portal, Modal, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useResidents, useResidentDetail, useResidentVitals } from '../../hooks/useResidents';
import { AlertBanner } from '../../components/shared/AlertBanner';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { AvatarCircle } from '../../components/shared/AvatarCircle';
import { useToast } from '../../utils/toast';
import api from '../../api/axiosInstance';
import { RESIDENTS } from '../../api/endpoints';

const COLOR = '#0F5040';

export const VitalSignsScreen: React.FC<{ route?: any; navigation?: any }> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | undefined>(route?.params?.residentId);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    bloodPressureSystolic: '', bloodPressureDiastolic: '', pulse: '',
    temperatureCelsius: '', oxygenSaturation: '', bloodSugar: '',
  });

  const residentsQ = useResidents({ status: 'admitted', search: search || undefined });
  const allResidents = Array.isArray(residentsQ.data) ? residentsQ.data : (residentsQ.data?.data ?? []);

  const residentQ = useResidentDetail(selectedId);
  const vitalsQ = useResidentVitals(selectedId);
  const resident = residentQ.data?.data ?? residentQ.data;
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
      toast('Đã lưu chỉ số sinh hiệu', 'success');
    },
    onError: (e: any) => toast(e.response?.data?.message ?? 'Không thể lưu. Thử lại.', 'error'),
  });

  const RANGES: Record<string, { min: number; max: number; label: string }> = {
    bloodPressureSystolic: { min: 60, max: 250, label: 'Huyết áp tâm thu' },
    bloodPressureDiastolic: { min: 30, max: 180, label: 'Huyết áp tâm trương' },
    pulse: { min: 20, max: 300, label: 'Nhịp tim' },
    temperatureCelsius: { min: 30, max: 45, label: 'Nhiệt độ' },
    oxygenSaturation: { min: 50, max: 100, label: 'SpO2' },
    bloodSugar: { min: 20, max: 600, label: 'Đường huyết' },
  };

  const WARN: Record<string, { low?: number; high?: number }> = {
    bloodPressureSystolic: { high: 140 },
    bloodPressureDiastolic: { high: 90 },
    pulse: { low: 50, high: 120 },
    temperatureCelsius: { high: 38 },
    oxygenSaturation: { low: 95 },
    bloodSugar: { low: 70, high: 200 },
  };

  const getFormWarnings = (): string[] => {
    const warnings: string[] = [];
    Object.entries(form).forEach(([k, v]) => {
      if (!v) return;
      const n = Number(v);
      const w = WARN[k];
      const r = RANGES[k];
      if (!w || !r) return;
      if (w.low && n < w.low) warnings.push(`${r.label}: ${n} thấp hơn bình thường (${w.low})`);
      if (w.high && n > w.high) warnings.push(`${r.label}: ${n} cao hơn bình thường (${w.high})`);
    });
    return warnings;
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
        errors.push(`${r.label}: phải từ ${r.min} đến ${r.max}`);
      } else {
        body[k] = n;
      }
    });
    if (errors.length > 0) { setFormError(errors.join('\n')); return; }
    if (Object.keys(body).length === 0) { setFormError('Nhập ít nhất 1 chỉ số'); return; }
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

  const getVitalSeverity = (key: string, val: number | undefined): 'critical' | 'warning' | 'normal' => {
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

  const SEV_COLORS = {
    critical: { bg: '#FEE2E2', text: '#991B1B', value: '#DC2626' },
    warning:  { bg: '#FEF3C7', text: '#92400E', value: '#D97706' },
    normal:   { bg: '#D1FAE5', text: '#065F46', value: '#059669' },
  };

  const getAlerts = (): { severity: 'critical' | 'warning'; messages: string[] } | null => {
    if (!latest) return null;
    const criticals: string[] = [];
    const warnings: string[] = [];
    const checks: { key: string; val: number | undefined; label: string }[] = [
      { key: 'bloodPressureSystolic', val: latest.bloodPressureSystolic, label: 'Huyết áp tâm thu' },
      { key: 'bloodPressureDiastolic', val: latest.bloodPressureDiastolic, label: 'Huyết áp tâm trương' },
      { key: 'pulse', val: latest.pulse, label: 'Nhịp tim' },
      { key: 'temperatureCelsius', val: latest.temperatureCelsius, label: 'Nhiệt độ' },
      { key: 'oxygenSaturation', val: latest.oxygenSaturation, label: 'SpO2' },
      { key: 'bloodSugar', val: latest.bloodSugar, label: 'Đường huyết' },
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

  const getCardSeverity = (keys: { key: string; val: number | undefined }[]) => {
    const sevs = keys.map(k => getVitalSeverity(k.key, k.val));
    if (sevs.includes('critical')) return 'critical';
    if (sevs.includes('warning')) return 'warning';
    return 'normal';
  };

  const vitalCards = latest ? [
    { label: 'Huyết áp', value: `${latest.bloodPressureSystolic ?? '--'}/${latest.bloodPressureDiastolic ?? '--'}`, unit: 'mmHg',
      severity: getCardSeverity([{ key: 'bloodPressureSystolic', val: latest.bloodPressureSystolic }, { key: 'bloodPressureDiastolic', val: latest.bloodPressureDiastolic }]) },
    { label: 'Nhịp tim', value: latest.pulse ?? '--', unit: 'bpm',
      severity: getVitalSeverity('pulse', latest.pulse) },
    { label: 'Nhiệt độ', value: latest.temperatureCelsius ?? '--', unit: '°C',
      severity: getVitalSeverity('temperatureCelsius', latest.temperatureCelsius) },
    { label: 'SpO2', value: latest.oxygenSaturation ?? '--', unit: '%',
      severity: getVitalSeverity('oxygenSaturation', latest.oxygenSaturation) },
    { label: 'Đường huyết', value: latest.bloodSugar ?? '--', unit: 'mg/dL',
      severity: getVitalSeverity('bloodSugar', latest.bloodSugar) },
  ] : [];

  if (!selectedId) {
    return (
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <View style={styles.topRow}>
            <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation?.goBack()} />
            <Text style={styles.topTitle}>Sinh hiệu</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>
        <View style={{ padding: 12 }}>
          <TextInput placeholder="Tìm cư dân..." mode="outlined" value={search}
            onChangeText={setSearch} dense style={{ backgroundColor: '#fff', marginBottom: 8 }}
            left={<TextInput.Icon icon="magnify" />} />
        </View>
        <ScreenLayout loading={residentsQ.isLoading} error={residentsQ.error ? (residentsQ.error as Error).message : null}
          onRetry={residentsQ.refetch} isEmpty={allResidents.length === 0} emptyMessage="Không tìm thấy cư dân">
          <FlatList data={allResidents} keyExtractor={(i: any) => i._id} contentContainerStyle={{ padding: 16 }}
            refreshControl={<RefreshControl refreshing={false} onRefresh={residentsQ.refetch} tintColor={COLOR} />}
            renderItem={({ item }) => (
              <Pressable onPress={() => setSelectedId(item._id)} style={styles.residentItem}>
                <AvatarCircle name={item.fullName} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.residentName}>{item.fullName}</Text>
                  <Text style={styles.residentCode}>{item.residentCode} · {item.roomId?.roomNumber ? `Phòng ${item.roomId.roomNumber}` : ''}</Text>
                </View>
              </Pressable>
            )} />
        </ScreenLayout>
      </View>
    );
  }

  const refetch = () => { residentQ.refetch(); vitalsQ.refetch(); };

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.topRow}>
          <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => setSelectedId(undefined)} />
          <View style={{ flex: 1 }}>
            <Text style={styles.topTitle}>{resident?.fullName ?? 'Sinh hiệu'}</Text>
            <Text style={styles.topSub}>{resident?.residentCode ?? ''} · {resident?.gender === 'male' ? 'Nam' : 'Nữ'}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={COLOR} />}>
        <ScreenLayout loading={residentQ.isLoading || vitalsQ.isLoading}
          error={residentQ.error ? (residentQ.error as Error).message : null} onRetry={refetch}>
          {alerts ? (
            <AlertBanner
              message={alerts.severity === 'critical'
                ? `${alerts.messages.join(', ')} — cần theo dõi ngay`
                : `${alerts.messages.join(', ')} — chỉ số bất thường`}
              severity={alerts.severity}
            />
          ) : null}

          <SectionHeader title="Chỉ số hiện tại" roleColor={COLOR} />
          {vitalCards.length > 0 ? (
            <View style={styles.vitalsGrid}>
              {vitalCards.map((v, i) => {
                const sc = SEV_COLORS[v.severity];
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
            <Text style={styles.emptyText}>Chưa có dữ liệu sinh hiệu</Text>
          )}

          {latest?.measuredAt && (
            <Text style={styles.measuredAt}>Đo lúc: {new Date(latest.measuredAt).toLocaleString('vi-VN')}</Text>
          )}

          <Button mode="contained" buttonColor={COLOR} style={styles.updateBtn} onPress={() => setShowForm(true)}>
            Cập nhật sinh hiệu
          </Button>
        </ScreenLayout>
      </ScrollView>

      <Portal>
        <Modal visible={showForm} onDismiss={() => setShowForm(false)} contentContainerStyle={styles.modal}>
          <Text style={styles.modalTitle}>Nhập chỉ số sinh hiệu</Text>
          <Text style={styles.modalSub}>{resident?.fullName ?? ''}</Text>
          {[
            { key: 'bloodPressureSystolic', label: 'Huyết áp tâm thu (mmHg)' },
            { key: 'bloodPressureDiastolic', label: 'Huyết áp tâm trương (mmHg)' },
            { key: 'pulse', label: 'Nhịp tim (bpm)' },
            { key: 'temperatureCelsius', label: 'Nhiệt độ (°C)' },
            { key: 'oxygenSaturation', label: 'SpO2 (%)' },
            { key: 'bloodSugar', label: 'Đường huyết (mg/dL)' },
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
                {isOutOfRange && <Text style={styles.fieldError}>Phải từ {r.min} đến {r.max}</Text>}
                {isAbnormal && <Text style={styles.fieldWarn}>⚠ Chỉ số bất thường</Text>}
              </View>
            );
          })}
          {formError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <Button mode="outlined" onPress={() => { setShowForm(false); setFormError(''); }} style={{ flex: 1 }}>Hủy</Button>
            <Button mode="contained" buttonColor={COLOR} onPress={handleSubmit}
              loading={recordMutation.isPending} style={{ flex: 1 }}>Lưu</Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 4, paddingBottom: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  topSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 1 },
  body: { padding: 16, paddingBottom: 32 },
  residentItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8 },
  residentName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  residentCode: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vitalCard: { width: '48%', borderRadius: 12 },
  vitalContent: { alignItems: 'center', paddingVertical: 12 },
  vitalValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
  vitalUnit: { fontSize: 11, color: '#9CA3AF' },
  vitalLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 24 },
  measuredAt: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 8 },
  updateBtn: { marginTop: 24, borderRadius: 8 },
  modal: { backgroundColor: '#fff', margin: 24, padding: 20, borderRadius: 16 },
  modalTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  modalSub: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  formInput: { marginBottom: 2 },
  fieldError: { fontSize: 11, color: '#DC2626', marginBottom: 6, marginLeft: 4 },
  fieldWarn: { fontSize: 11, color: '#D97706', marginBottom: 6, marginLeft: 4 },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 8, padding: 10, marginTop: 4, borderLeftWidth: 3, borderLeftColor: '#EF4444' },
  errorText: { fontSize: 12, color: '#991B1B' },
  warningBox: { backgroundColor: '#FFFBEB', borderRadius: 8, padding: 10, marginTop: 4, borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
  warningTitle: { fontSize: 12, fontWeight: '600', color: '#92400E', marginBottom: 4 },
  warningText: { fontSize: 12, color: '#92400E', marginBottom: 2 },
});
