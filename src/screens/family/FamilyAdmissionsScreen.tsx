import React, { useMemo, useRef, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, ScrollView, Pressable, Platform, KeyboardAvoidingView, TextInput as RNTextInput } from 'react-native';
import { Text, Card, Button, FAB, Dialog, Portal, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { CalendarPicker } from '../../components/shared/CalendarPicker';
import { useToast } from '../../utils/toast';
import { BackHeader } from '../../components/layout/BackHeader';

const COLOR = '#2E7D32';
const NS = 'family.admissions';
const PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)\d{8}$/;
const MAX_TEXT_LENGTH = 500;
const PROCESSING_STATUSES = ['new_request', 'consulting', 'assessing', 'contracting'];
const STATUS_FILTERS = ['new_request', 'consulting', 'assessing', 'contracting', 'checked_in', 'cancelled'];

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
  const toast = useToast();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [form, setForm] = useState({ fullName: '', relationshipToRequester: '', dateOfBirth: '', gender: 'unknown', preferredAdmissionDate: '', reasonForAdmission: '', notes: '', requestedByPhone: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState('');
  const relationshipRef = useRef<RNTextInput>(null);
  const reasonRef = useRef<RNTextInput>(null);
  const phoneRef = useRef<RNTextInput>(null);
  const notesRef = useRef<RNTextInput>(null);

  // Matches web's 400ms debounce on the same search box, since the search param is
  // sent server-side (also matches by CCCD, which a client-side filter can't do since
  // the citizenId field isn't fetched to the list screen).
  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(id);
  }, [search]);

  const listQ = useQuery({
    queryKey: ['admissions', debouncedSearch, statusFilter, dateFilter],
    queryFn: async () => {
      const r = await api.get(FAMILY.ADMISSIONS, {
        params: {
          limit: 100,
          search: debouncedSearch || undefined,
          status: statusFilter || undefined,
          from: dateFilter || undefined,
        },
      });
      return r.data;
    },
  });
  const items = listQ.data?.data ?? listQ.data ?? [];

  // Stats intentionally come from a separate, unfiltered fetch (mirrors web's own
  // loadStats()) so the three counters always reflect the family's full history,
  // not just whatever the current search/status/date filter narrowed the list to.
  const statsQ = useQuery({
    queryKey: ['admissionsStats'],
    queryFn: async () => { const r = await api.get(FAMILY.ADMISSIONS, { params: { limit: 100 } }); return r.data; },
  });
  const statsItems = statsQ.data?.data ?? statsQ.data ?? [];

  const stats = useMemo(() => {
    const now = new Date();
    const processing = statsItems.filter((i: any) => PROCESSING_STATUSES.includes(i.status)).length;
    const completed = statsItems.filter((i: any) => i.status === 'checked_in').length;
    const upcoming = statsItems.filter((i: any) => {
      const d = i.consultationScheduledAt || i.initialAssessmentScheduledAt;
      return d && new Date(d) >= now;
    }).length;
    return { processing, completed, upcoming };
  }, [statsItems]);

  const filteredItems = items;

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admissions'] }); qc.invalidateQueries({ queryKey: ['admissionsStats'] }); setShowCreate(false); setErrors({}); setForm({ fullName: '', relationshipToRequester: '', dateOfBirth: '', gender: 'unknown', preferredAdmissionDate: '', reasonForAdmission: '', notes: '', requestedByPhone: '' }); toast(t(`${NS}.toastSent`), 'success'); },
    onError: (err: any) => toast(err?.response?.data?.message || t(`${NS}.toastSendError`), 'error'),
  });

  const cancelMut = useMutation({
    mutationFn: async () => (await api.patch(FAMILY.ADMISSION_CANCEL(cancelId!), { cancellationReason: cancelReason })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admissions'] }); qc.invalidateQueries({ queryKey: ['admissionsStats'] }); setCancelId(null); setCancelReason(''); toast(t(`${NS}.toastCancelled`), 'success'); },
    onError: () => toast(t(`${NS}.toastCancelError`), 'error'),
  });

  const handleSubmit = () => {
    if (validate()) createMut.mutate();
  };

  const refetchAll = () => { listQ.refetch(); statsQ.refetch(); };

  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.title`)} color={COLOR} onBack={() => navigation?.goBack()} />
      <ScreenLayout loading={listQ.isLoading} error={listQ.error ? (listQ.error as Error).message : null} onRetry={refetchAll} isEmpty={items.length === 0} emptyMessage={t(`${NS}.empty`)}>
        <FlatList
          data={filteredItems}
          keyExtractor={(i: any) => i._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={listQ.isFetching || statsQ.isFetching} onRefresh={refetchAll} tintColor={COLOR} />}
          ListEmptyComponent={<Text style={styles.noMatch}>{t(`${NS}.noMatch`)}</Text>}
          ListHeaderComponent={
            <View style={styles.headerBlock}>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <MaterialCommunityIcons name="clock-outline" size={20} color="#F59E0B" />
                  <Text style={styles.statValue}>{stats.processing}</Text>
                  <Text style={styles.statLabel}>{t(`${NS}.statProcessing`)}</Text>
                </View>
                <View style={styles.statCard}>
                  <MaterialCommunityIcons name="check-circle-outline" size={20} color="#059669" />
                  <Text style={styles.statValue}>{stats.completed}</Text>
                  <Text style={styles.statLabel}>{t(`${NS}.statCompleted`)}</Text>
                </View>
                <View style={styles.statCard}>
                  <MaterialCommunityIcons name="calendar-clock" size={20} color={COLOR} />
                  <Text style={styles.statValue}>{stats.upcoming}</Text>
                  <Text style={styles.statLabel}>{t(`${NS}.statUpcoming`)}</Text>
                </View>
              </View>

              <TextInput
                mode="outlined"
                dense
                placeholder={t(`${NS}.searchPlaceholder`)}
                value={search}
                onChangeText={setSearch}
                left={<TextInput.Icon icon="magnify" />}
                style={styles.searchInput}
              />

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: 8 }}>
                <Pressable onPress={() => setStatusFilter(null)} style={[styles.filterChip, !statusFilter && { backgroundColor: COLOR }]}>
                  <Text style={[styles.filterChipText, !statusFilter && { color: '#fff' }]}>{t(`${NS}.filterAll`)}</Text>
                </Pressable>
                {STATUS_FILTERS.map((s) => (
                  <Pressable key={s} onPress={() => setStatusFilter(s)} style={[styles.filterChip, statusFilter === s && { backgroundColor: COLOR }]}>
                    <Text style={[styles.filterChipText, statusFilter === s && { color: '#fff' }]}>{t(`status.${s}`)}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={styles.dateFilterRow}>
                <View style={{ flex: 1 }}>
                  <CalendarPicker
                    label={t(`${NS}.dateFilterLabel`, 'Lọc theo ngày gửi')}
                    value={dateFilter}
                    onChange={setDateFilter}
                    color={COLOR}
                  />
                </View>
                {dateFilter ? (
                  <Pressable onPress={() => setDateFilter('')} style={styles.dateFilterClear} hitSlop={8}>
                    <MaterialCommunityIcons name="close-circle" size={20} color="#9CA3AF" />
                  </Pressable>
                ) : null}
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined" onPress={() => navigation?.navigate('AdmissionDetail', { admissionId: item._id })}>
              <Card.Content>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    {item.requestCode ? <Text style={styles.requestCode}>{item.requestCode}</Text> : null}
                    <Text style={styles.name}>{item.applicant?.fullName ?? '--'}</Text>
                    <Text style={styles.sub}>{item.applicant?.relationshipToRequester ?? ''} · {item.preferredAdmissionDate ? new Date(item.preferredAdmissionDate).toLocaleDateString('vi-VN') : ''}</Text>
                    {item.requestedAt ? (
                      <Text style={styles.requestedAt}>{t(`${NS}.requestedAtLabel`, 'Ngày gửi')}: {new Date(item.requestedAt).toLocaleDateString('vi-VN')}</Text>
                    ) : null}
                    {item.reasonForAdmission ? <Text style={styles.reason} numberOfLines={2}>{item.reasonForAdmission}</Text> : null}
                  </View>
                  <View style={styles.badgeCol}>
                    <StatusBadge status={item.status} size="sm" />
                    {item.eligibilityStatus && item.eligibilityStatus !== 'pending' ? <StatusBadge status={item.eligibilityStatus} size="sm" /> : null}
                  </View>
                </View>
              </Card.Content>
              {item.status === 'new_request' || item.status === 'consulting' ? (
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
                  label={t(`${NS}.fullNameLabel`)} mode="outlined" value={form.fullName}
                  onChangeText={v => setForm(f => ({ ...f, fullName: v }))} dense style={styles.input}
                  error={!!errors.fullName} maxLength={100}
                  returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => relationshipRef.current?.focus()}
                />
                {errors.fullName ? <Text style={styles.errText}>{errors.fullName}</Text> : null}
                <TextInput
                  ref={relationshipRef}
                  label={t(`${NS}.relationshipLabel`)} mode="outlined" value={form.relationshipToRequester}
                  onChangeText={v => setForm(f => ({ ...f, relationshipToRequester: v }))} dense style={styles.input}
                  placeholder={t(`${NS}.relationshipPlaceholder`)} error={!!errors.relationshipToRequester} maxLength={100}
                  returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => reasonRef.current?.focus()}
                />
                {errors.relationshipToRequester ? <Text style={styles.errText}>{errors.relationshipToRequester}</Text> : null}
                <CalendarPicker label={t(`${NS}.dobLabel`)} value={form.dateOfBirth} onChange={v => setForm(f => ({ ...f, dateOfBirth: v }))} color={COLOR} />
                {errors.dateOfBirth ? <Text style={styles.errText}>{errors.dateOfBirth}</Text> : null}
                <CalendarPicker label={t(`${NS}.preferredDateLabel`)} value={form.preferredAdmissionDate} onChange={v => setForm(f => ({ ...f, preferredAdmissionDate: v }))} minDate={todayStr()} color={COLOR} />
                {errors.preferredAdmissionDate ? <Text style={styles.errText}>{errors.preferredAdmissionDate}</Text> : null}
                <TextInput
                  ref={reasonRef}
                  label={t(`${NS}.reasonLabel`)} mode="outlined" value={form.reasonForAdmission}
                  onChangeText={v => setForm(f => ({ ...f, reasonForAdmission: v }))} dense multiline style={styles.input}
                  error={!!errors.reasonForAdmission} maxLength={MAX_TEXT_LENGTH}
                  returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => phoneRef.current?.focus()}
                />
                {errors.reasonForAdmission ? <Text style={styles.errText}>{errors.reasonForAdmission}</Text> : null}
                <TextInput
                  ref={phoneRef}
                  label={t(`${NS}.phoneLabel`)} mode="outlined" value={form.requestedByPhone}
                  onChangeText={v => setForm(f => ({ ...f, requestedByPhone: v }))} dense keyboardType="phone-pad" style={styles.input}
                  error={!!errors.requestedByPhone} maxLength={13}
                  returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => notesRef.current?.focus()}
                />
                {errors.requestedByPhone ? <Text style={styles.errText}>{errors.requestedByPhone}</Text> : null}
                <TextInput
                  ref={notesRef}
                  label={t(`${NS}.notesLabel`)} mode="outlined" value={form.notes}
                  onChangeText={v => setForm(f => ({ ...f, notes: v }))} dense multiline style={styles.input}
                  error={!!errors.notes} maxLength={MAX_TEXT_LENGTH}
                  returnKeyType="done" submitBehavior="blurAndSubmit"
                />
                {errors.notes ? <Text style={styles.errText}>{errors.notes}</Text> : null}
                <Text style={styles.charCount}>{form.notes.length}/{MAX_TEXT_LENGTH}</Text>
              </ScrollView>
            </Dialog.ScrollArea>
            <Dialog.Actions>
              <Button onPress={() => { setShowCreate(false); setErrors({}); }}>{t('common.cancel')}</Button>
              <Button mode="contained" buttonColor={COLOR} onPress={handleSubmit} loading={createMut.isPending} disabled={!form.fullName || !form.relationshipToRequester}>{t(`${NS}.send`)}</Button>
            </Dialog.Actions>
          </KeyboardAvoidingView>
        </Dialog>

        <Dialog visible={!!cancelId} onDismiss={() => setCancelId(null)} dismissable={false} dismissableBackButton>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <Dialog.Title>{t(`${NS}.cancelConfirmTitle`)}</Dialog.Title>
            <Dialog.Content>
              <TextInput
                label={t(`${NS}.cancelReasonLabel`)} mode="outlined" value={cancelReason} onChangeText={setCancelReason}
                dense multiline maxLength={MAX_TEXT_LENGTH}
                returnKeyType="done" submitBehavior="blurAndSubmit"
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setCancelId(null)}>{t(`${NS}.close`)}</Button>
              <Button mode="contained" buttonColor="#991B1B" onPress={() => cancelMut.mutate()} loading={cancelMut.isPending}>{t(`${NS}.cancelRequest`)}</Button>
            </Dialog.Actions>
          </KeyboardAvoidingView>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  list: { padding: 16, paddingBottom: 80 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  requestCode: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', marginBottom: 2 },
  name: { fontSize: 14, fontWeight: '600', color: '#111827' },
  sub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  reason: { fontSize: 12, color: '#374151', marginTop: 4 },
  requestedAt: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  badgeCol: { alignItems: 'flex-end', gap: 4 },
  dateFilterRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  dateFilterClear: { marginTop: 6 },
  fab: { position: 'absolute', bottom: 16, right: 16 },
  input: { marginBottom: 8 },
  errText: { color: '#DC2626', fontSize: 11, marginTop: -4, marginBottom: 8 },
  charCount: { color: '#9CA3AF', fontSize: 10, textAlign: 'right', marginTop: -4, marginBottom: 8 },
  headerBlock: { marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center', paddingVertical: 12, gap: 2 },
  statValue: { fontSize: 18, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 10, color: '#6B7280', textAlign: 'center' },
  searchInput: { backgroundColor: '#fff', marginBottom: 10 },
  filterRow: { marginBottom: 4 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  filterChipText: { fontSize: 12, fontWeight: '500', color: '#374151' },
  noMatch: { textAlign: 'center', color: '#9CA3AF', fontSize: 13, marginTop: 24 },
});
