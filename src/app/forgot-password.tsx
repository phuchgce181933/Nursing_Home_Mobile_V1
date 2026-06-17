import { useState, useEffect } from 'react';
import {
  View, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay, Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius, Shadow } from '@/constants/theme';
import { AUTH_BASE_URL } from '@/constants/api';

type Step = 'enter-email' | 'sent' | 'enter-otp' | 'new-password' | 'done';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('enter-email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cardOpacity = useSharedValue(0);
  const cardTranslate = useSharedValue(40);

  useEffect(() => {
    cardOpacity.value = withDelay(150, withTiming(1, { duration: 500 }));
    cardTranslate.value = withDelay(150, withSpring(0, { damping: 18 }));
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslate.value }],
  }));

  const handleSendOtp = async () => {
    if (!email.trim()) { setError('Vui lòng nhập email'); return; }
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${AUTH_BASE_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      // Always show "sent" regardless of whether email exists (security best practice)
      setStep('sent');
    } catch {
      setStep('sent'); // don't reveal server errors
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp.trim()) { setError('Vui lòng nhập mã OTP'); return; }
    if (newPassword.length < 6) { setError('Mật khẩu phải ít nhất 6 ký tự'); return; }
    if (newPassword !== confirmPassword) { setError('Mật khẩu không khớp'); return; }
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${AUTH_BASE_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), token: otp.trim(), newPassword }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Đặt lại mật khẩu thất bại');
      }
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
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
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={styles.header}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <ThemedText style={styles.backText}>‹ Quay lại</ThemedText>
            </Pressable>
            <View style={styles.logoSmall}>
              <Image
                source={require('../../assets/images/logo-annhien.png')}
                style={styles.logoImg}
                contentFit="contain"
              />
            </View>
            <ThemedText style={styles.headerTitle}>Quên Mật Khẩu</ThemedText>
            <ThemedText style={styles.headerSub}>Viện dưỡng lão An Nhiên</ThemedText>
          </View>

          <Animated.View style={[styles.card, cardStyle]}>

            {/* Step: Enter email */}
            {step === 'enter-email' && (
              <>
                <View style={styles.stepIcon}><ThemedText style={styles.stepIconText}>📧</ThemedText></View>
                <ThemedText style={styles.cardTitle}>Nhập địa chỉ email</ThemedText>
                <ThemedText style={styles.cardDesc}>
                  Chúng tôi sẽ gửi mã xác nhận đến email của bạn để đặt lại mật khẩu.
                </ThemedText>

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
                      returnKeyType="send"
                      onSubmitEditing={handleSendOtp}
                    />
                  </View>
                </View>

                {error && <ErrorBox message={error} />}

                <Pressable style={[styles.btn, busy && styles.btnDisabled]} onPress={handleSendOtp} disabled={busy}>
                  {busy ? <ActivityIndicator color="#fff" /> : (
                    <ThemedText style={styles.btnText}>Gửi mã xác nhận</ThemedText>
                  )}
                </Pressable>
              </>
            )}

            {/* Step: Sent confirmation */}
            {step === 'sent' && (
              <>
                <View style={styles.stepIcon}><ThemedText style={styles.stepIconText}>✅</ThemedText></View>
                <ThemedText style={styles.cardTitle}>Đã gửi mã xác nhận</ThemedText>
                <ThemedText style={styles.cardDesc}>
                  Nếu email <ThemedText style={{ fontWeight: '700' }}>{email}</ThemedText> tồn tại trong hệ thống,
                  bạn sẽ nhận được mã OTP trong vài phút.
                </ThemedText>

                <View style={styles.fieldGroup}>
                  <ThemedText style={styles.fieldLabel}>Mã OTP (6 chữ số)</ThemedText>
                  <View style={styles.inputWrapper}>
                    <ThemedText style={styles.inputIcon}>🔑</ThemedText>
                    <TextInput
                      style={styles.input}
                      placeholder="Nhập mã OTP"
                      placeholderTextColor={Colors.textMuted}
                      value={otp}
                      onChangeText={t => { setOtp(t); setError(null); }}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <ThemedText style={styles.fieldLabel}>Mật khẩu mới</ThemedText>
                  <View style={styles.inputWrapper}>
                    <ThemedText style={styles.inputIcon}>🔒</ThemedText>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Ít nhất 6 ký tự"
                      placeholderTextColor={Colors.textMuted}
                      value={newPassword}
                      onChangeText={t => { setNewPassword(t); setError(null); }}
                      secureTextEntry={!showPw}
                    />
                    <Pressable onPress={() => setShowPw(v => !v)} style={styles.eyeBtn}>
                      <ThemedText>{showPw ? '🙈' : '👁️'}</ThemedText>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <ThemedText style={styles.fieldLabel}>Xác nhận mật khẩu</ThemedText>
                  <View style={styles.inputWrapper}>
                    <ThemedText style={styles.inputIcon}>🔒</ThemedText>
                    <TextInput
                      style={styles.input}
                      placeholder="Nhập lại mật khẩu"
                      placeholderTextColor={Colors.textMuted}
                      value={confirmPassword}
                      onChangeText={t => { setConfirmPassword(t); setError(null); }}
                      secureTextEntry={!showPw}
                      returnKeyType="done"
                      onSubmitEditing={handleResetPassword}
                    />
                  </View>
                </View>

                {error && <ErrorBox message={error} />}

                <Pressable style={[styles.btn, busy && styles.btnDisabled]} onPress={handleResetPassword} disabled={busy}>
                  {busy ? <ActivityIndicator color="#fff" /> : (
                    <ThemedText style={styles.btnText}>Đặt lại mật khẩu</ThemedText>
                  )}
                </Pressable>

                <Pressable onPress={() => { setStep('enter-email'); setOtp(''); setError(null); }}>
                  <ThemedText style={styles.resendLink}>Gửi lại mã OTP</ThemedText>
                </Pressable>
              </>
            )}

            {/* Step: Done */}
            {step === 'done' && (
              <>
                <View style={styles.stepIcon}><ThemedText style={styles.stepIconText}>🎉</ThemedText></View>
                <ThemedText style={styles.cardTitle}>Đặt lại mật khẩu thành công!</ThemedText>
                <ThemedText style={styles.cardDesc}>
                  Mật khẩu của bạn đã được cập nhật. Hãy đăng nhập lại với mật khẩu mới.
                </ThemedText>

                <Pressable style={styles.btn} onPress={() => router.replace('/login')}>
                  <ThemedText style={styles.btnText}>Về trang đăng nhập</ThemedText>
                </Pressable>
              </>
            )}

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <View style={styles.errorBox}>
      <ThemedText style={styles.errorText}>⚠️ {message}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gradient: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', paddingVertical: Spacing.four, paddingHorizontal: Spacing.three },

  header: { width: '100%', maxWidth: 440, marginBottom: Spacing.four, alignItems: 'center' },
  backBtn: { alignSelf: 'flex-start', padding: Spacing.one, marginBottom: Spacing.three },
  backText: { fontSize: 16, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  logoSmall: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.two, ...Shadow.md,
  },
  logoImg: { width: 64, height: 64 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  card: {
    width: '100%', maxWidth: 440,
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    ...Shadow.lg,
  },

  stepIcon: { alignItems: 'center', marginBottom: Spacing.two },
  stepIconText: { fontSize: 48 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.two },
  cardDesc: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.four },

  fieldGroup: { marginBottom: Spacing.three },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.one },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.md, backgroundColor: Colors.background,
    paddingHorizontal: Spacing.two, height: 52,
  },
  inputIcon: { fontSize: 16, marginRight: Spacing.one },
  input: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  eyeBtn: { padding: Spacing.one },

  errorBox: {
    backgroundColor: '#FFEBEE', borderRadius: Radius.md,
    padding: Spacing.two, marginBottom: Spacing.three,
    borderLeftWidth: 3, borderLeftColor: Colors.error,
  },
  errorText: { fontSize: 13, color: Colors.error, fontWeight: '500' },

  btn: {
    height: 52, borderRadius: Radius.md,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.primary,
    marginBottom: Spacing.two, ...Shadow.md,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  resendLink: { fontSize: 13, color: Colors.primary, textAlign: 'center', fontWeight: '600', padding: Spacing.one },
});
