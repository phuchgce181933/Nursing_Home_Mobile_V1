import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../theme/useAppTheme';
import { SHADOW } from '../theme/designSystem';
import { FamilyDashboardScreen } from '../screens/family/FamilyDashboardScreen';
import { FamilyHealthScreen } from '../screens/family/FamilyHealthScreen';
import { FamilyInvoicesScreen } from '../screens/family/FamilyInvoicesScreen';
import { FamilyWalletScreen } from '../screens/family/FamilyWalletScreen';
import { FamilyAdmissionsScreen } from '../screens/family/FamilyAdmissionsScreen';
import { FamilyToursScreen } from '../screens/family/FamilyToursScreen';
import { FamilyVisitsScreen } from '../screens/family/FamilyVisitsScreen';
import { FamilyResidentProfileScreen } from '../screens/family/FamilyResidentProfileScreen';
import { FamilySupportScreen } from '../screens/family/FamilySupportScreen';
import { FamilySupportChatScreen } from '../screens/family/FamilySupportChatScreen';
import { SupportThreadScreen } from '../screens/shared/SupportThreadScreen';
import { NotificationsScreen } from '../screens/shared/NotificationsScreen';
import { NotificationSettingsScreen } from '../screens/shared/NotificationSettingsScreen';
import { AdmissionDetailScreen } from '../screens/family/AdmissionDetailScreen';
import { InvoiceDetailScreen } from '../screens/family/InvoiceDetailScreen';
import { BillingSummaryScreen } from '../screens/family/BillingSummaryScreen';
import { PaymentHistoryScreen } from '../screens/family/PaymentHistoryScreen';
import { FamilyMedicationsScreen } from '../screens/family/FamilyMedicationsScreen';
import { FamilyMedicationHistoryScreen } from '../screens/family/FamilyMedicationHistoryScreen';
import { FamilyDailyCareScreen } from '../screens/family/FamilyDailyCareScreen';
import { FamilyActivitiesScreen } from '../screens/family/FamilyActivitiesScreen';
import { FamilyPhotosScreen } from '../screens/family/FamilyPhotosScreen';
import { FamilyAppointmentsScreen } from '../screens/family/FamilyAppointmentsScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { EditProfileScreen } from '../screens/shared/EditProfileScreen';

const Tab = createBottomTabNavigator();
const HomeNavStack = createNativeStackNavigator();
const InvoiceNavStack = createNativeStackNavigator();
const WalletNavStack = createNativeStackNavigator();
const HealthNavStack = createNativeStackNavigator();
const ProfileNavStack = createNativeStackNavigator();

const HomeStack = () => (
  <HomeNavStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeNavStack.Screen name="DashboardMain" component={FamilyDashboardScreen} />
    <HomeNavStack.Screen name="Admissions" component={FamilyAdmissionsScreen} />
    <HomeNavStack.Screen name="AdmissionDetail" component={AdmissionDetailScreen} />
    <HomeNavStack.Screen name="Tours" component={FamilyToursScreen} />
    <HomeNavStack.Screen name="Visits" component={FamilyVisitsScreen} />
    <HomeNavStack.Screen name="ResidentProfile" component={FamilyResidentProfileScreen} />
    <HomeNavStack.Screen name="Support" component={FamilySupportScreen} />
    <HomeNavStack.Screen name="SupportThread" component={SupportThreadScreen} />
    <HomeNavStack.Screen name="Messages" component={FamilySupportChatScreen} />
    <HomeNavStack.Screen name="Notifications" component={NotificationsScreen} />
    <HomeNavStack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
  </HomeNavStack.Navigator>
);

const InvoiceStack = () => (
  <InvoiceNavStack.Navigator screenOptions={{ headerShown: false }}>
    <InvoiceNavStack.Screen name="InvoiceList" component={FamilyInvoicesScreen} />
    <InvoiceNavStack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
    <InvoiceNavStack.Screen name="BillingSummary" component={BillingSummaryScreen} />
  </InvoiceNavStack.Navigator>
);

const WalletStack = () => (
  <WalletNavStack.Navigator screenOptions={{ headerShown: false }}>
    <WalletNavStack.Screen name="WalletMain" component={FamilyWalletScreen} />
    <WalletNavStack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
  </WalletNavStack.Navigator>
);

const HealthStack = () => (
  <HealthNavStack.Navigator screenOptions={{ headerShown: false }}>
    <HealthNavStack.Screen name="HealthMain" component={FamilyHealthScreen} />
    <HealthNavStack.Screen name="Medications" component={FamilyMedicationsScreen} />
    <HealthNavStack.Screen name="MedicationHistory" component={FamilyMedicationHistoryScreen} />
    <HealthNavStack.Screen name="DailyCare" component={FamilyDailyCareScreen} />
    <HealthNavStack.Screen name="Activities" component={FamilyActivitiesScreen} />
    <HealthNavStack.Screen name="Photos" component={FamilyPhotosScreen} />
    <HealthNavStack.Screen name="Appointments" component={FamilyAppointmentsScreen} />
  </HealthNavStack.Navigator>
);

const ProfileStack = () => (
  <ProfileNavStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileNavStack.Screen name="ProfileMain" component={ProfileScreen} />
    <ProfileNavStack.Screen name="EditProfile" component={EditProfileScreen} />
  </ProfileNavStack.Navigator>
);

export const FamilyNavigator: React.FC = () => {
  const { t } = useTranslation();
  const { roleColor } = useAppTheme('family');
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: roleColor,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarItemStyle: { paddingTop: 6 },
        // Kept docked (not `position: absolute`) rather than a fully detached floating
        // pill — an absolute tab bar removes itself from layout flow, which would clip
        // the bottom of every OTHER Family screen's content (Wallet, Health, Invoices,
        // Profile...) unless each one adds matching bottom padding. Only Home has been
        // redesigned so far, so this stays docked with a floating *look* (rounded top,
        // shadow, larger icons) until the rest of Family's screens get the same pass.
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingTop: 10,
          paddingBottom: insets.bottom + 6,
          borderTopWidth: 0,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          backgroundColor: '#FFFFFF',
          ...SHADOW.floating,
        },
      }}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ tabBarLabel: t('navigation.home'), tabBarIcon: ({ color, focused }) => <MaterialCommunityIcons name={focused ? 'home' : 'home-outline'} size={26} color={color} /> }} />
      <Tab.Screen name="Health" component={HealthStack} options={{ tabBarLabel: t('navigation.health'), tabBarIcon: ({ color }) => <MaterialCommunityIcons name="heart-pulse" size={26} color={color} /> }} />
      <Tab.Screen name="Wallet" component={WalletStack} options={{ tabBarLabel: t('navigation.wallet'), tabBarIcon: ({ color, focused }) => <MaterialCommunityIcons name={focused ? 'wallet' : 'wallet-outline'} size={26} color={color} /> }} />
      <Tab.Screen name="Invoices" component={InvoiceStack} options={{ tabBarLabel: t('navigation.invoices'), tabBarIcon: ({ color }) => <MaterialCommunityIcons name="receipt" size={26} color={color} /> }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ tabBarLabel: t('navigation.profile'), tabBarIcon: ({ color, focused }) => <MaterialCommunityIcons name={focused ? 'account' : 'account-outline'} size={26} color={color} /> }} />
    </Tab.Navigator>
  );
};
