import React, { useState, useEffect, useMemo } from 'react';
import { NavigationContainer, DefaultTheme as NavLightTheme, DarkTheme as NavDarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet, Image } from 'react-native';
import { Text, ActivityIndicator, Button } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/useAuth';
import { useAppTheme } from '../theme/useAppTheme';
import type { AppColors } from '../constants/theme';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { VerifyRegisterOtpScreen } from '../screens/auth/VerifyRegisterOtpScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';
import { GuestAdmissionRequestScreen } from '../screens/auth/GuestAdmissionRequestScreen';
import { PostRegisterAdmissionScreen } from '../screens/family/PostRegisterAdmissionScreen';
import { IntroScreen } from '../screens/public/IntroScreen';
import { ServicesScreen } from '../screens/public/ServicesScreen';
import { TechScreen } from '../screens/public/TechScreen';
import { LivingScreen } from '../screens/public/LivingScreen';
import { PricingScreen } from '../screens/public/PricingScreen';
import { NewsScreen } from '../screens/public/NewsScreen';
import { ContactScreen } from '../screens/public/ContactScreen';
import { NurseNavigator } from './NurseNavigator';
import { FamilyNavigator } from './FamilyNavigator';
import { AssistantNavigator } from './AssistantNavigator';
import { navigationRef } from './navigationRef';
import { usePushNotifications } from '../hooks/usePushNotifications';

const JUST_REGISTERED_KEY = 'justRegistered';

const AuthStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();

const SplashView: React.FC = () => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.splash}>
      <Image
        source={require('../../assets/images/logo-annhien.png')}
        style={styles.splashLogo}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" style={{ marginTop: 24 }} />
    </View>
  );
};

const UnknownRoleView: React.FC = () => {
  const { logout, user } = useAuth();
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.splash}>
      <Text style={{ fontSize: 16, marginBottom: 8, color: colors.text }}>{t('common.unsupportedRoleTitle')}</Text>
      <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 24 }}>
        {t('common.unsupportedRoleMessage', { role: user?.role })}
      </Text>
      <Button mode="outlined" onPress={logout}>{t('common.logout')}</Button>
    </View>
  );
};

// Mobile only supports nurse, caregiver, and family — doctor/manager/admin (and anything
// else) use the web system instead, so they fall through to UnknownRoleView below.
const getRoleNavigator = (role?: string) => {
  switch (role) {
    case 'nurse':
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
  const { colors, isDark } = useAppTheme();

  // Đăng ký push + gắn listener khi đã đăng nhập. Hook tự no-op trên Expo Go/emulator và khi
  // chưa cấp quyền; role dùng để điều hướng theo allowlist khi người dùng chạm vào push.
  usePushNotifications(user, token, user?.role);

  const navTheme = useMemo(() => ({
    ...(isDark ? NavDarkTheme : NavLightTheme),
    colors: {
      ...(isDark ? NavDarkTheme.colors : NavLightTheme.colors),
      background: colors.background,
      card: colors.surface,
      border: colors.border,
      text: colors.text,
    },
  }), [isDark, colors]);

  const isAuthenticated = !!token && !!user;
  const effectiveJustRegistered = isAuthenticated ? justRegistered : null;

  useEffect(() => {
    if (!isAuthenticated) return;
    AsyncStorage.getItem(JUST_REGISTERED_KEY).then((v) => setJustRegistered(v === 'true'));
  }, [isAuthenticated, user?._id]);

  const handleAdmissionFlowDone = () => {
    AsyncStorage.removeItem(JUST_REGISTERED_KEY);
    setJustRegistered(false);
  };

  // React Navigation linking config: cho phép deep-link mở thẳng màn hình ResetPassword
  // với token được truyền qua URL query. Hỗ trợ cả custom-scheme `nursinghomemobile://`
  // lẫn https universal link tương ứng với backend FRONTEND_URL /reset-password?token=...
  const linking = useMemo(
    () => ({
      prefixes: [
        'nursinghomemobile://',
        process.env.EXPO_PUBLIC_FRONTEND_URL || 'http://localhost:5173',
        'https://annhiencarehome.vn',
      ],
      config: {
        screens: {
          Login: 'login',
          ForgotPassword: 'forgot-password',
          ResetPassword: 'reset-password',
          // KHÔNG khai báo `Register` ở đây: luồng đăng ký dựa trên POST /api/auth/register-otp
          // và /api/auth/register-verify, hai endpoint này chưa tồn tại trên backend. Không có
          // chỗ nào trong app điều hướng tới RegisterScreen, nên trước đây `nursinghomemobile://register`
          // là đường vào duy nhất và nó dẫn thẳng vào một luồng chắc chắn lỗi. Bỏ mapping khiến
          // deep link đó không còn được xử lý; màn hình vẫn giữ nguyên cho tới khi backend có API.
          Welcome: '',
        },
      },
    }),
    [],
  );

  if (isLoading) return <SplashView />;
  if (isAuthenticated && effectiveJustRegistered === null) return <SplashView />;

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme} linking={linking}>
      {isAuthenticated ? (
        <AppStack.Navigator screenOptions={{ headerShown: false }}>
          {user.role === 'family' && effectiveJustRegistered ? (
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
          <AuthStack.Screen name="GuestAdmissionRequest" component={GuestAdmissionRequestScreen} />
          <AuthStack.Screen name="Intro" component={IntroScreen} />
          <AuthStack.Screen name="Services" component={ServicesScreen} />
          <AuthStack.Screen name="Tech" component={TechScreen} />
          <AuthStack.Screen name="Living" component={LivingScreen} />
          <AuthStack.Screen name="Pricing" component={PricingScreen} />
          <AuthStack.Screen name="News" component={NewsScreen} />
          <AuthStack.Screen name="Contact" component={ContactScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
};

const createStyles = (c: AppColors) => StyleSheet.create({
  splash: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },
  splashLogo: { width: 100, height: 100 },
});
