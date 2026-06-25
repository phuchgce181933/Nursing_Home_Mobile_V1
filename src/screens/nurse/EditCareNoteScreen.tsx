import React, { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text, TextInput, Button, Chip, Card, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUpdateCareNote } from '../../hooks/useCareNotes';
import { AvatarCircle } from '../../components/shared/AvatarCircle';
import { useToast } from '../../utils/toast';

const COLOR = '#0F5040';

const NOTE_TYPES = [
  { value: 'general', label: 'Chung' },
  { value: 'meal', label: 'Bữa ăn' },
  { value: 'activity', label: 'Hoạt động' },
  { value: 'daily_living', label: 'Sinh hoạt' },
  { value: 'health', label: 'Sức khỏe' },
];

const MEAL_TYPES = [{ value: 'breakfast', label: 'Sáng' }, { value: 'lunch', label: 'Trưa' }, { value: 'dinner', label: 'Tối' }, { value: 'snack', label: 'Phụ' }];
const INTAKE_AMOUNTS = [{ value: 'none', label: 'Không ăn' }, { value: 'little', label: 'Ít' }, { value: 'half', label: 'Nửa' }, { value: 'most', label: 'Nhiều' }, { value: 'all', label: 'Hết' }];
const APPETITES = [{ value: 'poor', label: 'Kém' }, { value: 'fair', label: 'TB' }, { value: 'good', label: 'Tốt' }, { value: 'excellent', label: 'Rất tốt' }];
const ACTIVITY_TYPES = [{ value: 'walking', label: 'Đi bộ' }, { value: 'exercise', label: 'Thể dục' }, { value: 'physiotherapy', label: 'Vật lý trị liệu' }, { value: 'reading', label: 'Đọc sách' }, { value: 'socializing', label: 'Giao tiếp' }, { value: 'entertainment', label: 'Giải trí' }, { value: 'other', label: 'Khác' }];
const PARTICIPATION = [{ value: 'refused', label: 'Từ chối' }, { value: 'assisted', label: 'Hỗ trợ' }, { value: 'supervised', label: 'Giám sát' }, { value: 'independent', label: 'Tự lập' }];
const MOODS = [{ value: 'happy', label: 'Vui' }, { value: 'neutral', label: 'Bình thường' }, { value: 'sad', label: 'Buồn' }, { value: 'agitated', label: 'Kích động' }, { value: 'anxious', label: 'Lo lắng' }];
const CONSCIOUSNESS = [{ value: 'alert', label: 'Tỉnh táo' }, { value: 'confused', label: 'Lẫn lộn' }, { value: 'drowsy', label: 'Buồn ngủ' }, { value: 'unresponsive', label: 'Không phản hồi' }];
const FALL_RISK = [{ value: 'low', label: 'Thấp' }, { value: 'medium', label: 'TB' }, { value: 'high', label: 'Cao' }];
const DL_ACTIVITY_TYPES = [{ value: 'bathing', label: 'Tắm' }, { value: 'grooming', label: 'Vệ sinh' }, { value: 'dressing', label: 'Mặc đồ' }, { value: 'eating', label: 'Ăn uống' }, { value: 'mobility', label: 'Di chuyển' }, { value: 'toileting', label: 'Vệ sinh cá nhân' }, { value: 'sleeping', label: 'Ngủ' }, { value: 'other', label: 'Khác' }];
const ASSISTANCE = [{ value: 'independent', label: 'Tự lập' }, { value: 'supervised', label: 'Giám sát' }, { value: 'assisted', label: 'Hỗ trợ' }, { value: 'total_care', label: 'Chăm sóc toàn phần' }];
const COMPLETION = [{ value: 'completed', label: 'Hoàn thành' }, { value: 'partial', label: 'Một phần' }, { value: 'refused', label: 'Từ chối' }];

const ChipGroup: React.FC<{ label: string; options: { value: string; label: string }[]; selected: string; onSelect: (v: string) => void }> = ({ label, options, selected, onSelect }) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={styles.metaLabel}>{label}</Text>
    <View style={styles.chipRow}>
      {options.map(o => (
        <Chip key={o.value} selected={selected === o.value} onPress={() => onSelect(o.value)}
          style={selected === o.value ? { backgroundColor: COLOR } : undefined}
          textStyle={selected === o.value ? { color: '#fff' } : undefined} compact>{o.label}</Chip>
      ))}
    </View>
  </View>
);

