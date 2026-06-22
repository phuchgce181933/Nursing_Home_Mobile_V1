import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, Searchbar, Dialog, Portal, Button, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResidents, useResidentVitals } from '../../hooks/useResidents';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { RESIDENTS } from '../../api/endpoints';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { useToast } from '../../utils/toast';

const COLOR = '#0F5040';

const VITAL_FIELDS = [
  { key: 'bloodPressureSystolic', label: 'HA tâm thu', unit: 'mmHg', icon: 'heart-pulse', min: 90, max: 140 },
  { key: 'bloodPressureDiastolic', label: 'HA tâm trương', unit: 'mmHg', icon: 'heart-pulse', min: 60, max: 90 },
  { key: 'pulse', label: 'Mạch', unit: 'l/p', icon: 'pulse', min: 60, max: 100 },
  { key: 'temperature', label: 'Nhiệt độ', unit: '°C', icon: 'thermometer', min: 35.0, max: 37.8 },
  { key: 'oxygenSaturation', label: 'SpO₂', unit: '%', icon: 'water-percent', min: 95, max: 100 },
  { key: 'weight', label: 'Cân nặng', unit: 'kg', icon: 'scale-bathroom', min: 0, max: 200 },
  { key: 'bloodSugar', label: 'Đường huyết', unit: 'mg/dL', icon: 'water', min: 70, max: 180 },
];

