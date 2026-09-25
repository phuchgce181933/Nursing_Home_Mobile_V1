import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Pressable,
  TextInput as RNTextInput,
} from 'react-native';
import { Text, TextInput, Button, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { BackHeader } from '../../components/layout/BackHeader';
import { CalendarPicker } from '../../components/shared/CalendarPicker';
import { ValueSelectField } from '../../components/shared/ValueSelectField';
import { useToast } from '../../utils/toast';
import { formatLocalDate } from '../../utils/date';
import {
  GENDER_OPTIONS,
  RELATIONSHIP_OPTIONS,
  ADMISSION_REASON_OPTIONS,
  BLOOD_TYPE_OPTIONS,
  CHRONIC_SUGGESTIONS,
  formatRelationship,
} from '../../utils/admissionOptions';

const COLOR = '#2E7D32';
const TOTAL_STEPS = 3;
const MAX_TEXT = 500;
// Khớp CHÍNH XÁC với web SubmitAdmissionPage.validateField.
const PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)\d{8}$/;
const CCCD_REGEX = /^\d{12}$/;
const PASSPORT_REGEX = /^[A-Z0-9]{8,12}$/i;
const NAME_REGEX = /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠƯưăâêôơưẠ-ỹ\s]+$/;
const ACTIVE_STATUSES = ['new_request', 'consulting', 'assessing', 'contracting'];

const todayStr = () => formatLocalDate(new Date());

const calcAge = (dobStr: string) => {
  const dob = new Date(dobStr);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
};

type Form = {
  fullName: string;
  dob: string;
  gender: string;
  idNumber: string;
  address: string;
  relationship: string;
  bloodType: string;
  allergies: string[];
  chronicConditions: string[];
  healthCondition: string;
  preferredDate: string;
  contactPhone: string;
  admissionReason: string;
  additionalNotes: string;
};

const EMPTY_FORM: Form = {
  fullName: '', dob: '', gender: '', idNumber: '', address: '', relationship: '',
  bloodType: '', allergies: [], chronicConditions: [], healthCondition: '',
  preferredDate: '', contactPhone: '', admissionReason: '', additionalNotes: '',
};

// ── Ô nhập dị ứng dạng thẻ (mirror web TagInput) ──────────────────────────────
const TagInput: React.FC<{ tags: string[]; onChange: (tags: string[]) => void }> = ({ tags, onChange }) => {
  const [text, setText] = useState('');
  const add = () => {
    const v = text.trim();
    if (v && !tags.includes(v) && tags.length < 20 && v.length <= 50) onChange([...tags, v]);
    setText('');
  };
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>Dị ứng</Text>
      {tags.length > 0 && (
        <View style={styles.chipRow}>
          {tags.map((tg) => (
            <Chip key={tg} onClose={() => onChange(tags.filter((x) => x !== tg))} style={styles.tagChip} compact>
              {tg}
            </Chip>
          ))}
        </View>
      )}
      <View style={styles.tagInputRow}>
        <TextInput
          mode="outlined" dense style={{ flex: 1 }}
          placeholder="Nhập tác nhân dị ứng (VD: Penicillin)"
          value={text} onChangeText={setText}
          returnKeyType="done" onSubmitEditing={add} maxLength={50}
        />
        <Button mode="outlined" textColor={COLOR} onPress={add} style={styles.addBtn}>Thêm</Button>
      </View>
    </View>
  );
};

