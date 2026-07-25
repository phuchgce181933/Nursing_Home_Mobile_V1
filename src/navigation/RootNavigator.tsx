import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet, Image } from 'react-native';
import { Text, ActivityIndicator, Button } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../auth/useAuth';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { VerifyRegisterOtpScreen } from '../screens/auth/VerifyRegisterOtpScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';
import { PostRegisterAdmissionScreen } from '../screens/family/PostRegisterAdmissionScreen';
import { NurseNavigator } from './NurseNavigator';
import { FamilyNavigator } from './FamilyNavigator';
import { AssistantNavigator } from './AssistantNavigator';

const JUST_REGISTERED_KEY = 'justRegistered';

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
    case 'nurse':
    case 'doctor':
    case 'manager':
    case 'admin':
      return { name: 'NurseNav', component: NurseNavigator };
    case 'family':
      return { name: 'FamilyNav', component: FamilyNavigator };
    case 'caregiver':
      return { name: 'AssistantNav', component: AssistantNavigator };
    default:
      return { name: 'UnknownRole', component: UnknownRoleView };
  }
};

export const RootNavigator: React.FC = () => {
  const { token, user, isLoading } = useAuth();
  const [justRegistered, setJustRegistered] = useState<boolean | null>(null);

  const isAuthenticated = !!token && !!user;

  useEffect(() => {
    if (!isAuthenticated) { setJustRegistered(null); return; }
    AsyncStorage.getItem(JUST_REGISTERED_KEY).then((v) => setJustRegistered(v === 'true'));
  }, [isAuthenticated, user?._id]);

  const handleAdmissionFlowDone = () => {
    AsyncStorage.removeItem(JUST_REGISTERED_KEY);
    setJustRegistered(false);
  };

  if (isLoading) return <SplashView />;
  if (isAuthenticated && justRegistered === null) return <SplashView />;

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <AppStack.Navigator screenOptions={{ headerShown: false }}>
          {user.role === 'family' && justRegistered ? (
            <AppStack.Screen name="PostRegisterAdmission">
              {() => <PostRegisterAdmissionScreen onDone={handleAdmissionFlowDone} />}
            </AppStack.Screen>
          ) : (() => {
            const nav = getRoleNavigator(user.role);
            return <AppStack.Screen name={nav.name} component={nav.component} />;
          })()}
        </AppStack.Navigator>
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
          <AuthStack.Screen name="VerifyRegisterOtp" component={VerifyRegisterOtpScreen} />
          <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splash: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  splashLogo: { width: 100, height: 100 },
});