export const HealthMonitoringScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedResident, setSelectedResident] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const residentsQ = useResidents({ search: search || undefined, status: 'admitted' });
  const residents = residentsQ.data?.data ?? residentsQ.data ?? [];

  const vitalsQ = useResidentVitals(selectedResident?._id);
  const vitals = vitalsQ.data?.data ?? vitalsQ.data ?? [];
  const latestVital = Array.isArray(vitals) && vitals.length > 0 ? vitals[0] : null;

  const saveMut = useMutation({
    mutationFn: async (body: Record<string, any>) => {
      const res = await api.post(RESIDENTS.MEDICAL_RECORDS(selectedResident._id), body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['residentVitals', selectedResident?._id] });
      toast('Đã lưu chỉ số sinh hiệu', 'success');
      setShowForm(false);
      setFormData({});
    },
  });

  const handleSave = () => {
    const body: Record<string, any> = { recordType: 'vital_signs', vitalSigns: {} };
    VITAL_FIELDS.forEach((f) => {
      const v = parseFloat(formData[f.key]);
      if (!isNaN(v)) body.vitalSigns[f.key] = v;
    });
    if (Object.keys(body.vitalSigns).length === 0) {
      toast('Vui lòng nhập ít nhất 1 chỉ số', 'error');
      return;
    }
    saveMut.mutate(body);
  };

  const isAbnormal = (key: string, value: number) => {
    const field = VITAL_FIELDS.find((f) => f.key === key);
    if (!field || !value) return false;
    return value < field.min || value > field.max;
  };

  if (selectedResident) {
    return (
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => setSelectedResident(null)} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.topTitle}>{selectedResident.fullName}</Text>
            <Text style={styles.topSub}>Theo dõi sức khỏe</Text>
          </View>
          <Button
            mode="contained"
            compact
            buttonColor="#fff"
            textColor={COLOR}
            onPress={() => setShowForm(true)}
          >
            + Ghi nhận
          </Button>
        </View>

        <ScreenLayout
          loading={vitalsQ.isLoading}
          error={vitalsQ.error ? (vitalsQ.error as Error).message : null}
          onRetry={vitalsQ.refetch}
          isEmpty={!latestVital}
          emptyMessage="Chưa có dữ liệu sinh hiệu"
        >
          <View style={styles.vitalsGrid}>
            {VITAL_FIELDS.map((f) => {
              const val = latestVital?.vitalSigns?.[f.key] ?? latestVital?.[f.key];
              const abnormal = val != null && isAbnormal(f.key, val);
              return (
                <Card key={f.key} style={[styles.vitalCard, abnormal && styles.vitalCardAlert]} mode="outlined">
                  <Card.Content style={styles.vitalContent}>
                    <MaterialCommunityIcons name={f.icon as any} size={18} color={abnormal ? '#DC2626' : COLOR} />
                    <Text style={styles.vitalLabel}>{f.label}</Text>
                    <Text style={[styles.vitalValue, abnormal && { color: '#DC2626' }]}>
                      {val != null ? val : '—'}
                    </Text>
                    <Text style={styles.vitalUnit}>{f.unit}</Text>
                  </Card.Content>
                </Card>
              );
            })}
          </View>

          {vitals.length > 1 && (
            <View style={styles.historySection}>
              <Text style={styles.historyTitle}>Lịch sử gần đây</Text>
              {vitals.slice(0, 5).map((v: any, i: number) => (
                <View key={v._id || i} style={styles.historyRow}>
                  <Text style={styles.historyDate}>
                    {new Date(v.createdAt || v.recordDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={styles.historyVals} numberOfLines={1}>
                    {v.vitalSigns?.bloodPressureSystolic && `HA ${v.vitalSigns.bloodPressureSystolic}/${v.vitalSigns.bloodPressureDiastolic}`}
                    {v.vitalSigns?.pulse && ` · M ${v.vitalSigns.pulse}`}
                    {v.vitalSigns?.temperature && ` · T ${v.vitalSigns.temperature}°`}
                    {v.vitalSigns?.oxygenSaturation && ` · SpO₂ ${v.vitalSigns.oxygenSaturation}%`}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScreenLayout>

        <Portal>
          <Dialog visible={showForm} onDismiss={() => setShowForm(false)}>
            <Dialog.Title>Ghi nhận sinh hiệu</Dialog.Title>
            <Dialog.ScrollArea style={{ maxHeight: 400 }}>
              <View style={{ padding: 8, gap: 10 }}>
                {VITAL_FIELDS.map((f) => (
                  <TextInput
                    key={f.key}
                    label={`${f.label} (${f.unit})`}
                    mode="outlined"
                    keyboardType="numeric"
                    dense
                    value={formData[f.key] ?? ''}
                    onChangeText={(v) => setFormData((p) => ({ ...p, [f.key]: v }))}
                  />
                ))}
              </View>
            </Dialog.ScrollArea>
            <Dialog.Actions>
              <Button onPress={() => setShowForm(false)}>Hủy</Button>
              <Button mode="contained" buttonColor={COLOR} onPress={handleSave} loading={saveMut.isPending}>
                Lưu
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Theo dõi sức khỏe</Text>
        <Text style={styles.topSub}>Chọn cư dân để xem / ghi nhận</Text>
      </View>

      <Searchbar
        placeholder="Tìm cư dân..."
        value={search}
        onChangeText={setSearch}
        style={styles.searchBar}
        inputStyle={{ fontSize: 14 }}
      />

      <ScreenLayout
        loading={residentsQ.isLoading}
        error={residentsQ.error ? (residentsQ.error as Error).message : null}
        onRetry={residentsQ.refetch}
        isEmpty={residents.length === 0}
        emptyMessage="Không tìm thấy cư dân"
      >
        <FlatList
          data={residents}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={residentsQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.resCard} mode="outlined" onPress={() => setSelectedResident(item)}>
              <Card.Content style={styles.resRow}>
                <View style={styles.resAvatar}>
                  <Text style={styles.resAvatarText}>
                    {item.fullName?.charAt(0)?.toUpperCase() ?? 'C'}
                  </Text>
                </View>
                <View style={styles.resInfo}>
                  <Text style={styles.resName}>{item.fullName}</Text>
                  <Text style={styles.resMeta}>
                    {item.residentCode ?? ''}{item.roomInfo ? ` · ${item.roomInfo}` : ''}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
              </Card.Content>
            </Card>
          )}
        />
      </ScreenLayout>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  topSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  searchBar: { marginHorizontal: 16, marginTop: 12, borderRadius: 12, elevation: 0, backgroundColor: '#fff' },
  list: { padding: 16, paddingBottom: 32 },
  resCard: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  resRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  resAvatarText: { fontSize: 16, fontWeight: '700', color: COLOR },
  resInfo: { flex: 1 },
  resName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  resMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16 },
  vitalCard: { width: '47%', borderRadius: 12, backgroundColor: '#fff' },
  vitalCardAlert: { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  vitalContent: { alignItems: 'center', gap: 4, paddingVertical: 12 },
  vitalLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  vitalValue: { fontSize: 22, fontWeight: '700', color: '#111827' },
  vitalUnit: { fontSize: 10, color: '#9CA3AF' },
  historySection: { paddingHorizontal: 16, marginTop: 8 },
  historyTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
  historyRow: { backgroundColor: '#fff', borderRadius: 8, padding: 10, marginBottom: 6, flexDirection: 'row', justifyContent: 'space-between' },
  historyDate: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  historyVals: { fontSize: 12, color: '#374151', flex: 1, textAlign: 'right' },
});
