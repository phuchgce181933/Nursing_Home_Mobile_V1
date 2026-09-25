import React, { useRef, useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image, Pressable, TextInput as RNTextInput } from 'react-native';
import { Text, TextInput, Button, ActivityIndicator, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/axiosInstance';
import { AUTH } from '../../api/endpoints';
import { useAuth } from '../../auth/useAuth';
import { LANGUAGE_STORAGE_KEY } from '../../i18n';

const COLOR = '#000666';
const COLOR_SOFT = '#EEF0FF';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_REGEX = /^(\+84|0)[0-9]{8,10}$/;

// No real blur filter available without adding a native dependency for a
// single screen — soft translucent circles approximate the same premium
// "glass blob" background used on web without pulling in expo-blur.
const DECOR_ICONS: { icon: string; top: string; left: string; size: number; rotate: string }[] = [
  { icon: 'leaf', top: '8%', left: '6%', size: 26, rotate: '20deg' },
  { icon: 'heart-pulse', top: '16%', left: '80%', size: 24, rotate: '-15deg' },
  { icon: 'pulse', top: '32%', left: '10%', size: 22, rotate: '60deg' },
  { icon: 'plus', top: '46%', left: '86%', size: 22, rotate: '10deg' },
  { icon: 'leaf', top: '62%', left: '4%', size: 24, rotate: '-40deg' },
  { icon: 'stethoscope', top: '74%', left: '82%', size: 24, rotate: '15deg' },
];

export const LoginScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();

  const changeLanguage = (lang: 'vi' | 'en') => {
    i18n.changeLanguage(lang);
    AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  };
  const scrollRef = useRef<ScrollView>(null);
  const passwordInputRef = useRef<RNTextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    const identifier = email.trim();
    if (!identifier || !password) {
      setError(t('auth.errorMissingFields'));
      return;
    }
    const isEmailLike = identifier.includes('@');
    if (isEmailLike && !EMAIL_REGEX.test(identifier)) {
      setError(t('auth.errorInvalidEmail'));
      return;
    }
    if (!isEmailLike && !PHONE_REGEX.test(identifier)) {
      setError(t('auth.errorInvalidPhone'));
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
      const errorCode = err.response?.data?.errorCode ?? '';
      if (status === 401) {
        if (errorCode === 'AUTH_ACCOUNT_INACTIVE') setError(t('auth.errorInactive'));
        else if (errorCode === 'AUTH_ACCOUNT_BANNED') setError(t('auth.errorBanned'));
        else setError(t('auth.errorInvalidCredentials'));
      }
      else if (status === 403) setError(t('auth.errorForbidden'));
      else setError(t('auth.errorNetwork'));
    } finally {
      setLoading(false);
    }
  };

  const TRUST_ITEMS = [
    { icon: 'shield-check-outline', title: t('auth.trustSafeTitle'), desc: t('auth.trustSafeDesc') },
    { icon: 'heart-outline', title: t('auth.trustCareTitle'), desc: t('auth.trustCareDesc') },
    { icon: 'account-group-outline', title: t('auth.trustProTitle'), desc: t('auth.trustProDesc') },
  ];

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={[COLOR_SOFT, '#FFFFFF']} style={StyleSheet.absoluteFill} />

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[styles.blob, styles.blob1]} />
        <View style={[styles.blob, styles.blob2]} />
        <View style={[styles.blob, styles.blob3]} />
        {DECOR_ICONS.map((d, i) => (
          <MaterialCommunityIcons
            key={i}
            name={d.icon as any}
            size={d.size}
            color={COLOR}
            style={{
              position: 'absolute',
              top: d.top as any,
              left: d.left as any,
              opacity: 0.07,
              transform: [{ rotate: d.rotate }],
            }}
          />
        ))}
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <IconButton
          icon="arrow-left"
          iconColor={COLOR}
          size={22}
          onPress={() => (navigation?.canGoBack?.() ? navigation.goBack() : navigation?.navigate('Welcome'))}
          style={styles.topBarBtn}
        />
        <View style={styles.langToggle}>
          <Pressable onPress={() => changeLanguage('vi')} hitSlop={8}>
            <Text style={[styles.langText, i18n.language === 'vi' && styles.langTextActive]}>VI</Text>
          </Pressable>
          <Text style={styles.langSep}>|</Text>
          <Pressable onPress={() => changeLanguage('en')} hitSlop={8}>
            <Text style={[styles.langText, i18n.language === 'en' && styles.langTextActive]}>EN</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInDown.duration(450)} style={styles.brandWrap}>
          <Image
            source={require('../../../assets/images/logo-annhien.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brand}>{t('welcome.brand')}</Text>
          <Text style={styles.tagline}>{t('auth.tagline')}</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(500).delay(80)} style={styles.card}>
          <View style={styles.badgeCircle}>
            <MaterialCommunityIcons name="shield-check" size={30} color={COLOR} />
          </View>
          <Text style={styles.title}>{t('auth.appTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.appSubtitle')}</Text>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <MaterialCommunityIcons name="leaf" size={14} color={COLOR} style={styles.dividerIcon} />
            <View style={styles.dividerLine} />
          </View>

          <TextInput
            label={t('auth.emailOrPhone')}
            mode="outlined"
            value={email}
            onChangeText={setEmail}
            keyboardType="default"
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => passwordInputRef.current?.focus()}
            blurOnSubmit={false}
            outlineColor="#E5E7EB"
            activeOutlineColor={COLOR}
            left={<TextInput.Icon icon="email-outline" color={COLOR} />}
            style={styles.input}
          />

          <TextInput
            ref={passwordInputRef}
            label={t('auth.password')}
            mode="outlined"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            returnKeyType="go"
            onSubmitEditing={handleLogin}
            outlineColor="#E5E7EB"
            activeOutlineColor={COLOR}
            left={<TextInput.Icon icon="lock-outline" color={COLOR} />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                onPress={() => setShowPassword((v) => !v)}
              />
            }
            onFocus={() => {
              setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
            }}
            style={styles.input}
          />

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
            buttonColor={COLOR}
            contentStyle={styles.buttonContent}
          >
            {loading ? <ActivityIndicator color="#fff" size={20} /> : t('auth.loginButton')}
          </Button>

          <Pressable onPress={() => navigation?.navigate('ForgotPassword')} style={styles.forgotLink}>
            <Text style={styles.forgotLinkText}>{t('auth.forgotPasswordLink')}</Text>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(500).delay(160)} style={styles.trustRow}>
          {TRUST_ITEMS.map((item) => (
            <View key={item.title} style={styles.trustItem}>
              <View style={styles.trustIconCircle}>
                <MaterialCommunityIcons name={item.icon as any} size={18} color={COLOR} />
              </View>
              <Text style={styles.trustTitle}>{item.title}</Text>
              <Text style={styles.trustDesc}>{item.desc}</Text>
            </View>
          ))}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLOR_SOFT },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 4,
  },
  topBarBtn: { margin: 0 },
  langToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 16 },
  langText: { fontSize: 13, fontWeight: '500', color: '#9CA3AF' },
  langTextActive: { color: COLOR, fontWeight: '700' },
  langSep: { fontSize: 13, color: '#D1D5DB' },

  container: { flexGrow: 1, alignItems: 'center', padding: 24, paddingTop: 56, paddingBottom: 40 },

  blob: { position: 'absolute', borderRadius: 999 },
  blob1: { width: 220, height: 220, top: -80, left: -70, backgroundColor: COLOR_SOFT, opacity: 0.6 },
  blob2: { width: 180, height: 180, top: '55%', right: -70, backgroundColor: '#D9FBE8', opacity: 0.5 },
  blob3: { width: 140, height: 140, bottom: -40, left: -30, backgroundColor: COLOR_SOFT, opacity: 0.5 },

  brandWrap: { alignItems: 'center' },
  logo: { width: 64, height: 64, marginBottom: 8 },
  brand: { fontSize: 15, fontWeight: '700', color: COLOR, letterSpacing: 1.5 },
  tagline: { fontSize: 12, color: '#6B7280', marginTop: 4, marginBottom: 24, textAlign: 'center' },

  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 4,
    // Web (RN 0.79+) đã bỏ prop `shadow*` và cảnh báo dùng `boxShadow`; native giữ `shadow*`.
    ...Platform.select({
      web: { boxShadow: '0px 8px 16px rgba(0,6,102,0.12)' },
      default: {
        shadowColor: COLOR,
        shadowOpacity: 0.12,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      },
    }),
  },
  badgeCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: COLOR_SOFT, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '700', color: COLOR },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerIcon: { marginHorizontal: 10 },

  input: { width: '100%', marginBottom: 12, backgroundColor: '#fff' },
  errorBanner: { width: '100%', backgroundColor: '#FEF2F2', borderRadius: 8, padding: 12, marginBottom: 12 },
  errorText: { color: '#991B1B', fontSize: 13, textAlign: 'center' },
  button: { width: '100%', marginTop: 4, borderRadius: 26 },
  buttonContent: { height: 52 },
  forgotLink: { marginTop: 16 },
  forgotLinkText: { fontSize: 13, color: COLOR, fontWeight: '600' },

  trustRow: { flexDirection: 'row', width: '100%', marginTop: 28, gap: 8 },
  trustItem: { flex: 1, alignItems: 'center', gap: 4 },
  trustIconCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLOR_SOFT,
  },
  trustTitle: { fontSize: 12, fontWeight: '700', color: COLOR, textAlign: 'center' },
  trustDesc: { fontSize: 10, color: '#9CA3AF', textAlign: 'center', lineHeight: 13 },
});