// ── Chọn bệnh mãn tính: chip gợi ý + tự nhập (mirror web ChronicSelector) ──────
const ChronicSelector: React.FC<{ selected: string[]; onChange: (v: string[]) => void }> = ({ selected, onChange }) => {
  const [custom, setCustom] = useState('');
  const toggle = (name: string) =>
    onChange(selected.includes(name) ? selected.filter((x) => x !== name) : [...selected, name]);
  const addCustom = () => {
    const v = custom.trim();
    if (v && !selected.includes(v)) onChange([...selected, v]);
    setCustom('');
  };
  const customTags = selected.filter((s) => !CHRONIC_SUGGESTIONS.includes(s));
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>Bệnh lý mãn tính</Text>
      <View style={styles.chipRow}>
        {CHRONIC_SUGGESTIONS.map((name) => {
          const active = selected.includes(name);
          return (
            <Chip key={name} selected={active} showSelectedCheck onPress={() => toggle(name)}
              style={[styles.suggestChip, active && { backgroundColor: COLOR + '22' }]}
              textStyle={active ? { color: COLOR, fontWeight: '700' } : undefined} compact>
              {name}
            </Chip>
          );
        })}
      </View>
      {customTags.length > 0 && (
        <View style={styles.chipRow}>
          {customTags.map((s) => (
            <Chip key={s} onClose={() => onChange(selected.filter((x) => x !== s))} style={styles.tagChip} compact>{s}</Chip>
          ))}
        </View>
      )}
      <View style={styles.tagInputRow}>
        <TextInput mode="outlined" dense style={{ flex: 1 }} placeholder="Thêm bệnh lý khác (VD: Alzheimer)"
          value={custom} onChangeText={setCustom} returnKeyType="done" onSubmitEditing={addCustom} />
        <Button mode="outlined" textColor={COLOR} onPress={addCustom} style={styles.addBtn}>Thêm</Button>
      </View>
    </View>
  );
};

export const FamilyAdmissionCreateScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const toast = useToast();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState<'form' | 'success' | 'lockout'>('form');
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const scrollRef = useRef<ScrollView>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => (e[k as string] ? { ...e, [k as string]: '' } : e));
  };

  // Lịch sử để phát hiện trùng lặp (giống web: getAdmissionHistory limit 100).
  const historyQ = useQuery({
    queryKey: ['admissions'],
    queryFn: async () => (await api.get(FAMILY.ADMISSIONS, { params: { limit: 100 } })).data,
  });
  const admissions: any[] = historyQ.data?.data ?? historyQ.data ?? [];

  const checkDuplicate = (fullName: string, idNumber: string) => {
    if (!fullName || !idNumber) return null;
    const nameClean = fullName.trim().toLowerCase();
    const idClean = idNumber.trim();
    return admissions.find((a) =>
      a.applicant?.fullName?.trim().toLowerCase() === nameClean &&
      a.applicant?.citizenId?.trim() === idClean &&
      ACTIVE_STATUSES.includes(a.status)) ?? null;
  };

  // Validate một trường — thông điệp lỗi TIẾNG VIỆT, khớp quy tắc web + backend.
  const validateField = (name: string, raw: any): string => {
    const val = typeof raw === 'string' ? raw.trim() : raw ?? '';
    switch (name) {
      case 'fullName':
        if (!val) return 'Vui lòng nhập họ và tên';
        if (val.length < 2 || val.length > 50) return 'Họ và tên phải từ 2 đến 50 ký tự';
        if (!NAME_REGEX.test(val)) return 'Họ và tên chỉ được chứa chữ cái và khoảng trắng';
        return '';
      case 'dob': {
        if (!val) return 'Vui lòng chọn ngày sinh';
        const d = new Date(val);
        if (isNaN(d.getTime())) return 'Ngày sinh không hợp lệ';
        if (d >= new Date()) return 'Ngày sinh phải là ngày trong quá khứ';
        const age = calcAge(val);
        if (age < 50 || age > 110) return 'Người nhập viện phải từ 50 đến 110 tuổi';
        return '';
      }
      case 'gender':
        if (!val) return 'Vui lòng chọn giới tính';
        return '';
      case 'idNumber':
        if (!val) return 'Vui lòng nhập số CCCD/Hộ chiếu';
        if (!CCCD_REGEX.test(val) && !PASSPORT_REGEX.test(val))
          return 'Số định danh không hợp lệ (CCCD 12 số hoặc hộ chiếu 8–12 ký tự)';
        return '';
      case 'address':
        if (!val) return 'Vui lòng nhập địa chỉ';
        if (val.length < 5 || val.length > 150) return 'Địa chỉ phải từ 5 đến 150 ký tự';
        return '';
      case 'relationship':
        if (!val) return 'Vui lòng chọn quan hệ với cư dân';
        return '';
      case 'healthCondition':
        if (!val) return 'Vui lòng mô tả tình trạng sức khỏe';
        if (val.length < 10 || val.length > 500) return 'Mô tả sức khỏe phải từ 10 đến 500 ký tự';
        return '';
      case 'preferredDate':
        if (!val) return 'Vui lòng chọn ngày mong muốn nhập viện';
        if (val < todayStr()) return 'Ngày mong muốn phải là hôm nay hoặc trong tương lai';
        return '';
      case 'contactPhone':
        if (!val) return 'Vui lòng nhập số điện thoại liên hệ';
        if (!PHONE_REGEX.test(val)) return 'Số điện thoại không hợp lệ (VD: 0901234567)';
        return '';
      case 'additionalNotes':
        if (val && val.length > MAX_TEXT) return 'Ghi chú không được vượt quá 500 ký tự';
        return '';
      default:
        return '';
    }
  };

  const STEP_FIELDS: Record<number, string[]> = {
    1: ['fullName', 'dob', 'gender', 'idNumber', 'address', 'relationship'],
    2: ['healthCondition'],
    3: ['preferredDate', 'contactPhone', 'admissionReason', 'additionalNotes'],
  };

  const validateStep = (n: number): boolean => {
    const next: Record<string, string> = {};
    STEP_FIELDS[n].forEach((f) => {
      const err = validateField(f, (form as any)[f]);
      if (err) next[f] = err;
    });
    setErrors((prev) => ({ ...prev, ...next }));
    return Object.keys(next).length === 0;
  };

  const goStep = (n: number) => {
    setStep(n);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleNext = () => {
    if (validateStep(step)) goStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) goStep(step - 1);
    else navigation.goBack();
  };

  const buildPayload = () => ({
    applicant: {
      fullName: form.fullName || '',
      dateOfBirth: form.dob || undefined,
      gender: form.gender || 'unknown',
      citizenId: form.idNumber || undefined,
      bloodType: form.bloodType || 'unknown',
      personalAddress: form.address || undefined,
      relationshipToRequester: form.relationship || '',
      allergies: form.allergies,
      chronicConditions: form.chronicConditions,
      initialHealthCondition: form.healthCondition || undefined,
    },
    preferredAdmissionDate: form.preferredDate || undefined,
    reasonForAdmission: form.admissionReason || undefined,
    requestedByPhone: form.contactPhone || undefined,
    notes: form.additionalNotes || undefined,
  });

  const handleSubmit = async () => {
    if (submitting) return; // chặn gửi trùng
    // Validate toàn bộ, nhảy về bước lỗi đầu tiên (giống web).
    for (let n = 1; n <= TOTAL_STEPS; n++) {
      if (!validateStep(n)) { goStep(n); return; }
    }
    const dup = checkDuplicate(form.fullName, form.idNumber);
    if (dup) { setActiveRequest(dup); setView('lockout'); return; }

    setSubmitting(true);
    try {
      await api.post(FAMILY.ADMISSIONS, buildPayload());
      qc.invalidateQueries({ queryKey: ['admissions'] });
      qc.invalidateQueries({ queryKey: ['admissionsStats'] });
      setView('success');
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = String(err?.response?.data?.message || '').toLowerCase();
      if (status === 409 || msg.includes('already have a pending') || msg.includes('đang chờ') || msg.includes('trùng')) {
        const dupNow = checkDuplicate(form.fullName, form.idNumber);
        setActiveRequest(dupNow ?? { requestedAt: new Date().toISOString(), status: 'new_request', applicant: { fullName: form.fullName, citizenId: form.idNumber } });
        setView('lockout');
      } else {
        toast(err?.response?.data?.message || 'Không thể gửi yêu cầu. Vui lòng thử lại.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Màn hình trùng lặp ──────────────────────────────────────────────────────
  if (view === 'lockout') {
    return (
      <View style={styles.flex}>
        <BackHeader title="Yêu cầu nhập viện" color={COLOR} onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={styles.centerBody}>
          <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
            <MaterialCommunityIcons name="alert" size={40} color="#D97706" />
          </View>
          <Text style={styles.resultTitle}>Phát hiện yêu cầu trùng lặp</Text>
          <Text style={styles.resultDesc}>
            Bạn đã có một yêu cầu nhập viện đang chờ xử lý cho cư dân này. Đội ngũ của chúng tôi đang xem xét hồ sơ hiện có. Để tránh nhầm lẫn, tạm thời không thể gửi thêm yêu cầu cho người này.
          </Text>
          <View style={styles.resultCard}>
            <Text style={styles.resultCardLabel}>CƯ DÂN</Text>
            <Text style={styles.resultCardValue}>{activeRequest?.applicant?.fullName ?? form.fullName}</Text>
            {activeRequest?.requestCode ? (
              <>
                <Text style={[styles.resultCardLabel, { marginTop: 8 }]}>MÃ YÊU CẦU</Text>
                <Text style={styles.resultCardValue}>{activeRequest.requestCode}</Text>
              </>
            ) : null}
          </View>
          <Button mode="contained" buttonColor={COLOR} style={styles.resultBtn}
            onPress={() => navigation.goBack()}>Xem lịch sử yêu cầu</Button>
          <Button mode="outlined" textColor={COLOR} style={styles.resultBtn}
            onPress={() => { set('idNumber', ''); setActiveRequest(null); setView('form'); goStep(1); }}>
            Quay lại chỉnh sửa
          </Button>
        </ScrollView>
      </View>
    );
  }

  // ── Màn hình thành công ─────────────────────────────────────────────────────
  if (view === 'success') {
    return (
      <View style={styles.flex}>
        <BackHeader title="Yêu cầu nhập viện" color={COLOR} onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={styles.centerBody}>
          <View style={[styles.iconCircle, { backgroundColor: '#DCFCE7' }]}>
            <MaterialCommunityIcons name="check" size={44} color={COLOR} />
          </View>
          <Text style={styles.resultTitle}>Gửi yêu cầu tiếp nhận thành công!</Text>
          <Text style={styles.resultDesc}>
            Cảm ơn bạn đã tin tưởng An Nhiên Care Home. Đội ngũ tư vấn sẽ xem xét hồ sơ và liên hệ với bạn trong vòng 24 giờ tới.
          </Text>
          <View style={styles.resultCard}>
            <Text style={styles.resultCardLabel}>CƯ DÂN</Text>
            <Text style={styles.resultCardValue}>{form.fullName}</Text>
            {form.preferredDate ? (
              <>
                <Text style={[styles.resultCardLabel, { marginTop: 8 }]}>NGÀY MONG MUỐN</Text>
                <Text style={styles.resultCardValue}>{new Date(form.preferredDate).toLocaleDateString('vi-VN')}</Text>
              </>
            ) : null}
          </View>
          <Button mode="contained" buttonColor={COLOR} style={styles.resultBtn}
            onPress={() => navigation.goBack()}>Xem lịch sử yêu cầu</Button>
          <Button mode="outlined" textColor={COLOR} style={styles.resultBtn}
            onPress={() => navigation.navigate('DashboardMain')}>Quay lại trang chủ</Button>
        </ScrollView>
      </View>
    );
  }

  // ── Biểu mẫu nhiều bước ─────────────────────────────────────────────────────
  const STEP_TITLES = ['Thông tin cơ bản', 'Thông tin y tế', 'Chi tiết tiếp nhận'];

  return (
    <View style={styles.flex}>
      <BackHeader title="Yêu cầu nhập viện" color={COLOR} onBack={handleBack} />
      <View style={styles.progressWrap}>
        <View style={styles.progressHeaderRow}>
          <Text style={styles.progressText}>Bước {step}/{TOTAL_STEPS}</Text>
          <Text style={styles.progressTitle}>{STEP_TITLES[step - 1]}</Text>
        </View>
        <View style={styles.progressBar}>
          {[1, 2, 3].map((n) => (
            <View key={n} style={[styles.progressSeg, { backgroundColor: n <= step ? COLOR : '#E5E7EB' }]} />
          ))}
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {step === 1 && (
            <>
              <Text style={styles.sectionHeading}>Thông tin cơ bản</Text>
              <TextInput mode="outlined" label="Họ và tên *" placeholder="Nhập họ tên cư dân"
                value={form.fullName} onChangeText={(v) => set('fullName', v)} error={!!errors.fullName}
                style={styles.input} maxLength={60} />
              {errors.fullName ? <Text style={styles.err}>{errors.fullName}</Text> : null}

              <CalendarPicker label="Ngày sinh *" value={form.dob} onChange={(v) => set('dob', v)} color={COLOR} />
              {errors.dob ? <Text style={styles.err}>{errors.dob}</Text> : null}

              <ValueSelectField label="Giới tính" value={form.gender} onChange={(v) => set('gender', v)}
                options={GENDER_OPTIONS} color={COLOR} placeholder="Chọn giới tính" required error={!!errors.gender} />
              {errors.gender ? <Text style={styles.err}>{errors.gender}</Text> : null}

              <TextInput mode="outlined" label="Số CCCD / Hộ chiếu *" placeholder="Nhập số định danh"
                value={form.idNumber} onChangeText={(v) => set('idNumber', v)} error={!!errors.idNumber}
                style={styles.input} maxLength={12} autoCapitalize="characters" />
              {errors.idNumber ? <Text style={styles.err}>{errors.idNumber}</Text> : null}

              <TextInput mode="outlined" label="Địa chỉ hiện tại *"
                placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                value={form.address} onChangeText={(v) => set('address', v)} error={!!errors.address}
                style={styles.input} multiline maxLength={150} />
              {errors.address ? <Text style={styles.err}>{errors.address}</Text> : null}

              <ValueSelectField label="Quan hệ với cư dân" value={form.relationship} onChange={(v) => set('relationship', v)}
                options={RELATIONSHIP_OPTIONS} color={COLOR} placeholder="Chọn quan hệ" required error={!!errors.relationship} />
              {errors.relationship ? <Text style={styles.err}>{errors.relationship}</Text> : null}
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.sectionHeading}>Thông tin y tế</Text>
              <ValueSelectField label="Nhóm máu" value={form.bloodType} onChange={(v) => set('bloodType', v)}
                options={BLOOD_TYPE_OPTIONS} color={COLOR} placeholder="Chọn nhóm máu" />

              <TagInput tags={form.allergies} onChange={(v) => set('allergies', v)} />

              <ChronicSelector selected={form.chronicConditions} onChange={(v) => set('chronicConditions', v)} />

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Tóm tắt sức khỏe hiện tại *</Text>
                <TextInput mode="outlined"
                  placeholder="Mô tả trạng thái sức khỏe, khả năng vận động, hỗ trợ ăn uống..."
                  value={form.healthCondition} onChangeText={(v) => set('healthCondition', v)}
                  error={!!errors.healthCondition} style={styles.input} multiline numberOfLines={4} maxLength={MAX_TEXT} />
                <Text style={styles.charCount}>{form.healthCondition.length}/{MAX_TEXT}</Text>
                {errors.healthCondition ? <Text style={styles.err}>{errors.healthCondition}</Text> : null}
              </View>
            </>
          )}

          {step === 3 && (
            <>
              <Text style={styles.sectionHeading}>Chi tiết tiếp nhận</Text>
              <CalendarPicker label="Ngày mong muốn nhập viện *" value={form.preferredDate}
                onChange={(v) => set('preferredDate', v)} minDate={todayStr()} color={COLOR} />
              {errors.preferredDate ? <Text style={styles.err}>{errors.preferredDate}</Text> : null}

              <TextInput mode="outlined" label="Số điện thoại liên hệ *" placeholder="Nhập số điện thoại liên hệ"
                value={form.contactPhone} onChangeText={(v) => set('contactPhone', v)} error={!!errors.contactPhone}
                style={styles.input} keyboardType="phone-pad" maxLength={13} />
              {errors.contactPhone ? <Text style={styles.err}>{errors.contactPhone}</Text> : null}

              <ValueSelectField label="Lý do nhập viện" value={form.admissionReason} onChange={(v) => set('admissionReason', v)}
                options={ADMISSION_REASON_OPTIONS} color={COLOR} placeholder="Chọn lý do chính" required error={!!errors.admissionReason} />
              {errors.admissionReason ? <Text style={styles.err}>{errors.admissionReason}</Text> : null}

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Ghi chú thêm</Text>
                <TextInput mode="outlined"
                  placeholder="Yêu cầu đặc biệt về phòng, chế độ ăn uống, hỗ trợ sinh hoạt..."
                  value={form.additionalNotes} onChangeText={(v) => set('additionalNotes', v)}
                  error={!!errors.additionalNotes} style={styles.input} multiline numberOfLines={4} maxLength={MAX_TEXT} />
                <Text style={styles.charCount}>{form.additionalNotes.length}/{MAX_TEXT}</Text>
                {errors.additionalNotes ? <Text style={styles.err}>{errors.additionalNotes}</Text> : null}
              </View>

              <View style={styles.infoAlert}>
                <MaterialCommunityIcons name="information" size={18} color={COLOR} />
                <Text style={styles.infoAlertText}>
                  Sau khi gửi, đội ngũ tư vấn của An Nhiên Care Home sẽ liên hệ với bạn trong vòng 24 giờ để xác nhận thông tin và hướng dẫn các bước tiếp theo.
                </Text>
              </View>
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button mode="outlined" textColor={COLOR} style={styles.footerBtn} onPress={handleBack} disabled={submitting}>
            {step > 1 ? 'Quay lại' : 'Hủy'}
          </Button>
          {step < TOTAL_STEPS ? (
            <Button mode="contained" buttonColor={COLOR} style={styles.footerBtn} onPress={handleNext}>Tiếp tục</Button>
          ) : (
            <Button mode="contained" buttonColor={COLOR} style={styles.footerBtn} onPress={handleSubmit}
              loading={submitting} disabled={submitting}>Gửi yêu cầu</Button>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  progressWrap: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  progressHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  progressText: { fontSize: 12, fontWeight: '700', color: COLOR },
  progressTitle: { fontSize: 13, fontWeight: '600', color: '#374151' },
  progressBar: { flexDirection: 'row', gap: 6 },
  progressSeg: { flex: 1, height: 4, borderRadius: 2 },
  body: { padding: 16, paddingBottom: 24 },
  sectionHeading: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  input: { backgroundColor: '#fff', marginBottom: 4 },
  fieldBlock: { marginBottom: 12 },
  label: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginBottom: 6 },
  err: { color: '#DC2626', fontSize: 12, marginBottom: 8, marginTop: 2 },
  charCount: { color: '#9CA3AF', fontSize: 10, textAlign: 'right', marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  suggestChip: { backgroundColor: '#fff' },
  tagChip: { backgroundColor: '#EEF2FF' },
  tagInputRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  addBtn: { marginTop: 2, borderColor: COLOR },
  infoAlert: { flexDirection: 'row', gap: 10, backgroundColor: '#ECFDF5', borderRadius: 12, padding: 12, marginTop: 4, borderWidth: 1, borderColor: '#A7F3D0' },
  infoAlertText: { flex: 1, fontSize: 12, color: '#166534', lineHeight: 18 },
  footer: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  footerBtn: { flex: 1, borderRadius: 12, borderColor: COLOR },
  centerBody: { padding: 24, alignItems: 'center', paddingTop: 48 },
  iconCircle: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  resultTitle: { fontSize: 20, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 10 },
  resultDesc: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21, marginBottom: 20 },
  resultCard: { width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  resultCardLabel: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5 },
  resultCardValue: { fontSize: 15, fontWeight: '600', color: '#111827', marginTop: 2 },
  resultBtn: { width: '100%', borderRadius: 12, marginBottom: 12, borderColor: COLOR },
});

// Dùng lại để hiển thị nhãn quan hệ ở nơi khác nếu cần.
export { formatRelationship };
