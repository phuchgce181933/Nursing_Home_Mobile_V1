import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { Text, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import api from '../../api/axiosInstance';
import { AUTH } from '../../api/endpoints';
import { useAuth } from '../../auth/useAuth';

export const LoginScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Vui lòng nhập email và mật khẩu');
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
        if (msg.toLowerCase().includes('inactive')) setError('Tài khoản đã bị vô hiệu hóa');
        else if (msg.toLowerCase().includes('banned')) setError('Tài khoản đã bị khóa');
        else setError('Sai tên đăng nhập hoặc mật khẩu');
      }
      else if (status === 403) setError('Tài khoản không có quyền truy cập');
      else setError('Không thể kết nối. Kiểm tra mạng.');
    } finally {
      setLoading(false);
    }
  };

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
          <Text style={styles.subtitle}>Hệ thống quản lý viện dưỡng lão</Text>

          <TextInput
            label="Email"
            mode="outlined"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            left={<TextInput.Icon icon="email-outline" />}
            style={styles.input}
          />

          <TextInput
            label="Mật khẩu"
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
            {loading ? <ActivityIndicator color="#fff" size={20} /> : 'Đăng nhập'}
          </Button>
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
});
