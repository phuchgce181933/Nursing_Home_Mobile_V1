import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, Chip, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { CARE_NOTES, RESIDENTS } from '../../api/endpoints';
import { useAuth } from '../../auth/useAuth';
import { AvatarCircle } from '../../components/shared/AvatarCircle';
import { useToast } from '../../utils/toast';

const COLOR = '#0F5040';

const NOTE_TYPES = [
  { value: 'general', label: 'Chung', icon: 'note-text-outline' },
  { value: 'meal', label: 'Bữa ăn', icon: 'silverware-fork-knife' },
  { value: 'activity', label: 'Hoạt động', icon: 'run' },
  { value: 'daily_living', label: 'Sinh hoạt', icon: 'home-heart' },
  { value: 'health', label: 'Sức khỏe', icon: 'heart-pulse' },
];

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS: Record<string, string> = { breakfast: 'Sáng', lunch: 'Trưa', dinner: 'Tối', snack: 'Phụ' };
const INTAKE_AMOUNTS = ['none', 'little', 'half', 'most', 'all'];
const INTAKE_LABELS: Record<string, string> = { none: 'Không ăn', little: 'Ít', half: 'Nửa', most: 'Gần hết', all: 'Hết' };
const APPETITE = ['poor', 'fair', 'good', 'excellent'];
const APPETITE_LABELS: Record<string, string> = { poor: 'Kém', fair: 'Bình thường', good: 'Tốt', excellent: 'Rất tốt' };

const ACTIVITY_TYPES = ['walking', 'exercise', 'physiotherapy', 'reading', 'socializing', 'entertainment', 'other'];
const ACTIVITY_LABELS: Record<string, string> = { walking: 'Đi bộ', exercise: 'Tập thể dục', physiotherapy: 'Vật lý trị liệu', reading: 'Đọc sách', socializing: 'Giao tiếp', entertainment: 'Giải trí', other: 'Khác' };
const PARTICIPATION = ['refused', 'assisted', 'supervised', 'independent'];
const PARTICIPATION_LABELS: Record<string, string> = { refused: 'Từ chối', assisted: 'Hỗ trợ', supervised: 'Giám sát', independent: 'Tự lập' };
const MOODS = ['happy', 'neutral', 'sad', 'agitated', 'anxious'];
const MOOD_LABELS: Record<string, string> = { happy: 'Vui', neutral: 'Bình thường', sad: 'Buồn', agitated: 'Kích động', anxious: 'Lo lắng' };

const DAILY_LIVING_TYPES = ['bathing', 'grooming', 'dressing', 'eating', 'mobility', 'toileting', 'sleeping', 'other'];
const DAILY_LIVING_LABELS: Record<string, string> = { bathing: 'Tắm', grooming: 'Vệ sinh', dressing: 'Mặc đồ', eating: 'Ăn uống', mobility: 'Di chuyển', toileting: 'Vệ sinh', sleeping: 'Ngủ', other: 'Khác' };
const ASSISTANCE = ['independent', 'supervised', 'assisted', 'total_care'];
const ASSISTANCE_LABELS: Record<string, string> = { independent: 'Tự lập', supervised: 'Giám sát', assisted: 'Hỗ trợ', total_care: 'Chăm sóc toàn diện' };
const COMPLETION = ['completed', 'partial', 'refused'];
const COMPLETION_LABELS: Record<string, string> = { completed: 'Hoàn thành', partial: 'Một phần', refused: 'Từ chối' };

const CONSCIOUSNESS = ['alert', 'confused', 'drowsy', 'unresponsive'];
const CONSCIOUSNESS_LABELS: Record<string, string> = { alert: 'Tỉnh táo', confused: 'Lẫn lộn', drowsy: 'Ngủ gà', unresponsive: 'Không phản hồi' };
const FALL_RISKS = ['low', 'medium', 'high'];
const FALL_RISK_LABELS: Record<string, string> = { low: 'Thấp', medium: 'Trung bình', high: 'Cao' };

type ChipPickerProps = { label: string; values: string[]; labels: Record<string, string>; selected: string; onSelect: (v: string) => void };
const ChipPicker: React.FC<ChipPickerProps> = ({ label, values, labels, selected, onSelect }) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.chipRow}>
      {values.map((v) => (
        <Chip key={v} selected={selected === v} onPress={() => onSelect(v)} compact
          style={selected === v ? { backgroundColor: COLOR } : undefined}
          textStyle={selected === v ? { color: '#fff', fontSize: 12 } : { fontSize: 12 }}>
          {labels[v] ?? v}
        </Chip>
      ))}
    </View>
  </View>
);

