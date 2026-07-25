import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image, Pressable } from 'react-native';
import { Text, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/axiosInstance';
import { AUTH } from '../../api/endpoints';
import { useAuth } from '../../auth/useAuth';
import { LANGUAGE_STORAGE_KEY } from '../../i18n';

export const LoginScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { login } = useAuth();

  const changeLanguage = (lang: 'vi' | 'en') => {
    i18n.changeLanguage(lang);
    AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError(t('auth.errorMissingFields'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.post(AUTH.LOGIN, { email: email.trim().toLowerCase(), password });
      const { token, user } = res.data;
      await login(token, user);
    } catch (err: any) {
      const status = err.response?.status;
      const msg = err.response?.data?.message ?? '';
      if (status === 401) {
        if (msg.toLowerCase().includes('inactive')) setError(t('auth.errorInactive'));
        else if (msg.toLowerCase().includes('banned')) setError(t('auth.errorBanned'));
        else setError(t('auth.errorInvalidCredentials'));
      }
      else if (status === 403) setError(t('auth.errorForbidden'));
      else setError(t('auth.errorNetwork'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.langToggle, { top: insets.top + 12 }]}>
        <Pressable onPress={() => changeLanguage('vi')} hitSlop={8}>
          <Text style={[styles.langText, i18n.language === 'vi' && styles.langTextActive]}>VI</Text>
        </Pressable>
        <Text style={styles.langSep}>|</Text>
        <Pressable onPress={() => changeLanguage('en')} hitSlop={8}>
          <Text style={[styles.langText, i18n.language === 'en' && styles.langTextActive]}>EN</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Image
            source={require('../../../assets/images/logo-annhien.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>{t('auth.appTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.appSubtitle')}</Text>

          <TextInput
            label={t('auth.emailOrPhone')}
            mode="outlined"
            value={email}
            onChangeText={setEmail}
            keyboardType="default"
            autoCapitalize="none"
            left={<TextInput.Icon icon="account-outline" />}
            style={styles.input}
          />

          <TextInput
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
          />

          <Pressable onPress={() => navigation?.navigate('ForgotPassword')} style={styles.forgotLink}>
            <Text style={styles.forgotLinkText}>{t('auth.forgotPasswordLink')}</Text>
          </Pressable>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Button
            mode="contained"
            onPress={handleLogin}
            disabled={loading}
            style={styles.button}
            buttonColor="#1B3A6B"
            contentStyle={{ height: 48 }}
          >
            {loading ? <ActivityIndicator color="#fff" size={20} /> : t('auth.loginButton')}
          </Button>

          <Pressable onPress={() => navigation?.navigate('Register')} style={styles.registerLink}>
            <Text style={styles.registerLinkText}>{t('auth.registerLink')}</Text>
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
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '600', color: '#1B3A6B' },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 32 },
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
  langToggle: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 1,
  },
  langText: { fontSize: 13, fontWeight: '500', color: '#9CA3AF' },
  langTextActive: { color: '#1B3A6B', fontWeight: '700' },
  langSep: { fontSize: 13, color: '#D1D5DB' },
  forgotLink: { alignSelf: 'flex-end', marginBottom: 12, marginTop: -4 },
  forgotLinkText: { fontSize: 13, color: '#1B3A6B', fontWeight: '500' },
  registerLink: { marginTop: 16 },
  registerLinkText: { fontSize: 13, color: '#1B3A6B', fontWeight: '500' },
});
