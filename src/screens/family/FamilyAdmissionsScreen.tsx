import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Button, FAB, Dialog, Portal, TextInput, Chip } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { useToast } from '../../utils/toast';

const COLOR = '#2E7D32';
const STATUS_LABELS: Record<string, string> = { new_request: 'Mới', consulting: 'Tư vấn', assessing: 'Đánh giá', contracting: 'Hợp đồng', checked_in: 'Đã nhận', cancelled: 'Đã hủy' };

export const FamilyAdmissionsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [form, setForm] = useState({ fullName: '', relationshipToRequester: '', dateOfBirth: '', gender: 'unknown', preferredAdmissionDate: '', reasonForAdmission: '', notes: '', requestedByPhone: '' });

  const listQ = useQuery({ queryKey: ['admissions'], queryFn: async () => { const r = await api.get(FAMILY.ADMISSIONS); return r.data; } });
  const items = listQ.data?.data ?? listQ.data ?? [];

  const createMut = useMutation({
    mutationFn: async () => {
      const body = { applicant: { fullName: form.fullName, relationshipToRequester: form.relationshipToRequester, dateOfBirth: form.dateOfBirth || undefined, gender: form.gender }, preferredAdmissionDate: form.preferredAdmissionDate || undefined, reasonForAdmission: form.reasonForAdmission, notes: form.notes, requestedByPhone: form.requestedByPhone };
      return (await api.post(FAMILY.ADMISSIONS, body)).data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admissions'] }); setShowCreate(false); setForm({ fullName: '', relationshipToRequester: '', dateOfBirth: '', gender: 'unknown', preferredAdmissionDate: '', reasonForAdmission: '', notes: '', requestedByPhone: '' }); toast('Đã gửi yêu cầu nhập viện', 'success'); },
    onError: () => toast('Không thể gửi yêu cầu', 'error'),
  });

  const cancelMut = useMutation({
    mutationFn: async () => (await api.patch(FAMILY.ADMISSION_CANCEL(cancelId!), { cancellationReason: cancelReason })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admissions'] }); setCancelId(null); setCancelReason(''); toast('Đã hủy yêu cầu', 'success'); },
    onError: () => toast('Không thể hủy', 'error'),
  });

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}><Text style={styles.topTitle}>Yêu cầu nhập viện</Text></View>
      <ScreenLayout loading={listQ.isLoading} error={listQ.error ? (listQ.error as Error).message : null} onRetry={listQ.refetch} isEmpty={items.length === 0} emptyMessage="Chưa có yêu cầu nào">
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={false} onRefresh={listQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined" onPress={() => navigation?.navigate('AdmissionDetail', { admissionId: item._id })}>
              <Card.Content>
                <View style={styles.row}><View style={{ flex: 1 }}><Text style={styles.name}>{item.applicant?.fullName ?? '--'}</Text><Text style={styles.sub}>{item.applicant?.relationshipToRequester ?? ''} · {item.preferredAdmissionDate ? new Date(item.preferredAdmissionDate).toLocaleDateString('vi-VN') : ''}</Text>{item.reasonForAdmission ? <Text style={styles.reason} numberOfLines={2}>{item.reasonForAdmission}</Text> : null}</View><StatusBadge status={item.status} size="sm" /></View>
              </Card.Content>
              {item.status === 'new_request' || item.status === 'consulting' ? (
                <Card.Actions><Button compact textColor="#991B1B" onPress={() => setCancelId(item._id)}>Hủy</Button></Card.Actions>
              ) : null}
            </Card>
          )} />
      </ScreenLayout>
      <FAB icon="plus" style={[styles.fab, { backgroundColor: COLOR }]} color="#fff" onPress={() => setShowCreate(true)} />

      <Portal>
        <Dialog visible={showCreate} onDismiss={() => setShowCreate(false)} style={{ borderRadius: 16 }}>
          <Dialog.Title>Gửi yêu cầu nhập viện</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 400 }}>
            <TextInput label="Họ tên người thân *" mode="outlined" value={form.fullName} onChangeText={v => setForm(f => ({ ...f, fullName: v }))} dense style={styles.input} />
            <TextInput label="Quan hệ *" mode="outlined" value={form.relationshipToRequester} onChangeText={v => setForm(f => ({ ...f, relationshipToRequester: v }))} dense style={styles.input} placeholder="Con, cháu, vợ/chồng..." />
            <TextInput label="Ngày sinh (YYYY-MM-DD)" mode="outlined" value={form.dateOfBirth} onChangeText={v => setForm(f => ({ ...f, dateOfBirth: v }))} dense style={styles.input} />
            <TextInput label="Ngày nhập viện mong muốn" mode="outlined" value={form.preferredAdmissionDate} onChangeText={v => setForm(f => ({ ...f, preferredAdmissionDate: v }))} dense style={styles.input} placeholder="YYYY-MM-DD" />
            <TextInput label="Lý do nhập viện" mode="outlined" value={form.reasonForAdmission} onChangeText={v => setForm(f => ({ ...f, reasonForAdmission: v }))} dense multiline style={styles.input} />
            <TextInput label="Số điện thoại liên hệ" mode="outlined" value={form.requestedByPhone} onChangeText={v => setForm(f => ({ ...f, requestedByPhone: v }))} dense keyboardType="phone-pad" style={styles.input} />
            <TextInput label="Ghi chú" mode="outlined" value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} dense multiline style={styles.input} />
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowCreate(false)}>Hủy</Button>
            <Button mode="contained" buttonColor={COLOR} onPress={() => createMut.mutate()} loading={createMut.isPending} disabled={!form.fullName || !form.relationshipToRequester}>Gửi</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={!!cancelId} onDismiss={() => setCancelId(null)}>
          <Dialog.Title>Hủy yêu cầu nhập viện?</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Lý do hủy" mode="outlined" value={cancelReason} onChangeText={setCancelReason} dense multiline />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCancelId(null)}>Đóng</Button>
            <Button mode="contained" buttonColor="#991B1B" onPress={() => cancelMut.mutate()} loading={cancelMut.isPending}>Hủy yêu cầu</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  list: { padding: 16, paddingBottom: 80 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '600', color: '#111827' },
  sub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  reason: { fontSize: 12, color: '#374151', marginTop: 4 },
  fab: { position: 'absolute', bottom: 16, right: 16 },
  input: { marginBottom: 8 },
});
