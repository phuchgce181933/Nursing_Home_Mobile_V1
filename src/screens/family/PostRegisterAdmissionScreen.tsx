import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, TextInput, Chip } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { CalendarPicker } from '../../components/shared/CalendarPicker';
import { SelectField } from '../../components/shared/SelectField';
import { useToast } from '../../utils/toast';

const COLOR = '#2E7D32';
const NS = 'family.admissions';
const PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)\d{8}$/;
const MAX_TEXT_LENGTH = 500;

const RELATIONSHIP_OPTIONS = [
  { value: 'child', label: 'Con cái' },
  { value: 'spouse', label: 'Vợ/Chồng' },
  { value: 'sibling', label: 'Anh/Chị/Em' },
  { value: 'grandchild', label: 'Cháu' },
  { value: 'legal_guardian', label: 'Người giám hộ hợp pháp' },
];

const REASON_OPTIONS = [
  { value: 'long_term_care', label: 'Chăm sóc dài hạn' },
  { value: 'rehabilitation', label: 'Phục hồi chức năng & Trị liệu' },
  { value: 'post_surgery', label: 'Phục hồi sau phẫu thuật' },
  { value: 'hospice', label: 'Chăm sóc giảm nhẹ cuối đời' },
];

const todayStr = () => new Date().toISOString().split('T')[0];

const calcAge = (dobStr: string) => {
  const dob = new Date(dobStr);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
};

export const PostRegisterAdmissionScreen: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { t } = useTranslation();
  const [form, setForm] = useState({
    fullName: '', relationshipToRequester: '', dateOfBirth: '', gender: 'unknown',
    preferredAdmissionDate: '', reasonForAdmission: '', notes: '', requestedByPhone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      const body = {
        applicant: {
          fullName: form.fullName,
          relationshipToRequester: form.relationshipToRequester,
          dateOfBirth: form.dateOfBirth || undefined,
          gender: form.gender,
        },
        preferredAdmissionDate: form.preferredAdmissionDate || undefined,
        reasonForAdmission: form.reasonForAdmission,
        notes: form.notes,
        requestedByPhone: form.requestedByPhone,
      };
      return (await api.post(FAMILY.ADMISSIONS, body)).data;
    },
    onSuccess: () => { toast(t(`${NS}.toastSent`), 'success'); onDone(); },
    onError: (err: any) => toast(err?.response?.data?.message || t(`${NS}.toastSendError`), 'error'),
  });

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.topTitle}>{t(`${NS}.postRegisterTitle`)}</Text>
        <Text style={styles.topSub}>{t(`${NS}.postRegisterSubtitle`)}</Text>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <TextInput label={t(`${NS}.fullNameLabel`)} mode="outlined" value={form.fullName} onChangeText={v => setForm(f => ({ ...f, fullName: v }))} dense style={styles.input} error={!!errors.fullName} maxLength={100} />
        {errors.fullName ? <Text style={styles.errText}>{errors.fullName}</Text> : null}
        <SelectField
          label={t(`${NS}.relationshipLabel`)}
          value={form.relationshipToRequester}
          onChange={v => setForm(f => ({ ...f, relationshipToRequester: v }))}
          options={RELATIONSHIP_OPTIONS}
          color={COLOR}
          error={!!errors.relationshipToRequester}
        />
        {errors.relationshipToRequester ? <Text style={styles.errText}>{errors.relationshipToRequester}</Text> : null}

        <Text style={styles.label}>{t(`${NS}.genderLabel`)}</Text>
        <View style={styles.chipRow}>
          {(['male', 'female', 'unknown'] as const).map((g) => (
            <Chip
              key={g}
              selected={form.gender === g}
              onPress={() => setForm(f => ({ ...f, gender: g }))}
              style={form.gender === g ? { backgroundColor: COLOR } : undefined}
              textStyle={form.gender === g ? { color: '#fff' } : undefined}
            >
              {g === 'male' ? t(`${NS}.male`) : g === 'female' ? t(`${NS}.female`) : t(`${NS}.otherGender`)}
            </Chip>
          ))}
        </View>

        <CalendarPicker label={t(`${NS}.dobLabel`)} value={form.dateOfBirth} onChange={v => setForm(f => ({ ...f, dateOfBirth: v }))} color={COLOR} />
        {errors.dateOfBirth ? <Text style={styles.errText}>{errors.dateOfBirth}</Text> : null}
        <CalendarPicker label={t(`${NS}.preferredDateLabel`)} value={form.preferredAdmissionDate} onChange={v => setForm(f => ({ ...f, preferredAdmissionDate: v }))} minDate={todayStr()} color={COLOR} />
        {errors.preferredAdmissionDate ? <Text style={styles.errText}>{errors.preferredAdmissionDate}</Text> : null}

        <SelectField
          label={t(`${NS}.reasonLabel`)}
          value={form.reasonForAdmission}
          onChange={v => setForm(f => ({ ...f, reasonForAdmission: v }))}
          options={REASON_OPTIONS}
          color={COLOR}
          error={!!errors.reasonForAdmission}
        />
        {errors.reasonForAdmission ? <Text style={styles.errText}>{errors.reasonForAdmission}</Text> : null}
        <TextInput label={t(`${NS}.phoneLabel`)} mode="outlined" value={form.requestedByPhone} onChangeText={v => setForm(f => ({ ...f, requestedByPhone: v }))} dense keyboardType="phone-pad" style={styles.input} error={!!errors.requestedByPhone} maxLength={13} />
        {errors.requestedByPhone ? <Text style={styles.errText}>{errors.requestedByPhone}</Text> : null}
        <TextInput label={t(`${NS}.notesLabel`)} mode="outlined" value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} dense multiline style={styles.input} error={!!errors.notes} maxLength={MAX_TEXT_LENGTH} />
        {errors.notes ? <Text style={styles.errText}>{errors.notes}</Text> : null}
        <Text style={styles.charCount}>{form.notes.length}/{MAX_TEXT_LENGTH}</Text>

        <Button
          mode="contained"
          buttonColor={COLOR}
          onPress={() => { if (validate()) createMut.mutate(); }}
          loading={createMut.isPending}
          disabled={!form.fullName || !form.relationshipToRequester}
          style={styles.submitBtn}
          contentStyle={{ height: 48 }}
        >
          {t(`${NS}.send`)}
        </Button>

        <Button mode="text" textColor="#6B7280" onPress={onDone} style={styles.skipBtn}>
          {t(`${NS}.skipToHome`)}
        </Button>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16 },
  topTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  topSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 },
  body: { padding: 16, paddingBottom: 32 },
  input: { marginBottom: 8 },
  label: { fontSize: 13, color: '#6B7280', marginBottom: 6, marginTop: 4 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  submitBtn: { borderRadius: 8, marginTop: 12 },
  skipBtn: { marginTop: 8 },
  errText: { color: '#DC2626', fontSize: 11, marginTop: -4, marginBottom: 8 },
  charCount: { color: '#9CA3AF', fontSize: 10, textAlign: 'right', marginTop: -4, marginBottom: 8 },
});
