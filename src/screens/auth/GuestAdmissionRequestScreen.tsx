import React, { useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, TextInput as RNTextInput } from 'react-native';
import { Text, Button, TextInput, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { PUBLIC_ADMISSIONS } from '../../api/endpoints';
import { CalendarPicker } from '../../components/shared/CalendarPicker';
import { SelectField } from '../../components/shared/SelectField';
import { BackHeader } from '../../components/layout/BackHeader';
import { useToast } from '../../utils/toast';

const COLOR = '#000666';
const NS = 'guestAdmission';
const PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)\d{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

export const GuestAdmissionRequestScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const toast = useToast();
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    requestedByName: '', requestedByEmail: '', requestedByPhone: '',
    fullName: '', relationshipToRequester: '', dateOfBirth: '', gender: 'unknown',
    preferredAdmissionDate: '', reasonForAdmission: '', notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const emailRef = useRef<RNTextInput>(null);
  const phoneRef = useRef<RNTextInput>(null);
  const fullNameRef = useRef<RNTextInput>(null);
  const notesRef = useRef<RNTextInput>(null);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.requestedByName.trim()) next.requestedByName = t(`${NS}.errContactNameRequired`);
    if (!form.requestedByEmail.trim() && !form.requestedByPhone.trim()) {
      next.requestedByEmail = t(`${NS}.errContactRequired`);
      next.requestedByPhone = t(`${NS}.errContactRequired`);
    }
    if (form.requestedByEmail && !EMAIL_REGEX.test(form.requestedByEmail.trim())) {
      next.requestedByEmail = t(`${NS}.errEmailInvalid`);
    }
    if (form.requestedByPhone && !PHONE_REGEX.test(form.requestedByPhone.trim())) {
      next.requestedByPhone = t(`${NS}.errPhoneInvalid`);
    }
    if (!form.fullName.trim()) next.fullName = t(`${NS}.errFullNameRequired`);
    if (!form.relationshipToRequester.trim()) next.relationshipToRequester = t(`${NS}.errRelationshipRequired`);
    if (form.dateOfBirth) {
      const age = calcAge(form.dateOfBirth);
      if (age < 50 || age > 110) next.dateOfBirth = t(`${NS}.errDobRange`);
    }
    if (form.preferredAdmissionDate && form.preferredAdmissionDate < todayStr()) {
      next.preferredAdmissionDate = t(`${NS}.errDateFuture`);
    }
    if (form.reasonForAdmission.length > MAX_TEXT_LENGTH) next.reasonForAdmission = t(`${NS}.errTooLong`);
    if (form.notes.length > MAX_TEXT_LENGTH) next.notes = t(`${NS}.errTooLong`);
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submitMut = useMutation({
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
        requestedByName: form.requestedByName,
        requestedByEmail: form.requestedByEmail || undefined,
        requestedByPhone: form.requestedByPhone || undefined,
      };
      return (await api.post(PUBLIC_ADMISSIONS.SUBMIT, body)).data;
    },
    onSuccess: () => setSubmitted(true),
    onError: (err: any) => toast(err?.response?.data?.message || t(`${NS}.toastSendError`), 'error'),
  });

  if (submitted) {
    return (
      <View style={styles.flex}>
        <BackHeader title={t(`${NS}.title`)} color={COLOR} onBack={() => navigation.goBack()} />
        <View style={styles.successBody}>
          <MaterialCommunityIcons name="check-circle-outline" size={72} color={COLOR} />
          <Text style={styles.successTitle}>{t(`${NS}.successTitle`)}</Text>
          <Text style={styles.successText}>{t(`${NS}.successText`)}</Text>
          <Button mode="contained" buttonColor={COLOR} style={styles.successBtn} contentStyle={{ height: 48 }} onPress={() => navigation.navigate('Login')}>
            {t(`${NS}.goToLogin`)}
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.title`)} color={COLOR} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.introText}>{t(`${NS}.introText`)}</Text>

        <Text style={styles.sectionLabel}>{t(`${NS}.contactSection`)}</Text>
        <TextInput
          label={t(`${NS}.contactNameLabel`)} mode="outlined" value={form.requestedByName}
          onChangeText={v => setForm(f => ({ ...f, requestedByName: v }))} dense style={styles.input} error={!!errors.requestedByName} maxLength={100}
          returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => emailRef.current?.focus()}
        />
        {errors.requestedByName ? <Text style={styles.errText}>{errors.requestedByName}</Text> : null}
        <TextInput
          ref={emailRef}
          label={t(`${NS}.contactEmailLabel`)} mode="outlined" value={form.requestedByEmail}
          onChangeText={v => setForm(f => ({ ...f, requestedByEmail: v }))} dense keyboardType="email-address" autoCapitalize="none" style={styles.input} error={!!errors.requestedByEmail} maxLength={100}
          returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => phoneRef.current?.focus()}
        />
        {errors.requestedByEmail ? <Text style={styles.errText}>{errors.requestedByEmail}</Text> : null}
        <TextInput
          ref={phoneRef}
          label={t(`${NS}.contactPhoneLabel`)} mode="outlined" value={form.requestedByPhone}
          onChangeText={v => setForm(f => ({ ...f, requestedByPhone: v }))} dense keyboardType="phone-pad" style={styles.input} error={!!errors.requestedByPhone} maxLength={13}
          returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => fullNameRef.current?.focus()}
        />
        {errors.requestedByPhone ? <Text style={styles.errText}>{errors.requestedByPhone}</Text> : null}
        <Text style={styles.hintText}>{t(`${NS}.contactHint`)}</Text>

        <Text style={styles.sectionLabel}>{t(`${NS}.applicantSection`)}</Text>
        <TextInput
          ref={fullNameRef}
          label={t(`${NS}.fullNameLabel`)} mode="outlined" value={form.fullName}
          onChangeText={v => setForm(f => ({ ...f, fullName: v }))} dense style={styles.input} error={!!errors.fullName} maxLength={100}
          returnKeyType="done" submitBehavior="blurAndSubmit"
        />
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
        <TextInput
          ref={notesRef}
          label={t(`${NS}.notesLabel`)} mode="outlined" value={form.notes}
          onChangeText={v => setForm(f => ({ ...f, notes: v }))} dense multiline style={styles.input} error={!!errors.notes} maxLength={MAX_TEXT_LENGTH}
          returnKeyType="done" submitBehavior="blurAndSubmit"
        />
        {errors.notes ? <Text style={styles.errText}>{errors.notes}</Text> : null}
        <Text style={styles.charCount}>{form.notes.length}/{MAX_TEXT_LENGTH}</Text>

        <Button
          mode="contained"
          buttonColor={COLOR}
          onPress={() => { if (validate()) submitMut.mutate(); }}
          loading={submitMut.isPending}
          style={styles.submitBtn}
          contentStyle={{ height: 48 }}
        >
          {t(`${NS}.send`)}
        </Button>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 16, paddingBottom: 32 },
  introText: { fontSize: 13, color: '#374151', marginBottom: 16, lineHeight: 19 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: COLOR, marginTop: 8, marginBottom: 8 },
  input: { marginBottom: 8 },
  hintText: { fontSize: 11, color: '#9CA3AF', marginTop: -4, marginBottom: 8 },
  label: { fontSize: 13, color: '#6B7280', marginBottom: 6, marginTop: 4 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  submitBtn: { borderRadius: 8, marginTop: 12 },
  errText: { color: '#DC2626', fontSize: 11, marginTop: -4, marginBottom: 8 },
  charCount: { color: '#9CA3AF', fontSize: 10, textAlign: 'right', marginTop: -4, marginBottom: 8 },
  successBody: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 16, textAlign: 'center' },
  successText: { fontSize: 13, color: '#6B7280', marginTop: 8, textAlign: 'center', lineHeight: 20 },
  successBtn: { borderRadius: 8, marginTop: 24, width: '100%' },
});
