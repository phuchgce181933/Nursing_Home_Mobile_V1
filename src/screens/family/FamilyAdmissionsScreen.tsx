import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Button, FAB, Dialog, Portal, TextInput, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { CalendarPicker } from '../../components/shared/CalendarPicker';
import { useToast } from '../../utils/toast';

const COLOR = '#2E7D32';
const NS = 'family.admissions';
const PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)\d{8}$/;
const MAX_TEXT_LENGTH = 500;

const todayStr = () => new Date().toISOString().split('T')[0];

const calcAge = (dobStr: string) => {
  const dob = new Date(dobStr);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
};

export const FamilyAdmissionsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [form, setForm] = useState({ fullName: '', relationshipToRequester: '', dateOfBirth: '', gender: 'unknown', preferredAdmissionDate: '', reasonForAdmission: '', notes: '', requestedByPhone: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const listQ = useQuery({ queryKey: ['admissions'], queryFn: async () => { const r = await api.get(FAMILY.ADMISSIONS); return r.data; } });
  const items = listQ.data?.data ?? listQ.data ?? [];

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.fullName.trim()) next.fullName = t(`${NS}.errFullNameRequired`, 'Họ và tên là bắt buộc');
    if (!form.relationshipToRequester.trim()) next.relationshipToRequester = t(`${NS}.errRelationshipRequired`, 'Mối quan hệ là bắt buộc');
    if (form.dateOfBirth) {
      const age = calcAge(form.dateOfBirth);
      if (age < 50 || age > 110) next.dateOfBirth = t(`${NS}.errDobRange`, 'Người đăng ký nhập viện phải từ 50 đến 110 tuổi');
    }
    if (form.preferredAdmissionDate && form.preferredAdmissionDate < todayStr()) {
      next.preferredAdmissionDate = t(`${NS}.errDateFuture`, 'Ngày mong muốn phải là hôm nay hoặc trong tương lai');
    }
    if (form.requestedByPhone && !PHONE_REGEX.test(form.requestedByPhone.trim())) {
      next.requestedByPhone = t(`${NS}.errPhoneInvalid`, 'Số điện thoại không hợp lệ (VD: 09xxxxxxxx)');
    }
    if (form.reasonForAdmission.length > MAX_TEXT_LENGTH) next.reasonForAdmission = t(`${NS}.errTooLong`, 'Không được vượt quá 500 ký tự');
    if (form.notes.length > MAX_TEXT_LENGTH) next.notes = t(`${NS}.errTooLong`, 'Không được vượt quá 500 ký tự');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const createMut = useMutation({
    mutationFn: async () => {
      const body = { applicant: { fullName: form.fullName, relationshipToRequester: form.relationshipToRequester, dateOfBirth: form.dateOfBirth || undefined, gender: form.gender }, preferredAdmissionDate: form.preferredAdmissionDate || undefined, reasonForAdmission: form.reasonForAdmission, notes: form.notes, requestedByPhone: form.requestedByPhone };
      return (await api.post(FAMILY.ADMISSIONS, body)).data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admissions'] }); setShowCreate(false); setErrors({}); setForm({ fullName: '', relationshipToRequester: '', dateOfBirth: '', gender: 'unknown', preferredAdmissionDate: '', reasonForAdmission: '', notes: '', requestedByPhone: '' }); toast(t(`${NS}.toastSent`), 'success'); },
    onError: (err: any) => toast(err?.response?.data?.message || t(`${NS}.toastSendError`), 'error'),
  });

  const cancelMut = useMutation({
    mutationFn: async () => (await api.patch(FAMILY.ADMISSION_CANCEL(cancelId!), { cancellationReason: cancelReason })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admissions'] }); setCancelId(null); setCancelReason(''); toast(t(`${NS}.toastCancelled`), 'success'); },
    onError: () => toast(t(`${NS}.toastCancelError`), 'error'),
  });

  const handleSubmit = () => {
    if (validate()) createMut.mutate();
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation?.goBack()} style={styles.backBtn} />
        <Text style={styles.topTitle}>{t(`${NS}.title`)}</Text>
      </View>
      <ScreenLayout loading={listQ.isLoading} error={listQ.error ? (listQ.error as Error).message : null} onRetry={listQ.refetch} isEmpty={items.length === 0} emptyMessage={t(`${NS}.empty`)}>
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={false} onRefresh={listQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined" onPress={() => navigation?.navigate('AdmissionDetail', { admissionId: item._id })}>
              <Card.Content>
                <View style={styles.row}><View style={{ flex: 1 }}><Text style={styles.name}>{item.applicant?.fullName ?? '--'}</Text><Text style={styles.sub}>{item.applicant?.relationshipToRequester ?? ''} · {item.preferredAdmissionDate ? new Date(item.preferredAdmissionDate).toLocaleDateString('vi-VN') : ''}</Text>{item.reasonForAdmission ? <Text style={styles.reason} numberOfLines={2}>{item.reasonForAdmission}</Text> : null}</View><StatusBadge status={item.status} size="sm" /></View>
              </Card.Content>
              {item.status === 'new_request' || item.status === 'consulting' ? (
                <Card.Actions><Button compact textColor="#991B1B" onPress={() => setCancelId(item._id)}>{t(`${NS}.cancel`)}</Button></Card.Actions>
              ) : null}
            </Card>
          )} />
      </ScreenLayout>
      <FAB icon="plus" style={[styles.fab, { backgroundColor: COLOR }]} color="#fff" onPress={() => setShowCreate(true)} />

      <Portal>
        <Dialog visible={showCreate} onDismiss={() => setShowCreate(false)} style={{ borderRadius: 16 }}>
          <Dialog.Title>{t(`${NS}.createTitle`)}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 460 }}>
            <TextInput label={t(`${NS}.fullNameLabel`)} mode="outlined" value={form.fullName} onChangeText={v => setForm(f => ({ ...f, fullName: v }))} dense style={styles.input} error={!!errors.fullName} maxLength={100} />
            {errors.fullName ? <Text style={styles.errText}>{errors.fullName}</Text> : null}
            <TextInput label={t(`${NS}.relationshipLabel`)} mode="outlined" value={form.relationshipToRequester} onChangeText={v => setForm(f => ({ ...f, relationshipToRequester: v }))} dense style={styles.input} placeholder={t(`${NS}.relationshipPlaceholder`)} error={!!errors.relationshipToRequester} maxLength={100} />
            {errors.relationshipToRequester ? <Text style={styles.errText}>{errors.relationshipToRequester}</Text> : null}
            <CalendarPicker label={t(`${NS}.dobLabel`)} value={form.dateOfBirth} onChange={v => setForm(f => ({ ...f, dateOfBirth: v }))} color={COLOR} />
            {errors.dateOfBirth ? <Text style={styles.errText}>{errors.dateOfBirth}</Text> : null}
            <CalendarPicker label={t(`${NS}.preferredDateLabel`)} value={form.preferredAdmissionDate} onChange={v => setForm(f => ({ ...f, preferredAdmissionDate: v }))} minDate={todayStr()} color={COLOR} />
            {errors.preferredAdmissionDate ? <Text style={styles.errText}>{errors.preferredAdmissionDate}</Text> : null}
            <TextInput label={t(`${NS}.reasonLabel`)} mode="outlined" value={form.reasonForAdmission} onChangeText={v => setForm(f => ({ ...f, reasonForAdmission: v }))} dense multiline style={styles.input} error={!!errors.reasonForAdmission} maxLength={MAX_TEXT_LENGTH} />
            {errors.reasonForAdmission ? <Text style={styles.errText}>{errors.reasonForAdmission}</Text> : null}
            <TextInput label={t(`${NS}.phoneLabel`)} mode="outlined" value={form.requestedByPhone} onChangeText={v => setForm(f => ({ ...f, requestedByPhone: v }))} dense keyboardType="phone-pad" style={styles.input} error={!!errors.requestedByPhone} maxLength={13} />
            {errors.requestedByPhone ? <Text style={styles.errText}>{errors.requestedByPhone}</Text> : null}
            <TextInput label={t(`${NS}.notesLabel`)} mode="outlined" value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} dense multiline style={styles.input} error={!!errors.notes} maxLength={MAX_TEXT_LENGTH} />
            {errors.notes ? <Text style={styles.errText}>{errors.notes}</Text> : null}
            <Text style={styles.charCount}>{form.notes.length}/{MAX_TEXT_LENGTH}</Text>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => { setShowCreate(false); setErrors({}); }}>{t('common.cancel')}</Button>
            <Button mode="contained" buttonColor={COLOR} onPress={handleSubmit} loading={createMut.isPending} disabled={!form.fullName || !form.relationshipToRequester}>{t(`${NS}.send`)}</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={!!cancelId} onDismiss={() => setCancelId(null)}>
          <Dialog.Title>{t(`${NS}.cancelConfirmTitle`)}</Dialog.Title>
          <Dialog.Content>
            <TextInput label={t(`${NS}.cancelReasonLabel`)} mode="outlined" value={cancelReason} onChangeText={setCancelReason} dense multiline maxLength={MAX_TEXT_LENGTH} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCancelId(null)}>{t(`${NS}.close`)}</Button>
            <Button mode="contained" buttonColor="#991B1B" onPress={() => cancelMut.mutate()} loading={cancelMut.isPending}>{t(`${NS}.cancelRequest`)}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 8, paddingBottom: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center' },
  backBtn: { margin: 0 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  list: { padding: 16, paddingBottom: 80 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '600', color: '#111827' },
  sub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  reason: { fontSize: 12, color: '#374151', marginTop: 4 },
  fab: { position: 'absolute', bottom: 16, right: 16 },
  input: { marginBottom: 8 },
  errText: { color: '#DC2626', fontSize: 11, marginTop: -4, marginBottom: 8 },
  charCount: { color: '#9CA3AF', fontSize: 10, textAlign: 'right', marginTop: -4, marginBottom: 8 },
});
