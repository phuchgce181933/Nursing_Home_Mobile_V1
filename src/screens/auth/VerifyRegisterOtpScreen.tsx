import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { Text, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/axiosInstance';
import { AUTH } from '../../api/endpoints';
import { useAuth } from '../../auth/useAuth';
import { useToast } from '../../utils/toast';

const RESEND_COOLDOWN_SECONDS = 30;

export const VerifyRegisterOtpScreen: React.FC<{ navigation?: any; route: any }> = ({ route }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { login } = useAuth();
  const toast = useToast();

  const [otpId, setOtpId] = useState<string>(route.params?.otpId);
  const [maskedRecipient, setMaskedRecipient] = useState<string>(route.params?.maskedRecipient ?? '');
  const formSnapshot = route.params?.formSnapshot ?? {};

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async () => {
    if (!code.trim()) {
      setError(t('auth.errorOtpRequired'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.post(AUTH.REGISTER_VERIFY, { otpId, code: code.trim() });
      const { token, user } = res.data;
      await AsyncStorage.setItem('justRegistered', 'true');
      await login(token, user);
    } catch (err: any) {
      const status = err.response?.status;
      const errorCode = err.response?.data?.errorCode;
      if (errorCode === 'AUTH_EMAIL_IN_USE') setError(t('auth.errorEmailInUse'));
      else if (errorCode === 'AUTH_PHONE_IN_USE') setError(t('auth.errorPhoneInUseRegister'));
      else if (status === 400) setError(t('auth.errorOtpInvalid'));
      else setError(t('auth.errorNetwork'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError('');
    try {
      const res = await api.post(AUTH.REGISTER_OTP, formSnapshot);
      setOtpId(res.data.otpId);
      setMaskedRecipient(res.data.maskedRecipient);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast(t('auth.toastOtpResent'), 'success');
    } catch {
      setError(t('auth.errorNetwork'));
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>{t('auth.otpTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.otpSentTo', { recipient: maskedRecipient })}</Text>

          <TextInput
            label={t('auth.otpCodeLabel')}
            mode="outlined"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            style={styles.input}
          />

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Button
            mode="contained"
            onPress={handleVerify}
            disabled={loading}
            style={styles.button}
            buttonColor="#1B3A6B"
            contentStyle={{ height: 48 }}
          >
            {loading ? <ActivityIndicator color="#fff" size={20} /> : t('auth.otpVerifyButton')}
          </Button>

          <Pressable onPress={handleResend} disabled={cooldown > 0 || resending} style={styles.resendLink}>
            <Text style={[styles.resendLinkText, cooldown > 0 && styles.resendLinkTextDisabled]}>
              {cooldown > 0 ? t('auth.otpResendCooldown', { seconds: cooldown }) : t('auth.otpResend')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: { alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '600', color: '#1B3A6B', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 8, marginBottom: 24, textAlign: 'center' },
  input: { width: '100%', marginBottom: 12 },
  errorBanner: {
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: '#991B1B', fontSize: 13, textAlign: 'center' },
  button: { width: '100%', marginTop: 4, borderRadius: 8 },
  resendLink: { marginTop: 16 },
  resendLinkText: { fontSize: 13, color: '#1B3A6B', fontWeight: '500' },
  resendLinkTextDisabled: { color: '#9CA3AF' },
});
