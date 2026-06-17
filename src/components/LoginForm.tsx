import { useRef, useState } from 'react';
import { StyleSheet, TextInput, Pressable } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type Props = {
  onSubmit: (email: string, password: string) => Promise<void>;
};

export function LoginForm({ onSubmit }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const handlePress = async () => {
    setError(null);
    setBusy(true);
    try {
      await onSubmit(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Family Login
      </ThemedText>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        blurOnSubmit={false}
      />
      <TextInput
        ref={passwordRef}
        style={styles.input}
        placeholder="Mật khẩu"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        returnKeyType="go"
        onSubmitEditing={handlePress}
      />
      {error ? <ThemedText type="smallBold" style={styles.error}>{error}</ThemedText> : null}
      <Pressable onPress={handlePress} style={[styles.button, busy && styles.buttonDisabled]} disabled={busy}>
        <ThemedText type="smallBold" style={styles.buttonText}>
          {busy ? 'Đang xác thực...' : 'Đăng nhập'}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 420,
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  title: {
    textAlign: 'center',
  },
  input: {
    height: 48,
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    color: '#000',
    backgroundColor: '#fff',
  },
  button: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3c87f7',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
  },
  error: {
    color: '#c53030',
  },
});
