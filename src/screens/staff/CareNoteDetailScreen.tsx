import React from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { CARE_NOTES } from '../../api/endpoints';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { AvatarCircle } from '../../components/shared/AvatarCircle';

const COLOR = '#0F5040';

const formatDateTime = (d: string) => {
  if (!d) return 'N/A';
  try { return new Date(d).toLocaleString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
};

const META_LABELS: Record<string, Record<string, string>> = {
  mealType: { breakfast: 'Sáng', lunch: 'Trưa', dinner: 'Tối', snack: 'Phụ' },
  intakeAmount: { none: 'Không ăn', little: 'Ít', half: 'Nửa', most: 'Gần hết', all: 'Hết' },
  appetite: { poor: 'Kém', fair: 'Bình thường', good: 'Tốt', excellent: 'Rất tốt' },
  activityType: { walking: 'Đi bộ', exercise: 'Tập thể dục', physiotherapy: 'VLTL', reading: 'Đọc sách', socializing: 'Giao tiếp', entertainment: 'Giải trí', other: 'Khác', bathing: 'Tắm', grooming: 'Vệ sinh', dressing: 'Mặc đồ', eating: 'Ăn', mobility: 'Di chuyển', toileting: 'VS cá nhân', sleeping: 'Ngủ' },
  participationLevel: { refused: 'Từ chối', assisted: 'Hỗ trợ', supervised: 'Giám sát', independent: 'Tự lập' },
  mood: { happy: 'Vui', neutral: 'Bình thường', sad: 'Buồn', agitated: 'Kích động', anxious: 'Lo lắng' },
  assistanceLevel: { independent: 'Tự lập', supervised: 'Giám sát', assisted: 'Hỗ trợ', total_care: 'Toàn diện' },
  completionStatus: { completed: 'Hoàn thành', partial: 'Một phần', refused: 'Từ chối' },
  consciousness: { alert: 'Tỉnh táo', confused: 'Lẫn lộn', drowsy: 'Ngủ gà', unresponsive: 'Không phản hồi' },
  fallRisk: { low: 'Thấp', medium: 'Trung bình', high: 'Cao' },
};

const FIELD_LABELS: Record<string, string> = {
  mealType: 'Bữa', intakeAmount: 'Lượng ăn', appetite: 'Ngon miệng',
  activityType: 'Loại hoạt động', participationLevel: 'Mức tham gia', mood: 'Tâm trạng', duration: 'Thời lượng',
  assistanceLevel: 'Mức hỗ trợ', completionStatus: 'Hoàn thành',
  consciousness: 'Ý thức', fallRisk: 'Nguy cơ ngã', painLevel: 'Mức đau', temperature: 'Nhiệt độ', pulse: 'Nhịp tim', symptoms: 'Triệu chứng',
};

const formatMetaValue = (key: string, value: any): string => {
  if (value == null) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (META_LABELS[key]?.[value]) return META_LABELS[key][value];
  if (key === 'duration') return `${value} phút`;
  if (key === 'painLevel') return `${value}/10`;
  if (key === 'temperature') return `${value}°C`;
  if (key === 'pulse') return `${value} bpm`;
  return String(value);
};

export const CareNoteDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const noteId = route.params?.noteId;

  const noteQ = useQuery({
    queryKey: ['careNoteDetail', noteId],
    queryFn: async () => (await api.get(CARE_NOTES.DETAIL(noteId))).data,
    enabled: !!noteId,
  });

  const note = noteQ.data?.data ?? noteQ.data;

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Chi tiết ghi chú</Text>
      </View>

      <ScreenLayout loading={noteQ.isLoading} error={noteQ.error ? (noteQ.error as Error).message : null} onRetry={noteQ.refetch} isEmpty={!note} emptyMessage="Không tìm thấy ghi chú">
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.headerRow}>
            <StatusBadge status={note?.noteType} />
            <Text style={styles.dateText}>{formatDateTime(note?.noteAt)}</Text>
          </View>

          {note?.residentId && (
            <Card style={styles.card} mode="outlined">
              <Card.Content style={styles.resRow}>
                <AvatarCircle name={note.residentId.fullName ?? ''} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.resName}>{note.residentId.fullName}</Text>
                  <Text style={styles.resSub}>{note.residentId.residentCode ?? ''}</Text>
                </View>
                <Button compact textColor={COLOR} onPress={() => nav.navigate('NoteHistory', { residentId: note.residentId._id, residentName: note.residentId.fullName })}>
                  Lịch sử
                </Button>
              </Card.Content>
            </Card>
          )}

          <Card style={styles.card} mode="outlined">
            <Card.Content>
              <Text style={styles.contentLabel}>Nội dung</Text>
              <Text style={styles.contentText}>{note?.content}</Text>
            </Card.Content>
          </Card>

          {note?.metadata && Object.keys(note.metadata).length > 0 && (
            <Card style={styles.card} mode="outlined">
              <Card.Content>
                <Text style={styles.contentLabel}>Thông tin chi tiết</Text>
                {Object.entries(note.metadata).map(([key, value]) => {
                  if (value == null || value === '') return null;
                  const label = FIELD_LABELS[key] ?? key;
                  const display = formatMetaValue(key, value);
                  return (
                    <View key={key} style={styles.metaItem}>
                      <Text style={styles.metaKey}>{label}</Text>
                      <Text style={styles.metaVal}>{display}</Text>
                    </View>
                  );
                })}
              </Card.Content>
            </Card>
          )}

          {note?.authorStaffId && (
            <Card style={[styles.card, { backgroundColor: '#F9FAFB' }]} mode="outlined">
              <Card.Content>
                <Text style={styles.contentLabel}>Người ghi</Text>
                <Text style={styles.authorName}>{note.authorStaffId.userId?.fullName ?? note.authorStaffId.fullName ?? 'N/A'}</Text>
                <Text style={styles.authorSub}>
                  {note.authorStaffId.staffCode ?? ''}{note.authorStaffId.specialty ? ` · ${note.authorStaffId.specialty}` : ''}
                </Text>
              </Card.Content>
            </Card>
          )}

          <View style={styles.actionsRow}>
            <Button mode="contained" buttonColor={COLOR} icon="pencil"
              onPress={() => nav.navigate('EditNote', { noteId: note?._id })}
              style={{ flex: 1, borderRadius: 10 }}>
              Chỉnh sửa
            </Button>
          </View>
        </ScrollView>
      </ScreenLayout>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  body: { padding: 16, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dateText: { fontSize: 13, color: '#6B7280' },
  card: { borderRadius: 12, marginBottom: 12, backgroundColor: '#fff' },
  resRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  resSub: { fontSize: 12, color: '#6B7280' },
  contentLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  contentText: { fontSize: 14, color: '#374151', lineHeight: 22 },
  metaItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  metaKey: { fontSize: 13, color: '#6B7280' },
  metaVal: { fontSize: 13, fontWeight: '600', color: '#111827', textTransform: 'capitalize' },
  authorName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  authorSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
});
