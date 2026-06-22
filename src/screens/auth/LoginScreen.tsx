import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../api/axiosInstance';
import { AUTH } from '../../api/endpoints';
import { useAuth } from '../../auth/useAuth';

type ScreenMode = 'login' | 'forgot' | 'reset';

export const LoginScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { login } = useAuth();
  const [mode, setMode] = useState<ScreenMode>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const clearMessages = () => { setError(''); setSuccess(''); };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Vui lòng nhập email và mật khẩu');
      return;
    }
    clearMessages();
    setLoading(true);
    try {
      const res = await api.post(AUTH.LOGIN, { email: email.trim().toLowerCase(), password });
      const { token, user } = res.data;
      await login(token, user);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401) setError('Sai tên đăng nhập hoặc mật khẩu');
      else if (status === 403) setError('Tài khoản không có quyền truy cập');
      else setError('Không thể kết nối. Kiểm tra mạng.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Vui lòng nhập email của bạn');
      return;
    }
    clearMessages();
    setLoading(true);
    try {
      await api.post(AUTH.FORGOT_PASSWORD, { email: email.trim().toLowerCase() });
      setSuccess('Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư (bao gồm thư rác).');
      setMode('reset');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (err.response?.status === 404) setError('Email không tồn tại trong hệ thống');
      else setError(msg || 'Không thể gửi email. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetToken.trim()) { setError('Vui lòng nhập mã xác nhận từ email'); return; }
    if (!newPassword || newPassword.length < 6) { setError('Mật khẩu mới phải có ít nhất 6 ký tự'); return; }
    if (newPassword !== confirmPassword) { setError('Mật khẩu xác nhận không khớp'); return; }
    clearMessages();
    setLoading(true);
    try {
      await api.post(AUTH.RESET_PASSWORD, { token: resetToken.trim(), newPassword });
      setSuccess('Đặt lại mật khẩu thành công! Hãy đăng nhập với mật khẩu mới.');
      setPassword('');
      setResetToken('');
      setNewPassword('');
      setConfirmPassword('');
      setMode('login');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (msg?.includes('expired') || msg?.includes('hết hạn')) setError('Mã xác nhận đã hết hạn. Vui lòng yêu cầu lại.');
      else setError(msg || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const switchToForgot = () => { clearMessages(); setMode('forgot'); };
  const switchToLogin = () => { clearMessages(); setSuccess(''); setMode('login'); };
  const switchToReset = () => { clearMessages(); setMode('reset'); };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Image
            source={require('../../../assets/images/logo-annhien.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Nursing Home</Text>
          <Text style={styles.subtitle}>
            {mode === 'login' ? 'Hệ thống quản lý viện dưỡng lão' :
             mode === 'forgot' ? 'Quên mật khẩu' : 'Đặt lại mật khẩu'}
          </Text>

          {mode === 'login' && (
            <>
              <TextInput
                label="Email"
                mode="outlined"
                value={email}
                onChangeText={(v) => { setEmail(v); clearMessages(); }}
                keyboardType="email-address"
                autoCapitalize="none"
                left={<TextInput.Icon icon="email-outline" />}
                style={styles.input}
              />
              <TextInput
                label="Mật khẩu"
                mode="outlined"
                value={password}
                onChangeText={(v) => { setPassword(v); clearMessages(); }}
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

              <TouchableOpacity onPress={switchToForgot} style={styles.forgotLink}>
                <Text style={styles.forgotText}>Quên mật khẩu?</Text>
              </TouchableOpacity>
            </>
          )}

          {mode === 'forgot' && (
            <>
              <View style={styles.infoBox}>
                <MaterialCommunityIcons name="email-fast-outline" size={20} color="#1E40AF" />
                <Text style={styles.infoText}>
                  Nhập email đã đăng ký. Chúng tôi sẽ gửi mã xác nhận để đặt lại mật khẩu.
                </Text>
              </View>
              <TextInput
                label="Email"
                mode="outlined"
                value={email}
                onChangeText={(v) => { setEmail(v); clearMessages(); }}
                keyboardType="email-address"
                autoCapitalize="none"
                left={<TextInput.Icon icon="email-outline" />}
                style={styles.input}
              />
            </>
          )}

          {mode === 'reset' && (
            <>
              <View style={styles.infoBox}>
                <MaterialCommunityIcons name="shield-key-outline" size={20} color="#1E40AF" />
                <Text style={styles.infoText}>
                  Nhập mã xác nhận (token) từ email và mật khẩu mới của bạn.
                </Text>
              </View>
              <TextInput
                label="Mã xác nhận (token)"
                mode="outlined"
                value={resetToken}
                onChangeText={(v) => { setResetToken(v); clearMessages(); }}
                autoCapitalize="none"
                left={<TextInput.Icon icon="key-outline" />}
                style={styles.input}
              />
              <TextInput
                label="Mật khẩu mới"
                mode="outlined"
                value={newPassword}
                onChangeText={(v) => { setNewPassword(v); clearMessages(); }}
                secureTextEntry={!showNewPassword}
                left={<TextInput.Icon icon="lock-outline" />}
                right={
                  <TextInput.Icon
                    icon={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                    onPress={() => setShowNewPassword((v) => !v)}
                  />
                }
                style={styles.input}
              />
              <TextInput
                label="Xác nhận mật khẩu mới"
                mode="outlined"
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); clearMessages(); }}
                secureTextEntry={!showNewPassword}
                left={<TextInput.Icon icon="lock-check-outline" />}
                style={styles.input}
              />
            </>
          )}

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {success ? (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>{success}</Text>
            </View>
          ) : null}

          {mode === 'login' && (
            <Button
              mode="contained"
              onPress={handleLogin}
              disabled={loading}
              style={styles.button}
              buttonColor="#1B3A6B"
              contentStyle={{ height: 48 }}
            >
              {loading ? <ActivityIndicator color="#fff" size={20} /> : 'Đăng nhập'}
            </Button>
          )}

          {mode === 'forgot' && (
            <>
              <Button
                mode="contained"
                onPress={handleForgotPassword}
                disabled={loading}
                style={styles.button}
                buttonColor="#1B3A6B"
                contentStyle={{ height: 48 }}
              >
                {loading ? <ActivityIndicator color="#fff" size={20} /> : 'Gửi mã xác nhận'}
              </Button>
              <View style={styles.linkRow}>
                <TouchableOpacity onPress={switchToLogin}>
                  <Text style={styles.linkText}>← Quay lại đăng nhập</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={switchToReset}>
                  <Text style={styles.linkText}>Đã có mã? Nhập tại đây →</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {mode === 'reset' && (
            <>
              <Button
                mode="contained"
                onPress={handleResetPassword}
                disabled={loading}
                style={styles.button}
                buttonColor="#1B3A6B"
                contentStyle={{ height: 48 }}
              >
                {loading ? <ActivityIndicator color="#fff" size={20} /> : 'Đặt lại mật khẩu'}
              </Button>
              <View style={styles.linkRow}>
                <TouchableOpacity onPress={switchToLogin}>
                  <Text style={styles.linkText}>← Quay lại đăng nhập</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={switchToForgot}>
                  <Text style={styles.linkText}>Gửi lại mã</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: { alignItems: 'center' },
  logo: { width: 100, height: 100, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '600', color: '#1B3A6B' },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 32 },
  input: { width: '100%', marginBottom: 12 },
  forgotLink: { alignSelf: 'flex-end', marginBottom: 12, marginTop: -4 },
  forgotText: { fontSize: 13, color: '#1E40AF', fontWeight: '500' },
  infoBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  infoText: { flex: 1, fontSize: 13, color: '#1E40AF', lineHeight: 19 },
  errorBanner: {
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: '#991B1B', fontSize: 13, textAlign: 'center' },
  successBanner: {
    width: '100%',
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  successText: { color: '#166534', fontSize: 13, textAlign: 'center' },
  button: { width: '100%', marginTop: 4, borderRadius: 8 },
  linkRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  linkText: { fontSize: 13, color: '#1E40AF', fontWeight: '500' },
});
