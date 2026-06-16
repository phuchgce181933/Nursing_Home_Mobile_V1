import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, SafeAreaView } from 'react-native';

import { LoginForm } from '@/components/LoginForm';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/hooks/use-auth';
import { Spacing, MaxContentWidth } from '@/constants/theme';

function LoginScreenContent() {
  const router = useRouter();
  const { token, user, login } = useAuth();

  useEffect(() => {
    if (token && user?.role === 'family') {
      router.replace('/family/dashboard');
    }
  }, [token, user, router]);

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.card}>
          <LoginForm onSubmit={login} />
        </ThemedView>
      </SafeAreaView>
    </ScrollView>
  );
}

export default function LoginScreen() {
  return <LoginScreenContent />;
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  safeArea: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#f7f8fc',
    borderRadius: Spacing.four,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 4,
  },
});
