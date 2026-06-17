import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { Colors } from '@/constants/theme';

const ROLE_ROUTES: Record<string, string> = {
  family: '/family/dashboard',
  nurse: '/nurse',
  caregiver: '/caregiver',
  doctor: '/nurse',      // doctors share nurse UI for now
  manager: '/nurse',
  admin: '/nurse',
};

export default function HomeScreen() {
  const router = useRouter();
  const { token, user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!token || !user) {
      router.replace('/login');
      return;
    }
    const dest = ROLE_ROUTES[user.role] ?? '/login';
    router.replace(dest as any);
  }, [loading, token, user, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary }}>
      <ActivityIndicator color="#FFFFFF" size="large" />
    </View>
  );
}