export const EditCareNoteScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const updateNote = useUpdateCareNote();
  const note = route.params?.note;

  const [noteType, setNoteType] = useState(note?.noteType ?? 'general');
  const [content, setContent] = useState(note?.content ?? '');
  const [metadata, setMetadata] = useState<Record<string, any>>(note?.metadata ?? {});

  const residentName = note?.residentId?.fullName ?? '';

  const updateMeta = (key: string, value: any) => setMetadata(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!content.trim() || content.trim().length < 5) {
      toast('Nội dung ghi chú tối thiểu 5 ký tự', 'warning');
      return;
    }
    try {
      await updateNote.mutateAsync({ id: note._id, content: content.trim(), noteType, metadata });
      toast('Đã cập nhật ghi chú', 'success');
      navigation.goBack();
    } catch {
      toast('Không thể cập nhật. Thử lại.', 'error');
    }
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.topRow}>
          <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation.goBack()} />
          <Text style={styles.topTitle}>Sửa ghi chú</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Card style={styles.residentCard} mode="outlined">
          <Card.Content style={styles.residentRow}>
            <AvatarCircle name={residentName} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={styles.residentName}>{residentName}</Text>
              <Text style={styles.residentCode}>{note?.residentId?.residentCode ?? ''}</Text>
            </View>
          </Card.Content>
        </Card>

        <Text style={[styles.label, { marginTop: 16 }]}>Loại ghi chú</Text>
        <View style={styles.chipRow}>
          {NOTE_TYPES.map(t => (
            <Chip key={t.value} selected={noteType === t.value} onPress={() => { setNoteType(t.value); setMetadata({}); }}
              style={noteType === t.value ? { backgroundColor: COLOR } : undefined}
              textStyle={noteType === t.value ? { color: '#fff' } : undefined} compact>{t.label}</Chip>
          ))}
        </View>

        <TextInput label="Nội dung ghi chú" mode="outlined" value={content} onChangeText={setContent}
          multiline numberOfLines={5} style={styles.textarea} maxLength={500} />
        <Text style={styles.charCount}>{content.length}/500</Text>

        {noteType === 'meal' && (
          <Card style={styles.metaCard} mode="outlined">
            <Card.Content>
              <Text style={styles.metaTitle}>Chi tiết bữa ăn</Text>
              <ChipGroup label="Bữa" options={MEAL_TYPES} selected={metadata.mealType ?? ''} onSelect={v => updateMeta('mealType', v)} />
              <ChipGroup label="Lượng ăn" options={INTAKE_AMOUNTS} selected={metadata.intakeAmount ?? ''} onSelect={v => updateMeta('intakeAmount', v)} />
              <ChipGroup label="Khẩu vị" options={APPETITES} selected={metadata.appetite ?? ''} onSelect={v => updateMeta('appetite', v)} />
            </Card.Content>
          </Card>
        )}

        {noteType === 'activity' && (
          <Card style={styles.metaCard} mode="outlined">
            <Card.Content>
              <Text style={styles.metaTitle}>Chi tiết hoạt động</Text>
              <ChipGroup label="Loại" options={ACTIVITY_TYPES} selected={metadata.activityType ?? ''} onSelect={v => updateMeta('activityType', v)} />
              <TextInput label="Thời lượng (phút)" mode="outlined" value={String(metadata.duration ?? '')} onChangeText={v => updateMeta('duration', Number(v) || 0)} keyboardType="numeric" dense style={{ marginBottom: 12 }} />
              <ChipGroup label="Mức tham gia" options={PARTICIPATION} selected={metadata.participationLevel ?? ''} onSelect={v => updateMeta('participationLevel', v)} />
              <ChipGroup label="Tâm trạng" options={MOODS} selected={metadata.mood ?? ''} onSelect={v => updateMeta('mood', v)} />
            </Card.Content>
          </Card>
        )}

        {noteType === 'health' && (
          <Card style={styles.metaCard} mode="outlined">
            <Card.Content>
              <Text style={styles.metaTitle}>Chi tiết sức khỏe</Text>
              <TextInput label="Triệu chứng" mode="outlined" value={metadata.symptoms?.join(', ') ?? ''} onChangeText={v => updateMeta('symptoms', v.split(',').map((s: string) => s.trim()).filter(Boolean))} dense multiline style={{ marginBottom: 12 }} placeholder="Nhập triệu chứng, cách nhau bằng dấu phẩy" />
              <ChipGroup label="Ý thức" options={CONSCIOUSNESS} selected={metadata.consciousness ?? ''} onSelect={v => updateMeta('consciousness', v)} />
              <ChipGroup label="Nguy cơ ngã" options={FALL_RISK} selected={metadata.fallRisk ?? ''} onSelect={v => updateMeta('fallRisk', v)} />
              <TextInput label="Mức đau (0-10)" mode="outlined" value={String(metadata.painLevel ?? '')} onChangeText={v => updateMeta('painLevel', Math.min(10, Math.max(0, Number(v) || 0)))} keyboardType="numeric" dense style={{ marginBottom: 12 }} />
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <TextInput label="Nhiệt độ (°C)" mode="outlined" value={String(metadata.temperature ?? '')} onChangeText={v => updateMeta('temperature', Number(v) || 0)} keyboardType="numeric" dense style={{ flex: 1 }} />
                <TextInput label="Mạch (bpm)" mode="outlined" value={String(metadata.pulse ?? '')} onChangeText={v => updateMeta('pulse', Number(v) || 0)} keyboardType="numeric" dense style={{ flex: 1 }} />
              </View>
              <TextInput label="Quan sát khác" mode="outlined" value={metadata.observations ?? ''} onChangeText={v => updateMeta('observations', v)} dense multiline style={{ marginBottom: 8 }} />
            </Card.Content>
          </Card>
        )}

        {noteType === 'daily_living' && (
          <Card style={styles.metaCard} mode="outlined">
            <Card.Content>
              <Text style={styles.metaTitle}>Chi tiết sinh hoạt</Text>
              <ChipGroup label="Loại" options={DL_ACTIVITY_TYPES} selected={metadata.activityType ?? ''} onSelect={v => updateMeta('activityType', v)} />
              <ChipGroup label="Mức hỗ trợ" options={ASSISTANCE} selected={metadata.assistanceLevel ?? ''} onSelect={v => updateMeta('assistanceLevel', v)} />
              <ChipGroup label="Hoàn thành" options={COMPLETION} selected={metadata.completionStatus ?? ''} onSelect={v => updateMeta('completionStatus', v)} />
              <TextInput label="Thời lượng (phút)" mode="outlined" value={String(metadata.duration ?? '')} onChangeText={v => updateMeta('duration', Number(v) || 0)} keyboardType="numeric" dense style={{ marginBottom: 12 }} />
              <ChipGroup label="Tâm trạng" options={MOODS} selected={metadata.mood ?? ''} onSelect={v => updateMeta('mood', v)} />
            </Card.Content>
          </Card>
        )}

        <Button mode="contained" buttonColor={COLOR} onPress={handleSubmit}
          loading={updateNote.isPending} disabled={updateNote.isPending} style={styles.submitBtn}>
          Cập nhật ghi chú
        </Button>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 4, paddingBottom: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  body: { padding: 16, paddingBottom: 32 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 8 },
  residentCard: { borderRadius: 12, backgroundColor: '#fff' },
  residentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  residentName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  residentCode: { fontSize: 12, color: '#6B7280' },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 16 },
  textarea: { marginTop: 0 },
  charCount: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: 2 },
  metaCard: { borderRadius: 12, marginTop: 16, backgroundColor: '#fff' },
  metaTitle: { fontSize: 14, fontWeight: '600', color: COLOR, marginBottom: 12 },
  metaLabel: { fontSize: 12, fontWeight: '500', color: '#6B7280', marginBottom: 6 },
  submitBtn: { marginTop: 20, borderRadius: 8 },
});
