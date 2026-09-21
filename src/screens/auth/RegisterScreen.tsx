import React, { useState, useRef } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image, Pressable, TextInput as RNTextInput } from 'react-native';
import { Text, TextInput, Button, ActivityIndicator, Chip } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { AUTH } from '../../api/endpoints';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_REGEX = /^(\+84|0)[0-9]{8,10}$/;

export const RegisterScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [contactMethod, setContactMethod] = useState<'email' | 'phone'>('email');
  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const scrollRef = useRef<ScrollView>(null);
  const contactRef = useRef<RNTextInput>(null);
  const passwordRef = useRef<RNTextInput>(null);
  const confirmRef = useRef<RNTextInput>(null);

  const switchMethod = (method: 'email' | 'phone') => {
    setContactMethod(method);
    setContact('');
    setError('');
  };

  const handleRegister = async () => {
    const name = fullName.trim();
    const contactValue = contact.trim();

    if (!name || name.length < 2) {
      setError(t('auth.errorFullNameRequired'));
      return;
    }
    if (!contactValue) {
      setError(t('auth.errorContactRequired'));
      return;
    }
    if (contactMethod === 'email' && !EMAIL_REGEX.test(contactValue)) {
      setError(t('auth.errorInvalidEmail'));
      return;
    }
    if (contactMethod === 'phone' && !PHONE_REGEX.test(contactValue)) {
      setError(t('auth.errorInvalidPhone'));
      return;
    }
    if (!password || password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError(t('auth.errorPasswordComplexity'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.errorPasswordMismatch'));
      return;
    }

    setError('');
    setLoading(true);
    try {
      const body: Record<string, string> = { fullName: name, password };
      if (contactMethod === 'email') body.email = contactValue.toLowerCase();
      else body.phone = contactValue;

      const res = await api.post(AUTH.REGISTER_OTP, body);
      const { otpId, maskedRecipient } = res.data;
      navigation?.navigate('VerifyRegisterOtp', { otpId, maskedRecipient, formSnapshot: body });
    } catch (err: any) {
      const status = err.response?.status;
      const errorCode = err.response?.data?.errorCode;
      if (errorCode === 'AUTH_EMAIL_IN_USE') setError(t('auth.errorEmailInUse'));
      else if (errorCode === 'AUTH_PHONE_IN_USE') setError(t('auth.errorPhoneInUseRegister'));
      else if (errorCode === 'AUTH_REGISTER_CONTACT_REQUIRED') setError(t('auth.errorContactRequired'));
      else if (status === 400) setError(err.response?.data?.message ?? t('auth.errorRegisterGeneric'));
      else setError(t('auth.errorNetwork'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView ref={scrollRef} contentContainerStyle={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Image
            source={require('../../../assets/images/logo-annhien.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>{t('auth.registerTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.registerSubtitle')}</Text>

          <TextInput
            label={t('auth.fullNameLabel')}
            mode="outlined"
            value={fullName}
            onChangeText={setFullName}
            left={<TextInput.Icon icon="account-outline" />}
            style={styles.input}
            returnKeyType="next"
            onSubmitEditing={() => contactRef.current?.focus()}
            blurOnSubmit={false}
          />

          <View style={styles.methodRow}>
            <Chip
              selected={contactMethod === 'email'}
              onPress={() => switchMethod('email')}
              style={[styles.methodChip, contactMethod === 'email' && styles.methodChipActive]}
              textStyle={contactMethod === 'email' ? { color: '#fff' } : undefined}
            >
              {t('auth.contactMethodEmail')}
            </Chip>
            <Chip
              selected={contactMethod === 'phone'}
              onPress={() => switchMethod('phone')}
              style={[styles.methodChip, contactMethod === 'phone' && styles.methodChipActive]}
              textStyle={contactMethod === 'phone' ? { color: '#fff' } : undefined}
            >
              {t('auth.contactMethodPhone')}
            </Chip>
          </View>

          {contactMethod === 'email' ? (
            <TextInput
              ref={contactRef}
              label={t('auth.email')}
              mode="outlined"
              value={contact}
              onChangeText={setContact}
              keyboardType="email-address"
              autoCapitalize="none"
              left={<TextInput.Icon icon="email-outline" />}
              style={styles.input}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
            />
          ) : (
            <TextInput
              ref={contactRef}
              label={t('auth.phoneLabel')}
              mode="outlined"
              value={contact}
              onChangeText={setContact}
              keyboardType="phone-pad"
              left={<TextInput.Icon icon="phone-outline" />}
              style={styles.input}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
            />
          )}

          <TextInput
            ref={passwordRef}
            label={t('auth.password')}
            mode="outlined"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            left={<TextInput.Icon icon="lock-outline" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                onPress={() => setShowPassword((v) => !v)}
              />
            }
            style={styles.input}
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
            blurOnSubmit={false}
          />

          <TextInput
            ref={confirmRef}
            label={t('auth.confirmPasswordLabel')}
            mode="outlined"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            left={<TextInput.Icon icon="lock-check-outline" />}
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Button
            mode="contained"
            onPress={handleRegister}
            disabled={loading}
            style={styles.button}
            buttonColor="#1B3A6B"
            contentStyle={{ height: 48 }}
          >
            {loading ? <ActivityIndicator color="#fff" size={20} /> : t('auth.registerButton')}
          </Button>

          <Pressable onPress={() => navigation?.goBack()} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>{t('auth.haveAccountLink')}</Text>
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
  logo: { width: 80, height: 80, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '600', color: '#1B3A6B', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 24, textAlign: 'center' },
  input: { width: '100%', marginBottom: 12 },
  methodRow: { flexDirection: 'row', gap: 8, alignSelf: 'flex-start', marginBottom: 12 },
  methodChip: { borderRadius: 20 },
  methodChipActive: { backgroundColor: '#1B3A6B' },
  errorBanner: {
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: '#991B1B', fontSize: 13, textAlign: 'center' },
  button: { width: '100%', marginTop: 4, borderRadius: 8 },
  loginLink: { marginTop: 16 },
  loginLinkText: { fontSize: 13, color: '#1B3A6B', fontWeight: '500' },
});
