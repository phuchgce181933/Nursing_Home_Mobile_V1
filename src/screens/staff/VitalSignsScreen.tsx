import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Button, TextInput, Portal, Modal } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useResidentDetail, useResidentVitals } from '../../hooks/useResidents';
import { AlertBanner } from '../../components/shared/AlertBanner';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { useToast } from '../../utils/toast';
import api from '../../api/axiosInstance';
import { RESIDENTS } from '../../api/endpoints';

const COLOR = '#0F5040';

type Props = { route?: { params?: { residentId?: string } } };

export const VitalSignsScreen: React.FC<Props> = ({ route }) => {
  const residentId = route?.params?.residentId;
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    pulse: '',
    temperatureCelsius: '',
    oxygenSaturation: '',
    bloodSugar: '',
  });

  const residentQ = useResidentDetail(residentId);
  const vitalsQ = useResidentVitals(residentId);
  const resident = residentQ.data;
  const vitals = vitalsQ.data?.data ?? vitalsQ.data ?? [];
  const latest = vitals[0];

  const recordMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await api.post(RESIDENTS.MEDICAL_RECORDS(residentId!), body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vitals', residentId] });
      setShowForm(false);
      toast('Đã lưu chỉ số sinh hiệu', 'success');
    },
    onError: () => toast('Không thể lưu. Thử lại.', 'error'),
  });

  const handleSubmit = () => {
    const body: Record<string, number> = {};
    Object.entries(form).forEach(([k, v]) => {
      if (v) body[k] = Number(v);
    });
    if (Object.keys(body).length === 0) return;
    recordMutation.mutate(body);
  };

  const getAlertSeverity = (): 'critical' | 'warning' | null => {
    if (!latest) return null;
    if (latest.oxygenSaturation && latest.oxygenSaturation < 95) return 'critical';
    if (latest.bloodPressureSystolic && latest.bloodPressureSystolic > 140) return 'warning';
    if (latest.temperatureCelsius && latest.temperatureCelsius > 38) return 'warning';
    return null;
  };

  const alertSev = getAlertSeverity();
  const loading = residentQ.isLoading || vitalsQ.isLoading;

  const vitalCards = latest ? [
    { label: 'Huyết áp', value: `${latest.bloodPressureSystolic ?? '--'}/${latest.bloodPressureDiastolic ?? '--'}`, unit: 'mmHg' },
    { label: 'Nhịp tim', value: latest.pulse ?? '--', unit: 'bpm' },
    { label: 'Nhiệt độ', value: latest.temperatureCelsius ?? '--', unit: '°C' },
    { label: 'SpO2', value: latest.oxygenSaturation ?? '--', unit: '%' },
    { label: 'Cân nặng', value: latest.weightKg ?? '--', unit: 'kg' },
    { label: 'Đường huyết', value: latest.bloodSugar ?? '--', unit: 'mg/dL' },
  ] : [];

  const refetch = () => { residentQ.refetch(); vitalsQ.refetch(); };

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>{resident?.fullName ?? 'Sinh hiệu'}</Text>
        <Text style={styles.topSub}>
          {resident?.residentCode ?? ''} · {resident?.gender === 'male' ? 'Nam' : 'Nữ'}
        </Text>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={COLOR} />}
      >
        <ScreenLayout loading={loading} error={residentQ.error ? (residentQ.error as Error).message : null} onRetry={refetch}>
          {alertSev ? (
            <AlertBanner
              message={alertSev === 'critical' ? 'SpO2 thấp — cần theo dõi ngay' : 'Chỉ số bất thường — kiểm tra lại'}
              severity={alertSev}
            />
          ) : null}

          <SectionHeader title="Chỉ số hiện tại" roleColor={COLOR} />
          <View style={styles.vitalsGrid}>
            {vitalCards.map((v, i) => (
              <Card key={i} style={styles.vitalCard}>
                <Card.Content style={styles.vitalContent}>
                  <Text style={styles.vitalValue}>{v.value}</Text>
                  <Text style={styles.vitalUnit}>{v.unit}</Text>
                  <Text style={styles.vitalLabel}>{v.label}</Text>
                </Card.Content>
              </Card>
            ))}
          </View>

          {vitalCards.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có dữ liệu sinh hiệu</Text>
          ) : null}

          <Button mode="contained" buttonColor={COLOR} style={styles.updateBtn} onPress={() => setShowForm(true)}>
            Cập nhật sinh hiệu
          </Button>
        </ScreenLayout>
      </ScrollView>

      <Portal>
        <Modal visible={showForm} onDismiss={() => setShowForm(false)} contentContainerStyle={styles.modal}>
          <Text style={styles.modalTitle}>Nhập chỉ số sinh hiệu</Text>
          {[
            { key: 'bloodPressureSystolic', label: 'Huyết áp tâm thu (mmHg)' },
            { key: 'bloodPressureDiastolic', label: 'Huyết áp tâm trương (mmHg)' },
            { key: 'pulse', label: 'Nhịp tim (bpm)' },
            { key: 'temperatureCelsius', label: 'Nhiệt độ (°C)' },
            { key: 'oxygenSaturation', label: 'SpO2 (%)' },
            { key: 'bloodSugar', label: 'Đường huyết (mg/dL)' },
          ].map(({ key, label }) => (
            <TextInput
              key={key}
              label={label}
              mode="outlined"
              keyboardType="numeric"
              value={(form as any)[key]}
              onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
              style={styles.formInput}
              dense
            />
          ))}
          <Button
            mode="contained"
            buttonColor={COLOR}
            onPress={handleSubmit}
            loading={recordMutation.isPending}
            style={{ marginTop: 8 }}
          >
            Lưu
          </Button>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  topSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  body: { padding: 16, paddingBottom: 32 },
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vitalCard: { width: '48%', borderRadius: 12 },
  vitalContent: { alignItems: 'center', paddingVertical: 12 },
  vitalValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
  vitalUnit: { fontSize: 11, color: '#9CA3AF' },
  vitalLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 24 },
  updateBtn: { marginTop: 24, borderRadius: 8 },
  modal: { backgroundColor: '#fff', margin: 24, padding: 20, borderRadius: 16 },
  modalTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  formInput: { marginBottom: 8 },
});
