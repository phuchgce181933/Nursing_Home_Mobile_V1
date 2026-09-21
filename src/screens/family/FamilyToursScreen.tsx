import React, { useRef, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Platform, KeyboardAvoidingView, ScrollView, TextInput as RNTextInput } from 'react-native';
import { Text, Card, Button, FAB, Dialog, Portal, TextInput, Chip } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { CalendarPicker } from '../../components/shared/CalendarPicker';
import { useToast } from '../../utils/toast';
import { BackHeader } from '../../components/layout/BackHeader';
import { formatLocalDate } from '../../utils/date';

const COLOR = '#2E7D32';
const NS = 'family.tours';
const PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)\d{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TEXT_LENGTH = 500;
const TIME_SLOTS = ['08:00 - 10:00', '10:00 - 12:00', '14:00 - 16:00', '16:00 - 18:00'];

const todayStr = () => formatLocalDate(new Date());

export const FamilyToursScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const toast = useToast();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [form, setForm] = useState({ contactName: '', contactPhone: '', contactEmail: '', preferredDate: '', preferredTimeSlot: TIME_SLOTS[0], numberOfVisitors: '1', notes: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const phoneRef = useRef<RNTextInput>(null);
  const emailRef = useRef<RNTextInput>(null);
  const visitorsRef = useRef<RNTextInput>(null);
  const notesRef = useRef<RNTextInput>(null);

  const listQ = useQuery({ queryKey: ['tours'], queryFn: async () => (await api.get(FAMILY.TOURS)).data });
  const items = listQ.data?.data ?? listQ.data ?? [];

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.contactName.trim()) next.contactName = t(`${NS}.errNameRequired`, 'Tên liên hệ là bắt buộc');
    if (!form.contactPhone.trim()) {
      next.contactPhone = t(`${NS}.errPhoneRequired`, 'Số điện thoại là bắt buộc');
    } else if (!PHONE_REGEX.test(form.contactPhone.trim())) {
      next.contactPhone = t(`${NS}.errPhoneInvalid`, 'Số điện thoại không hợp lệ (VD: 09xxxxxxxx)');
    }
    if (form.contactEmail && !EMAIL_REGEX.test(form.contactEmail.trim())) {
      next.contactEmail = t(`${NS}.errEmailInvalid`, 'Địa chỉ email không hợp lệ');
    }
    if (!form.preferredDate) {
      next.preferredDate = t(`${NS}.errDateRequired`, 'Ngày mong muốn là bắt buộc');
    } else if (form.preferredDate < todayStr()) {
      next.preferredDate = t(`${NS}.errDateFuture`, 'Ngày mong muốn phải là hôm nay hoặc trong tương lai');
    }
    const visitors = parseInt(form.numberOfVisitors, 10);
    if (Number.isNaN(visitors) || visitors < 1 || visitors > 20) {
      next.numberOfVisitors = t(`${NS}.errVisitorsRange`, 'Số lượng người tham quan phải từ 1 đến 20');
    }
    if (form.notes.length > MAX_TEXT_LENGTH) next.notes = t(`${NS}.errTooLong`, 'Không được vượt quá 500 ký tự');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const createMut = useMutation({
    mutationFn: async () => (await api.post(FAMILY.TOURS, { ...form, numberOfVisitors: Number(form.numberOfVisitors) || 1 })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tours'] }); setShowCreate(false); setErrors({}); setForm({ contactName: '', contactPhone: '', contactEmail: '', preferredDate: '', preferredTimeSlot: TIME_SLOTS[0], numberOfVisitors: '1', notes: '' }); toast(t(`${NS}.toastBooked`), 'success'); },
    onError: (err: any) => toast(err?.response?.data?.message || t(`${NS}.toastBookError`), 'error'),
  });

  const cancelMut = useMutation({
    mutationFn: async () => (await api.patch(FAMILY.TOUR_CANCEL(cancelId!), { cancellationReason: cancelReason })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tours'] }); setCancelId(null); setCancelReason(''); toast(t(`${NS}.toastCancelled`), 'success'); },
    onError: () => toast(t(`${NS}.toastCancelError`), 'error'),
  });

  const handleSubmit = () => {
    if (validate()) createMut.mutate();
  };

  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.title`)} color={COLOR} onBack={() => navigation?.goBack()} />
      <ScreenLayout loading={listQ.isLoading} error={listQ.error ? (listQ.error as Error).message : null} onRetry={listQ.refetch} isEmpty={items.length === 0} emptyMessage={t(`${NS}.empty`)}>
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={listQ.isFetching} onRefresh={listQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined">
              <Card.Content>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.contactName}</Text>
                    <Text style={styles.sub}>{item.preferredDate ? new Date(item.preferredDate).toLocaleDateString('vi-VN') : ''} · {item.preferredTimeSlot ?? ''} · {t(`${NS}.visitorsCount`, { count: item.numberOfVisitors ?? 1 })}</Text>
                    <Text style={styles.sub}>{item.contactPhone}</Text>
                  </View>
                  <StatusBadge status={item.status} size="sm" />
                </View>
              </Card.Content>
              {item.status === 'pending' ? (
                <Card.Actions><Button compact textColor="#991B1B" onPress={() => setCancelId(item._id)}>{t(`${NS}.cancel`)}</Button></Card.Actions>
              ) : null}
            </Card>
          )} />
      </ScreenLayout>
      <FAB icon="plus" style={[styles.fab, { backgroundColor: COLOR }]} color="#fff" onPress={() => setShowCreate(true)} />

      <Portal>
        <Dialog visible={showCreate} onDismiss={() => setShowCreate(false)} dismissable={false} dismissableBackButton style={{ borderRadius: 16 }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <Dialog.Title>{t(`${NS}.createTitle`)}</Dialog.Title>
            <Dialog.ScrollArea style={{ maxHeight: 460 }}>
              <ScrollView keyboardShouldPersistTaps="handled">
                <TextInput
                  label={t(`${NS}.contactNameLabel`)} mode="outlined" value={form.contactName}
                  onChangeText={v => setForm(f => ({ ...f, contactName: v }))} dense style={styles.input} error={!!errors.contactName} maxLength={100}
                  returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => phoneRef.current?.focus()}
                />
                {errors.contactName ? <Text style={styles.errText}>{errors.contactName}</Text> : null}
                <TextInput
                  ref={phoneRef}
                  label={t(`${NS}.contactPhoneLabel`)} mode="outlined" value={form.contactPhone}
                  onChangeText={v => setForm(f => ({ ...f, contactPhone: v }))} dense keyboardType="phone-pad" style={styles.input} error={!!errors.contactPhone} maxLength={13}
                  returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => emailRef.current?.focus()}
                />
                {errors.contactPhone ? <Text style={styles.errText}>{errors.contactPhone}</Text> : null}
                <TextInput
                  ref={emailRef}
                  label={t(`${NS}.emailLabel`)} mode="outlined" value={form.contactEmail}
                  onChangeText={v => setForm(f => ({ ...f, contactEmail: v }))} dense keyboardType="email-address" style={styles.input} error={!!errors.contactEmail}
                  returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => visitorsRef.current?.focus()}
                />
                {errors.contactEmail ? <Text style={styles.errText}>{errors.contactEmail}</Text> : null}
                <CalendarPicker label={t(`${NS}.preferredDateLabel`)} value={form.preferredDate} onChange={v => setForm(f => ({ ...f, preferredDate: v }))} minDate={todayStr()} color={COLOR} />
                {errors.preferredDate ? <Text style={styles.errText}>{errors.preferredDate}</Text> : null}
                <Text style={styles.chipLabel}>{t(`${NS}.timeSlotLabel`)}</Text>
                <View style={styles.chipRow}>
                  {TIME_SLOTS.map(slot => (
                    <Chip key={slot} selected={form.preferredTimeSlot === slot} onPress={() => setForm(f => ({ ...f, preferredTimeSlot: slot }))} style={styles.chip} selectedColor={COLOR}>
                      {slot}
                    </Chip>
                  ))}
                </View>
                <TextInput
                  ref={visitorsRef}
                  label={t(`${NS}.visitorsLabel`)} mode="outlined" value={form.numberOfVisitors}
                  onChangeText={v => setForm(f => ({ ...f, numberOfVisitors: v }))} dense keyboardType="numeric" style={styles.input} error={!!errors.numberOfVisitors}
                  returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => notesRef.current?.focus()}
                />
                {errors.numberOfVisitors ? <Text style={styles.errText}>{errors.numberOfVisitors}</Text> : null}
                <TextInput
                  ref={notesRef}
                  label={t(`${NS}.notesLabel`)} mode="outlined" value={form.notes}
                  onChangeText={v => setForm(f => ({ ...f, notes: v }))} dense multiline style={styles.input} error={!!errors.notes} maxLength={MAX_TEXT_LENGTH}
                  returnKeyType="done" submitBehavior="blurAndSubmit"
                />
                {errors.notes ? <Text style={styles.errText}>{errors.notes}</Text> : null}
                <Text style={styles.charCount}>{form.notes.length}/{MAX_TEXT_LENGTH}</Text>
              </ScrollView>
            </Dialog.ScrollArea>
            <Dialog.Actions>
              <Button onPress={() => { setShowCreate(false); setErrors({}); }}>{t('common.cancel')}</Button>
              <Button mode="contained" buttonColor={COLOR} onPress={handleSubmit} loading={createMut.isPending} disabled={!form.contactName || !form.contactPhone || !form.preferredDate}>{t(`${NS}.book`)}</Button>
            </Dialog.Actions>
          </KeyboardAvoidingView>
        </Dialog>
        <Dialog visible={!!cancelId} onDismiss={() => setCancelId(null)} dismissable={false} dismissableBackButton>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <Dialog.Title>{t(`${NS}.cancelConfirmTitle`)}</Dialog.Title>
            <Dialog.Content>
              <TextInput label={t(`${NS}.cancelReasonLabel`)} mode="outlined" value={cancelReason} onChangeText={setCancelReason} dense multiline maxLength={MAX_TEXT_LENGTH} returnKeyType="done" submitBehavior="blurAndSubmit" />
            </Dialog.Content>
            <Dialog.Actions><Button onPress={() => setCancelId(null)}>{t(`${NS}.close`)}</Button><Button mode="contained" buttonColor="#991B1B" onPress={() => cancelMut.mutate()} loading={cancelMut.isPending}>{t(`${NS}.cancel`)}</Button></Dialog.Actions>
          </KeyboardAvoidingView>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' }, list: { padding: 16, paddingBottom: 80 }, card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' }, row: { flexDirection: 'row', alignItems: 'center' }, name: { fontSize: 14, fontWeight: '600', color: '#111827' }, sub: { fontSize: 12, color: '#6B7280', marginTop: 2 }, fab: { position: 'absolute', bottom: 16, right: 16 }, input: { marginBottom: 8 },
  errText: { color: '#DC2626', fontSize: 11, marginTop: -4, marginBottom: 8 },
  charCount: { color: '#9CA3AF', fontSize: 10, textAlign: 'right', marginTop: -4, marginBottom: 8 },
  chipLabel: { fontSize: 11, color: '#6B7280', marginBottom: 6, marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { marginRight: 4, marginBottom: 4 },
});
