import React, { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text, TextInput, Button, Chip, Card } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/useAuth';
import { useCreateCareNote } from '../../hooks/useCareNotes';
import { useResidents } from '../../hooks/useResidents';
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

export const CreateCareNoteScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const toast = useToast();
  const createNote = useCreateCareNote();
  const residentsQ = useResidents({ status: 'admitted' });
  const residents = Array.isArray(residentsQ.data) ? residentsQ.data : (residentsQ.data?.data ?? []);

  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [noteType, setNoteType] = useState('general');
  const [content, setContent] = useState('');
  const [showResidentPicker, setShowResidentPicker] = useState(false);

  const selectedResident = residents.find((r: any) => r._id === selectedResidentId);

  const handleSubmit = async () => {
    if (!selectedResidentId) {
      toast('Vui lòng chọn cư dân', 'warning');
      return;
    }
    if (!content.trim() || content.trim().length < 5) {
      toast('Nội dung ghi chú tối thiểu 5 ký tự', 'warning');
      return;
    }
    try {
      await createNote.mutateAsync({
        residentId: selectedResidentId,
        content: content.trim(),
        noteType,
      });
      toast('Ghi chú đã được lưu', 'success');
      setContent('');
      setSelectedResidentId('');
      setNoteType('general');
    } catch {
      toast('Không thể lưu ghi chú. Thử lại.', 'error');
    }
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Ghi chú chăm sóc</Text>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Cư dân</Text>
        {selectedResident ? (
          <Card style={styles.residentCard} mode="outlined" onPress={() => setShowResidentPicker(!showResidentPicker)}>
            <Card.Content style={styles.residentRow}>
              <AvatarCircle name={selectedResident.fullName} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={styles.residentName}>{selectedResident.fullName}</Text>
                <Text style={styles.residentCode}>{selectedResident.residentCode}</Text>
              </View>
              <Button compact mode="text" textColor={COLOR} onPress={() => setSelectedResidentId('')}>Đổi</Button>
            </Card.Content>
          </Card>
        ) : (
          <Button mode="outlined" onPress={() => setShowResidentPicker(!showResidentPicker)} style={styles.selectBtn}>
            Chọn cư dân
          </Button>
        )}

        {showResidentPicker ? (
          <Card style={styles.pickerCard}>
            <Card.Content>
              {residents.slice(0, 20).map((r: any) => (
                <Button
                  key={r._id}
                  mode="text"
                  compact
                  onPress={() => {
                    setSelectedResidentId(r._id);
                    setShowResidentPicker(false);
                  }}
                  style={styles.pickerItem}
                >
                  {r.fullName} — {r.residentCode}
                </Button>
              ))}
            </Card.Content>
          </Card>
        ) : null}

        <Text style={[styles.label, { marginTop: 16 }]}>Loại ghi chú</Text>
        <View style={styles.chipRow}>
          {NOTE_TYPES.map((t) => (
            <Chip
              key={t.value}
              selected={noteType === t.value}
              onPress={() => setNoteType(t.value)}
              style={noteType === t.value ? { backgroundColor: COLOR } : undefined}
              textStyle={noteType === t.value ? { color: '#fff' } : undefined}
              compact
            >
              {t.label}
            </Chip>
          ))}
        </View>

        <TextInput
          label="Nội dung ghi chú"
          mode="outlined"
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={5}
          style={styles.textarea}
          maxLength={500}
        />
        <Text style={styles.charCount}>{content.length}/500</Text>

        <Card style={styles.autoCard} mode="outlined">
          <Card.Content>
            <Text style={styles.autoLabel}>Người ghi</Text>
            <Text style={styles.autoValue}>{user?.fullName ?? ''}</Text>
            <Text style={styles.autoLabel}>Thời gian</Text>
            <Text style={styles.autoValue}>{new Date().toLocaleString('vi-VN')}</Text>
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          buttonColor={COLOR}
          onPress={handleSubmit}
          loading={createNote.isPending}
          disabled={createNote.isPending}
          style={styles.submitBtn}
        >
          Lưu ghi chú
        </Button>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  body: { padding: 16, paddingBottom: 32 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 8 },
  residentCard: { borderRadius: 12, backgroundColor: '#fff' },
  residentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  residentName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  residentCode: { fontSize: 12, color: '#6B7280' },
  selectBtn: { borderRadius: 8, borderColor: COLOR },
  pickerCard: { marginTop: 8, borderRadius: 12, maxHeight: 200 },
  pickerItem: { justifyContent: 'flex-start' },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 16 },
  textarea: { marginTop: 0 },
  charCount: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: 2 },
  autoCard: { borderRadius: 12, marginTop: 16, backgroundColor: '#F9FAFB' },
  autoLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  autoValue: { fontSize: 13, color: '#111827' },
  submitBtn: { marginTop: 20, borderRadius: 8 },
});
