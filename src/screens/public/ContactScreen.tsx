import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Linking } from 'react-native';
import { Text, Card, TextInput, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { CONSULTATION } from '../../api/endpoints';
import { BackHeader } from '../../components/layout/BackHeader';
import { SelectField } from '../../components/shared/SelectField';
import { useToast } from '../../utils/toast';

const COLOR = '#000666';
const NS = 'publicPages.contact';
const PHONE_REGEX = /^0\d{9}$/;

const SERVICE_OPTIONS = [
  { value: 'consulting', label: 'Tư vấn dịch vụ' },
  { value: 'cost', label: 'Tư vấn chi phí' },
  { value: 'short_term', label: 'Chăm sóc ngắn hạn' },
  { value: 'long_term', label: 'Chăm sóc dài hạn' },
  { value: 'rehab', label: 'Phục hồi chức năng' },
  { value: 'tour', label: 'Tham quan cơ sở' },
  { value: 'admission', label: 'Đăng ký nhập viện' },
];

const INFO = [
  { icon: 'map-marker-outline', label: 'Địa chỉ', value: '68 Đường Nguyễn Văn Cừ, Phường An Khánh, Quận Ninh Kiều, TP. Cần Thơ' },
  { icon: 'phone-outline', label: 'Hotline', value: '1800 1234 (miễn phí)' },
  { icon: 'email-outline', label: 'Email', value: 'annhiencarehome@gmail.com' },
  { icon: 'clock-outline', label: 'Giờ hoạt động', value: '8h00 - 20h00 (bao gồm ngày Lễ, Tết)' },
];

export const ContactScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', serviceInterest: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.fullName.trim()) next.fullName = 'Họ và tên là bắt buộc';
    if (!form.email.trim()) next.email = 'Địa chỉ email là bắt buộc';
    if (!PHONE_REGEX.test(form.phone.trim())) next.phone = 'Số điện thoại không hợp lệ (VD: 0912345678)';
    if (!form.serviceInterest.trim()) next.serviceInterest = 'Vui lòng chọn nhu cầu tư vấn';
    if (form.message.length > 200) next.message = 'Không được vượt quá 200 ký tự';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submitMut = useMutation({
    mutationFn: async () => {
      const body = { fullName: form.fullName, phone: form.phone, email: form.email || undefined, serviceInterest: form.serviceInterest, message: form.message || undefined };
      return (await api.post(CONSULTATION.SUBMIT, body)).data;
    },
    onSuccess: () => {
      toast('Chúng tôi đã tiếp nhận yêu cầu tư vấn của bạn.', 'success');
      setForm({ fullName: '', email: '', phone: '', serviceInterest: '', message: '' });
    },
    onError: (err: any) => toast(err?.response?.data?.message || 'Không thể gửi yêu cầu. Vui lòng thử lại.', 'error'),
  });

  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.title`)} color={COLOR} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.heroTitle}>Liên Hệ Với Chúng Tôi</Text>

        <Card style={styles.infoCard} mode="outlined">
          <Card.Content>
            {INFO.map((item, i) => (
              <View key={i} style={[styles.infoRow, i > 0 && styles.infoRowBorder]}>
                <MaterialCommunityIcons name={item.icon as any} size={20} color={COLOR} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
              </View>
            ))}
          </Card.Content>
        </Card>

        <Button mode="outlined" textColor={COLOR} icon="phone" style={styles.callBtn} onPress={() => Linking.openURL('tel:18001234')}>
          Gọi hotline ngay
        </Button>

        <Text style={styles.sectionTitle}>Gửi yêu cầu tư vấn</Text>
        <TextInput label="Họ và tên" mode="outlined" value={form.fullName} onChangeText={v => setForm(f => ({ ...f, fullName: v }))} dense style={styles.input} error={!!errors.fullName} maxLength={100} />
        {errors.fullName ? <Text style={styles.errText}>{errors.fullName}</Text> : null}
        <TextInput label="Email" mode="outlined" value={form.email} onChangeText={v => setForm(f => ({ ...f, email: v }))} dense keyboardType="email-address" autoCapitalize="none" style={styles.input} error={!!errors.email} maxLength={100} />
        {errors.email ? <Text style={styles.errText}>{errors.email}</Text> : null}
        <TextInput label="Số điện thoại" mode="outlined" value={form.phone} onChangeText={v => setForm(f => ({ ...f, phone: v }))} dense keyboardType="phone-pad" style={styles.input} error={!!errors.phone} maxLength={10} />
        {errors.phone ? <Text style={styles.errText}>{errors.phone}</Text> : null}

        <SelectField
          label="Nhu cầu tư vấn"
          value={form.serviceInterest}
          onChange={v => setForm(f => ({ ...f, serviceInterest: v }))}
          options={SERVICE_OPTIONS}
          color={COLOR}
          placeholder="-- Chọn nhu cầu --"
          error={!!errors.serviceInterest}
        />
        {errors.serviceInterest ? <Text style={styles.errText}>{errors.serviceInterest}</Text> : null}

        <TextInput label="Lời nhắn" mode="outlined" value={form.message} onChangeText={v => setForm(f => ({ ...f, message: v }))} dense multiline style={styles.input} error={!!errors.message} maxLength={200} placeholder="Tôi muốn tìm hiểu thêm về..." />
        <Text style={styles.hintText}>Tối đa 200 ký tự. ({form.message.length}/200)</Text>
        {errors.message ? <Text style={styles.errText}>{errors.message}</Text> : null}

        <Button mode="contained" buttonColor={COLOR} style={styles.submitBtn} contentStyle={{ height: 48 }}
          loading={submitMut.isPending} onPress={() => { if (validate()) submitMut.mutate(); }}>
          Gửi yêu cầu
        </Button>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 16, paddingBottom: 32 },
  heroTitle: { fontSize: 20, fontWeight: '700', color: COLOR, marginBottom: 16 },
  infoCard: { borderRadius: 12, marginBottom: 12, backgroundColor: '#fff' },
  infoRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 10 },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  infoLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 2 },
  infoValue: { fontSize: 13, color: '#111827', lineHeight: 18 },
  callBtn: { borderRadius: 8, borderColor: COLOR, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  input: { marginBottom: 8 },
  hintText: { fontSize: 11, color: '#9CA3AF', marginTop: -4, marginBottom: 8, textAlign: 'right' },
  errText: { color: '#DC2626', fontSize: 11, marginTop: -4, marginBottom: 8 },
  submitBtn: { borderRadius: 8, marginTop: 8 },
});