export const CreateCareNoteScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();

  const editNoteId = route.params?.noteId;
  const isEdit = !!editNoteId;

  const existingQ = useQuery({
    queryKey: ['careNoteDetail', editNoteId],
    queryFn: async () => (await api.get(CARE_NOTES.DETAIL(editNoteId))).data,
    enabled: isEdit,
  });

  const residentsQ = useQuery({
    queryKey: ['residents', { status: 'admitted' }],
    queryFn: async () => (await api.get(RESIDENTS.LIST, { params: { status: 'admitted' } })).data,
  });
  const residents = residentsQ.data?.data ?? residentsQ.data ?? [];

  const existing = existingQ.data?.data ?? existingQ.data;
  const [initialized, setInitialized] = useState(false);

  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [noteType, setNoteType] = useState('general');
  const [content, setContent] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [searchResident, setSearchResident] = useState('');

  const [mealType, setMealType] = useState('');
  const [intakeAmount, setIntakeAmount] = useState('');
  const [appetite, setAppetite] = useState('');

  const [activityType, setActivityType] = useState('');
  const [participation, setParticipation] = useState('');
  const [mood, setMood] = useState('');
  const [duration, setDuration] = useState('');

  const [dlType, setDlType] = useState('');
  const [assistance, setAssistance] = useState('');
  const [completion, setCompletion] = useState('');
  const [dlMood, setDlMood] = useState('');

  const [consciousness, setConsciousness] = useState('');
  const [fallRisk, setFallRisk] = useState('');
  const [painLevel, setPainLevel] = useState('');
  const [temperature, setTemperature] = useState('');
  const [pulse, setPulse] = useState('');
  const [symptoms, setSymptoms] = useState('');

  if (isEdit && existing && !initialized) {
    setSelectedResidentId(existing.residentId?._id ?? existing.residentId ?? '');
    setNoteType(existing.noteType ?? 'general');
    setContent(existing.content ?? '');
    const m = existing.metadata ?? {};
    if (existing.noteType === 'meal') { setMealType(m.mealType ?? ''); setIntakeAmount(m.intakeAmount ?? ''); setAppetite(m.appetite ?? ''); }
    if (existing.noteType === 'activity') { setActivityType(m.activityType ?? ''); setParticipation(m.participationLevel ?? ''); setMood(m.mood ?? ''); setDuration(m.duration?.toString() ?? ''); }
    if (existing.noteType === 'daily_living') { setDlType(m.activityType ?? ''); setAssistance(m.assistanceLevel ?? ''); setCompletion(m.completionStatus ?? ''); setDlMood(m.mood ?? ''); }
    if (existing.noteType === 'health') { setConsciousness(m.consciousness ?? ''); setFallRisk(m.fallRisk ?? ''); setPainLevel(m.painLevel?.toString() ?? ''); setTemperature(m.temperature?.toString() ?? ''); setPulse(m.pulse?.toString() ?? ''); setSymptoms((m.symptoms ?? []).join(', ')); }
    setInitialized(true);
  }

  const buildMetadata = () => {
    const m: any = {};
    if (noteType === 'meal') { if (mealType) m.mealType = mealType; if (intakeAmount) m.intakeAmount = intakeAmount; if (appetite) m.appetite = appetite; }
    if (noteType === 'activity') { if (activityType) m.activityType = activityType; if (participation) m.participationLevel = participation; if (mood) m.mood = mood; if (duration) m.duration = Number(duration); }
    if (noteType === 'daily_living') { if (dlType) m.activityType = dlType; if (assistance) m.assistanceLevel = assistance; if (completion) m.completionStatus = completion; if (dlMood) m.mood = dlMood; }
    if (noteType === 'health') {
      if (consciousness) m.consciousness = consciousness; if (fallRisk) m.fallRisk = fallRisk;
      if (painLevel) m.painLevel = Number(painLevel); if (temperature) m.temperature = Number(temperature);
      if (pulse) m.pulse = Number(pulse);
      if (symptoms.trim()) m.symptoms = symptoms.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    return Object.keys(m).length > 0 ? m : undefined;
  };

  const createMut = useMutation({
    mutationFn: async (body: any) => (await api.post(CARE_NOTES.CREATE, body)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['myNotes'] }); qc.invalidateQueries({ queryKey: ['careNotes'] }); },
  });
  const updateMut = useMutation({
    mutationFn: async (body: any) => (await api.put(CARE_NOTES.UPDATE(editNoteId), body)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['myNotes'] }); qc.invalidateQueries({ queryKey: ['careNotes'] }); qc.invalidateQueries({ queryKey: ['careNoteDetail', editNoteId] }); },
  });

  const handleSubmit = async () => {
    if (!isEdit && !selectedResidentId) { toast('Vui lòng chọn cư dân', 'error'); return; }
    if (!content.trim() || content.trim().length < 5) { toast('Nội dung tối thiểu 5 ký tự', 'error'); return; }
    const body: any = { content: content.trim(), noteType, metadata: buildMetadata() };
    if (!isEdit) body.residentId = selectedResidentId;
    try {
      if (isEdit) { await updateMut.mutateAsync(body); toast('Đã cập nhật ghi chú', 'success'); }
      else { await createMut.mutateAsync(body); toast('Đã tạo ghi chú', 'success'); }
      nav.goBack();
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Không thể lưu. Thử lại.', 'error');
    }
  };

  const selectedResident = residents.find((r: any) => r._id === selectedResidentId);
  const filteredResidents = searchResident ? residents.filter((r: any) => r.fullName?.toLowerCase().includes(searchResident.toLowerCase())) : residents;
  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>{isEdit ? 'Sửa ghi chú' : 'Tạo ghi chú mới'}</Text>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {!isEdit && (
          <>
            <Text style={styles.sectionTitle}>Cư dân</Text>
            {selectedResident ? (
              <Card style={styles.resCard} mode="outlined" onPress={() => setShowPicker(true)}>
                <Card.Content style={styles.resRow}>
                  <AvatarCircle name={selectedResident.fullName} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resName}>{selectedResident.fullName}</Text>
                    <Text style={styles.resCode}>{selectedResident.residentCode}</Text>
                  </View>
                  <Button compact mode="text" textColor={COLOR}>Đổi</Button>
                </Card.Content>
              </Card>
            ) : (
              <Button mode="outlined" onPress={() => setShowPicker(true)} style={{ borderColor: COLOR, borderRadius: 10, marginBottom: 8 }}>Chọn cư dân *</Button>
            )}
            {showPicker && (
              <Card style={styles.pickerCard}>
                <Card.Content>
                  <TextInput mode="outlined" placeholder="Tìm cư dân..." dense value={searchResident} onChangeText={setSearchResident} style={{ marginBottom: 8 }} />
                  {filteredResidents.slice(0, 15).map((r: any) => (
                    <TouchableOpacity key={r._id} style={styles.pickerItem} onPress={() => { setSelectedResidentId(r._id); setShowPicker(false); setSearchResident(''); }}>
                      <Text style={styles.pickerText}>{r.fullName}</Text>
                      <Text style={styles.pickerSub}>{r.residentCode}</Text>
                    </TouchableOpacity>
                  ))}
                </Card.Content>
              </Card>
            )}
          </>
        )}

        <Text style={styles.sectionTitle}>Loại ghi chú</Text>
        <View style={styles.chipRow}>
          {NOTE_TYPES.map((t) => (
            <Chip key={t.value} selected={noteType === t.value} onPress={() => setNoteType(t.value)} icon={t.icon} compact
              style={noteType === t.value ? { backgroundColor: COLOR } : undefined}
              textStyle={noteType === t.value ? { color: '#fff' } : undefined}>
              {t.label}
            </Chip>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Nội dung *</Text>
        <TextInput mode="outlined" value={content} onChangeText={setContent} multiline numberOfLines={4} maxLength={500}
          placeholder="Mô tả chi tiết tình trạng, quan sát, ghi nhận..." style={{ marginBottom: 4 }} />
        <Text style={styles.charCount}>{content.length}/500</Text>

        {noteType === 'meal' && (
          <View style={styles.metaSection}>
            <Text style={styles.metaSectionTitle}>Chi tiết bữa ăn</Text>
            <ChipPicker label="Bữa" values={MEAL_TYPES} labels={MEAL_LABELS} selected={mealType} onSelect={setMealType} />
            <ChipPicker label="Lượng ăn" values={INTAKE_AMOUNTS} labels={INTAKE_LABELS} selected={intakeAmount} onSelect={setIntakeAmount} />
            <ChipPicker label="Ngon miệng" values={APPETITE} labels={APPETITE_LABELS} selected={appetite} onSelect={setAppetite} />
          </View>
        )}

        {noteType === 'activity' && (
          <View style={styles.metaSection}>
            <Text style={styles.metaSectionTitle}>Chi tiết hoạt động</Text>
            <ChipPicker label="Loại" values={ACTIVITY_TYPES} labels={ACTIVITY_LABELS} selected={activityType} onSelect={setActivityType} />
            <ChipPicker label="Mức tham gia" values={PARTICIPATION} labels={PARTICIPATION_LABELS} selected={participation} onSelect={setParticipation} />
            <ChipPicker label="Tâm trạng" values={MOODS} labels={MOOD_LABELS} selected={mood} onSelect={setMood} />
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Thời lượng (phút)</Text>
              <TextInput mode="outlined" dense value={duration} onChangeText={setDuration} keyboardType="numeric" placeholder="VD: 30" />
            </View>
          </View>
        )}

        {noteType === 'daily_living' && (
          <View style={styles.metaSection}>
            <Text style={styles.metaSectionTitle}>Chi tiết sinh hoạt hàng ngày</Text>
            <ChipPicker label="Loại" values={DAILY_LIVING_TYPES} labels={DAILY_LIVING_LABELS} selected={dlType} onSelect={setDlType} />
            <ChipPicker label="Mức hỗ trợ" values={ASSISTANCE} labels={ASSISTANCE_LABELS} selected={assistance} onSelect={setAssistance} />
            <ChipPicker label="Hoàn thành" values={COMPLETION} labels={COMPLETION_LABELS} selected={completion} onSelect={setCompletion} />
            <ChipPicker label="Tâm trạng" values={MOODS} labels={MOOD_LABELS} selected={dlMood} onSelect={setDlMood} />
          </View>
        )}

        {noteType === 'health' && (
          <View style={styles.metaSection}>
            <Text style={styles.metaSectionTitle}>Chi tiết sức khỏe</Text>
            <ChipPicker label="Ý thức" values={CONSCIOUSNESS} labels={CONSCIOUSNESS_LABELS} selected={consciousness} onSelect={setConsciousness} />
            <ChipPicker label="Nguy cơ ngã" values={FALL_RISKS} labels={FALL_RISK_LABELS} selected={fallRisk} onSelect={setFallRisk} />
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Mức đau (0-10)</Text>
              <TextInput mode="outlined" dense value={painLevel} onChangeText={setPainLevel} keyboardType="numeric" placeholder="0 = không đau, 10 = rất đau" />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Nhiệt độ (°C)</Text>
              <TextInput mode="outlined" dense value={temperature} onChangeText={setTemperature} keyboardType="numeric" placeholder="VD: 37.2" />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Nhịp tim (bpm)</Text>
              <TextInput mode="outlined" dense value={pulse} onChangeText={setPulse} keyboardType="numeric" placeholder="VD: 75" />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Triệu chứng (phân cách bởi dấu phẩy)</Text>
              <TextInput mode="outlined" dense value={symptoms} onChangeText={setSymptoms} placeholder="VD: ho, sốt, mệt mỏi" />
            </View>
          </View>
        )}

        <Card style={styles.infoCard} mode="outlined">
          <Card.Content>
            <Text style={styles.infoLabel}>Người ghi</Text>
            <Text style={styles.infoValue}>{user?.fullName ?? ''}</Text>
            <Text style={styles.infoLabel}>Thời gian</Text>
            <Text style={styles.infoValue}>{new Date().toLocaleString('vi-VN')}</Text>
          </Card.Content>
        </Card>

        <Button mode="contained" buttonColor={COLOR} onPress={handleSubmit} loading={isPending} disabled={isPending}
          style={styles.submitBtn} contentStyle={{ height: 48 }}>
          {isEdit ? 'Cập nhật ghi chú' : 'Lưu ghi chú'}
        </Button>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  body: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8, marginTop: 16 },
  resCard: { borderRadius: 12, backgroundColor: '#fff', marginBottom: 8 },
  resRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  resCode: { fontSize: 12, color: '#6B7280' },
  pickerCard: { borderRadius: 12, marginBottom: 8, maxHeight: 280 },
  pickerItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerText: { fontSize: 14, color: '#111827' },
  pickerSub: { fontSize: 12, color: '#9CA3AF' },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  charCount: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginBottom: 8 },
  metaSection: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginTop: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  metaSectionTitle: { fontSize: 14, fontWeight: '700', color: COLOR, marginBottom: 12 },
  fieldGroup: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 6 },
  infoCard: { borderRadius: 12, marginTop: 16, backgroundColor: '#F9FAFB' },
  infoLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  infoValue: { fontSize: 13, color: '#111827' },
  submitBtn: { marginTop: 20, borderRadius: 10 },
});
