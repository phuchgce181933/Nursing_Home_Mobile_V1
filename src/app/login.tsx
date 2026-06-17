import { useRef, useState, useEffect } from 'react';
import {
  View, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring,
  withDelay, Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/hooks/use-auth';
import { Colors, Spacing, Radius, Shadow } from '@/constants/theme';

const ROLE_DASHBOARD: Record<string, string> = {
  nurse: '/nurse',
  caregiver: '/caregiver',
  family: '/family/dashboard',
  doctor: '/nurse',
  manager: '/nurse',
  admin: '/nurse',
};

export default function LoginScreen() {
  const { token, user, login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  // ── animations ────────────────────────────────────────────────────────────
  const logoOpacity   = useSharedValue(0);
  const logoScale     = useSharedValue(0.7);
  const formTranslate = useSharedValue(60);
  const formOpacity   = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value  = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    logoScale.value    = withSpring(1, { damping: 14, stiffness: 90 });
    formTranslate.value = withDelay(300, withSpring(0, { damping: 18, stiffness: 100 }));
    formOpacity.value   = withDelay(300, withTiming(1, { duration: 500 }));
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const formStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formTranslate.value }],
  }));

  // ── redirect after login ──────────────────────────────────────────────────
  useEffect(() => {
    if (!token || !user) return;
    const dest = ROLE_DASHBOARD[user.role] ?? '/family/dashboard';
    router.replace(dest as any);
  }, [token, user]);

  // ── submit ────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Vui lòng nhập email và mật khẩu');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient
      colors={['#1B5E20', '#2E7D32', '#388E3C']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.4, y: 1 }}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Logo + Branding ───────────────────────────────────────────── */}
          <Animated.View style={[styles.logoSection, logoStyle]}>
            <View style={styles.logoWrapper}>
              <Image
                source={require('../../assets/images/logo-annhien.png')}
                style={styles.logo}
                contentFit="contain"
              />
            </View>
            <ThemedText style={styles.brandName}>AN NHIÊN</ThemedText>
            <ThemedText style={styles.brandSub}>VIỆN DƯỠNG LÃO</ThemedText>
            <View style={styles.brandDivider} />
            <ThemedText style={styles.brandTagline}>Chăm sóc tận tâm · Sống an vui</ThemedText>
          </Animated.View>

          {/* ── Card ─────────────────────────────────────────────────────── */}
          <Animated.View style={[styles.card, formStyle]}>

            {/* Fields */}
            <View style={styles.fieldGroup}>
              <ThemedText style={styles.fieldLabel}>Email</ThemedText>
              <View style={styles.inputWrapper}>
                <ThemedText style={styles.inputIcon}>✉️</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập email của bạn"
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={t => { setEmail(t); setError(null); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <ThemedText style={styles.fieldLabel}>Mật khẩu</ThemedText>
                <Pressable onPress={() => router.push('/forgot-password' as any)}>
                  <ThemedText style={styles.forgotLink}>Quên mật khẩu?</ThemedText>
                </Pressable>
              </View>
              <View style={styles.inputWrapper}>
                <ThemedText style={styles.inputIcon}>🔒</ThemedText>
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, styles.inputPassword]}
                  placeholder="Nhập mật khẩu"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={t => { setPassword(t); setError(null); }}
                  secureTextEntry={!showPassword}
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                />
                <Pressable style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)}>
                  <ThemedText style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</ThemedText>
                </Pressable>
              </View>
            </View>

            {/* Error */}
            {error && (
              <View style={styles.errorBox}>
                <ThemedText style={styles.errorText}>⚠️ {error}</ThemedText>
              </View>
            )}

            {/* Login button */}
            <Pressable
              style={[styles.loginBtn, busy && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <ThemedText style={styles.loginBtnText}>Đăng nhập</ThemedText>
              )}
            </Pressable>

            <ThemedText style={styles.helpText}>
              Cần hỗ trợ? Liên hệ quản trị viên
            </ThemedText>
          </Animated.View>

          <ThemedText style={styles.footer}>© 2025 Viện dưỡng lão An Nhiên</ThemedText>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gradient: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.three,
  },

  // Logo section
  logoSection: {
    alignItems: 'center',
    marginBottom: Spacing.five,
    marginTop: Spacing.four,
  },
  logoWrapper: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
    ...Shadow.lg,
  },
  logo: {
    width: 120,
    height: 120,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 6,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  brandSub: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 4,
    marginTop: 2,
  },
  brandDivider: {
    width: 60,
    height: 1.5,
    backgroundColor: Colors.accent,
    marginVertical: Spacing.two,
    borderRadius: 1,
  },
  brandTagline: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
    fontStyle: 'italic',
  },

  // Card
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    ...Shadow.lg,
    marginBottom: Spacing.three,
  },
  // Fields
  fieldGroup: { marginBottom: Spacing.three },
  fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.one },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.one },
  forgotLink: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.two,
    height: 52,
  },
  inputIcon: { fontSize: 16, marginRight: Spacing.one },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    height: '100%',
  },
  inputPassword: { paddingRight: Spacing.four },
  eyeBtn: { padding: Spacing.one },
  eyeIcon: { fontSize: 18 },

  // Error
  errorBox: {
    backgroundColor: '#FFEBEE',
    borderRadius: Radius.md,
    padding: Spacing.two,
    marginBottom: Spacing.three,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  errorText: { fontSize: 13, color: Colors.error, fontWeight: '500' },

  // Login button
  loginBtn: {
    height: 52,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
    backgroundColor: Colors.primary,
    ...Shadow.md,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 },
  helpText: { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },

  footer: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: Spacing.three,
    textAlign: 'center',
  },
});
