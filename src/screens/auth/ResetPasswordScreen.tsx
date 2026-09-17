import React, { useRef, useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TextInput as RNTextInput } from 'react-native';
import { Text, TextInput, Button, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { AUTH } from '../../api/endpoints';

const COLOR = '#1B3A6B';
const NS = 'resetPassword';

export const ResetPasswordScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const newPasswordRef = useRef<RNTextInput>(null);
  const confirmPasswordRef = useRef<RNTextInput>(null);

  const handleSubmit = async () => {
    if (!token.trim()) {
      setError(t(`${NS}.warnTokenRequired`));
      return;
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
      await api.post(AUTH.RESET_PASSWORD, { token: token.trim(), newPassword });
      setSuccess(true);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 400) setError(t(`${NS}.errorInvalidToken`));
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
              <Text style={styles.subtitle}>{t(`${NS}.subtitle`)}</Text>

              <TextInput
                label={t(`${NS}.tokenLabel`)}
                mode="outlined"
                value={token}
                onChangeText={setToken}
                autoCapitalize="none"
                multiline
                placeholder={t(`${NS}.tokenPlaceholder`)}
                left={<TextInput.Icon icon="key-outline" />}
                style={styles.input}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => newPasswordRef.current?.focus()}
              />

              <TextInput
                ref={newPasswordRef}
                label={t(`${NS}.newPasswordLabel`)}
                mode="outlined"
                value={newPassword}
                onChangeText={setNewPassword}
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
