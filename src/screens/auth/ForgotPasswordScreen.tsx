import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { AUTH } from '../../api/endpoints';

const COLOR = '#1B3A6B';
const NS = 'forgotPassword';

// Regex email giống Web & backend validateEmail: ^[^\s@]+@[^\s@]+\.[^\s@]{2,}$
// (ít nhất một ký tự trước @, một ký tự giữa @ và dấu chấm, và 2+ ký tự sau dấu chấm)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const ForgotPasswordScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError(t(`${NS}.warnEmailRequired`));
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setError(t(`${NS}.warnInvalidEmail`));
      return;
    }
    setError('');
    setLoading(true);
    try {
      // `client: 'mobile'` nói rõ yêu cầu đến từ ứng dụng, nên backend gửi email
      // CHỈ có mã 6 số để copy, không kèm liên kết Web — người dùng không bị đẩy
      // ra trình duyệt giữa luồng. Gửi tường minh thay vì để backend đoán từ
      // User-Agent, vì User-Agent thì client nào cũng giả được.
      // Backend trả cùng một response bất kể email có tồn tại hay không (chống liệt kê tài khoản).
      await api.post(AUTH.FORGOT_PASSWORD, { email: trimmed.toLowerCase(), client: 'mobile' });
      setSent(true);
    } catch (err: any) {
      const status = err.response?.status;
      // CỐ Ý không có nhánh "email không tồn tại": backend luôn trả success cho
      // email hợp lệ dù tài khoản có hay không (chống liệt kê tài khoản). Nếu ở
      // đây hiển thị riêng thông báo đó, màn hình sẽ tự làm rò rỉ đúng thứ mà
      // backend đang giấu. Chỉ tách riêng 429 vì đó là thông tin về chính người
      // dùng (gửi quá nhiều lần), không phải về sự tồn tại của tài khoản.
      if (status === 429) setError(t(`${NS}.errorRateLimited`));
      else setError(t(`${NS}.errorGeneric`));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <IconButton icon="arrow-left" iconColor={COLOR} size={22} onPress={() => navigation.goBack()} />
      </View>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>{t(`${NS}.title`)}</Text>

          {sent ? (
            <>
              <Text style={styles.successTitle}>{t(`${NS}.successTitle`)}</Text>
              <Text style={styles.subtitle}>{t(`${NS}.successMessage`, { email: email.trim() })}</Text>
              {/* Người dùng Mobile không cần bấm liên kết Web: email có kèm một mã
                  để copy. Câu này nói rõ việc phải làm tiếp, vì rời app sang hộp thư
                  rồi quay lại là chỗ dễ bỏ dở nhất của luồng đặt lại mật khẩu. */}
              <Text style={styles.hint}>{t(`${NS}.haveTokenPrompt`)}</Text>

              <Button
                mode="contained"
                buttonColor={COLOR}
                // Chỉ truyền `email` — dữ liệu không bí mật, giúp người dùng không
                // phải gõ lại. Mã đặt lại KHÔNG bao giờ đi qua navigation params.
                onPress={() => navigation.navigate('ResetPassword', { email: email.trim().toLowerCase() })}
                style={styles.button}
                contentStyle={{ height: 48 }}
              >
                {t(`${NS}.haveTokenButton`)}
              </Button>
              <Button
                mode="text"
                textColor={COLOR}
                onPress={() => navigation.navigate('Login')}
                style={{ marginTop: 8 }}
              >
                {t(`${NS}.backToLogin`)}
              </Button>
            </>
          ) : (
            <>
              <Text style={styles.subtitle}>{t(`${NS}.subtitle`)}</Text>

              <TextInput
                label={t(`${NS}.emailLabel`)}
                mode="outlined"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                left={<TextInput.Icon icon="email-outline" />}
                style={styles.input}
                returnKeyType="go"
                submitBehavior="blurAndSubmit"
                onSubmitEditing={handleSubmit}
              />

              {error ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={loading}
                disabled={loading}
                style={styles.button}
                buttonColor={COLOR}
                contentStyle={{ height: 48 }}
              >
                {t(`${NS}.submit`)}
              </Button>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FFFFFF' },
  topBar: { paddingHorizontal: 4, paddingBottom: 4 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 0 },
  card: { alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '600', color: COLOR, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24, textAlign: 'center' },
  successTitle: { fontSize: 16, fontWeight: '600', color: '#065F46', marginTop: 8, textAlign: 'center' },
  hint: { fontSize: 13, color: '#6B7280', marginBottom: 12, textAlign: 'center' },
  input: { width: '100%', marginBottom: 12 },
  errorBanner: {
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: '#991B1B', fontSize: 13, textAlign: 'center' },
  button: { width: '100%', marginTop: 12, borderRadius: 8 },
});
