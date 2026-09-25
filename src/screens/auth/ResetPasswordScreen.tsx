import React, { useRef, useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TextInput as RNTextInput } from 'react-native';
import { Text, TextInput, Button, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { AUTH } from '../../api/endpoints';

const COLOR = '#1B3A6B';
const NS = 'resetPassword';
const CODE_LENGTH = 6;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * ResetPasswordScreen — đặt lại mật khẩu NGAY TRONG APP, không đẩy người dùng ra Web.
 *
 * Đường chính: email + MÃ 6 SỐ nhận qua email (backend gửi email loại "mobile" khi
 * ForgotPasswordScreen gửi `client: 'mobile'`). Người dùng copy mã trong hộp thư rồi
 * quay lại dán vào đây; `email` được ForgotPasswordScreen truyền sẵn qua route params
 * (email không phải dữ liệu bí mật), vẫn cho sửa vì người dùng có thể vào thẳng màn
 * này từ nút "Nhập mã đặt lại mật khẩu".
 *
 * Đường phụ: nếu màn hình được mở bằng deep-link có `?token=` (scheme
 * `nursinghomemobile://reset-password` đã khai báo sẵn ở RootNavigator), thì dùng luôn
 * token đó thay cho email + mã. Backend nhận cả hai loại credential trên cùng một
 * endpoint nên không có luồng đổi mật khẩu nào bị nhân bản.
 *
 * Mã/token KHÔNG được ghi log và KHÔNG lưu vào AsyncStorage — chỉ nằm trong state
 * của màn hình, mất khi rời màn.
 */
export const ResetPasswordScreen: React.FC<{ navigation: any; route?: any }> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const paramToken: string = route?.params?.token ? String(route.params.token) : '';
  const paramEmail: string = route?.params?.email ? String(route.params.email) : '';
  /** Mở từ deep-link kèm token Web thì không cần hỏi email + mã nữa. */
  const fromWebLink = !!paramToken;

  const [email, setEmail] = useState(paramEmail);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const codeRef = useRef<RNTextInput>(null);
  const newPasswordRef = useRef<RNTextInput>(null);
  const confirmPasswordRef = useRef<RNTextInput>(null);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = code.trim();

    if (!fromWebLink) {
      if (!trimmedEmail) {
        setError(t(`${NS}.warnEmailRequired`));
        return;
      }
      if (!EMAIL_REGEX.test(trimmedEmail)) {
        setError(t(`${NS}.warnInvalidEmail`));
        return;
      }
      if (trimmedCode.length !== CODE_LENGTH) {
        setError(t(`${NS}.warnCodeRequired`, { length: CODE_LENGTH }));
        return;
      }
    }
    if (newPassword.length < 6) {
      setError(t(`${NS}.warnPasswordTooShort`));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t(`${NS}.warnPasswordMismatch`));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post(
        AUTH.RESET_PASSWORD,
        fromWebLink
          ? { token: paramToken, newPassword }
          : { email: trimmedEmail, code: trimmedCode, newPassword },
      );
      setSuccess(true);
    } catch (err: any) {
      const status = err.response?.status;
      // Backend cố tình trả CÙNG MỘT lỗi cho mọi lý do mã không dùng được (sai,
      // hết hạn, đã dùng, nhập sai quá nhiều lần) để không tiết lộ email có tồn
      // tại hay không, nên ở đây cũng chỉ có một câu tương ứng.
      if (status === 400) setError(t(`${NS}.errorInvalidToken`));
      else if (status === 429) setError(t(`${NS}.errorRateLimited`));
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

          {success ? (
            <>
              <Text style={styles.successTitle}>{t(`${NS}.successTitle`)}</Text>
              <Text style={styles.subtitle}>{t(`${NS}.successMessage`)}</Text>
              <Button
                mode="contained"
                buttonColor={COLOR}
                onPress={() => navigation.navigate('Login')}
                style={styles.button}
                contentStyle={{ height: 48 }}
              >
                {t(`${NS}.backToLogin`)}
              </Button>
            </>
          ) : (
            <>
              <Text style={styles.subtitle}>
                {t(fromWebLink ? `${NS}.subtitleFromLink` : `${NS}.subtitle`)}
              </Text>

              {fromWebLink ? null : (
                <>
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
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => codeRef.current?.focus()}
                  />

                  <TextInput
                    ref={codeRef}
                    label={t(`${NS}.codeLabel`)}
                    mode="outlined"
                    value={code}
                    onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
                    keyboardType="number-pad"
                    maxLength={CODE_LENGTH}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder={t(`${NS}.codePlaceholder`)}
                    left={<TextInput.Icon icon="key-outline" />}
                    style={styles.input}
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => newPasswordRef.current?.focus()}
                  />
                </>
              )}

              <TextInput
                ref={newPasswordRef}
                label={t(`${NS}.newPasswordLabel`)}
                mode="outlined"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                left={<TextInput.Icon icon="lock-outline" />}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    onPress={() => setShowPassword((v) => !v)}
                  />
                }
                style={styles.input}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
              />

              <TextInput
                ref={confirmPasswordRef}
                label={t(`${NS}.confirmPasswordLabel`)}
                mode="outlined"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                left={<TextInput.Icon icon="lock-check-outline" />}
                right={
                  <TextInput.Icon
                    icon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    onPress={() => setShowConfirmPassword((v) => !v)}
                  />
                }
                style={styles.input}
                returnKeyType="done"
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
