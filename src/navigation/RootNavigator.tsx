import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet, Image } from 'react-native';
import { Text, ActivityIndicator, Button } from 'react-native-paper';
import { useAuth } from '../auth/useAuth';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { NurseNavigator } from './NurseNavigator';
import { StaffNavigator } from './StaffNavigator';
import { AssistantNavigator } from './AssistantNavigator';
import { FamilyNavigator } from './FamilyNavigator';

const AuthStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();

const SplashView: React.FC = () => (
  <View style={styles.splash}>
    <Image
      source={require('../../assets/images/logo-annhien.png')}
      style={styles.splashLogo}
      resizeMode="contain"
    />
    <ActivityIndicator size="large" style={{ marginTop: 24 }} />
  </View>
);

const UnknownRoleView: React.FC = () => {
  const { logout, user } = useAuth();
  return (
    <View style={styles.splash}>
      <Text style={{ fontSize: 16, marginBottom: 8 }}>Vai trò không được hỗ trợ</Text>
      <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 24 }}>
        Vai trò "{user?.role}" chưa có giao diện trên ứng dụng này.
      </Text>
      <Button mode="outlined" onPress={logout}>Đăng xuất</Button>
    </View>
  );
};

const getRoleNavigator = (role?: string) => {
  switch (role) {
    case 'manager':
    case 'admin':
      return { name: 'NurseNav', component: NurseNavigator };
    case 'nurse':
    case 'doctor':
      return { name: 'StaffNav', component: StaffNavigator };
    case 'caregiver':
      return { name: 'AssistantNav', component: AssistantNavigator };
    case 'family':
      return { name: 'FamilyNav', component: FamilyNavigator };
    default:
      return { name: 'UnknownRole', component: UnknownRoleView };
  }
};

export const RootNavigator: React.FC = () => {
  const { token, user, isLoading } = useAuth();

  if (isLoading) return <SplashView />;

  const isAuthenticated = !!token && !!user;

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <AppStack.Navigator screenOptions={{ headerShown: false }}>
          {(() => {
            const nav = getRoleNavigator(user.role);
            return <AppStack.Screen name={nav.name} component={nav.component} />;
          })()}
        </AppStack.Navigator>
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splash: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  splashLogo: { width: 100, height: 100 },
});
