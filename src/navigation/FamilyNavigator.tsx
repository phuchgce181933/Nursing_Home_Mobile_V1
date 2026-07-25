import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { FamilyDashboardScreen } from '../screens/family/FamilyDashboardScreen';
import { FamilyHealthScreen } from '../screens/family/FamilyHealthScreen';
import { FamilyInvoicesScreen } from '../screens/family/FamilyInvoicesScreen';
import { FamilyWalletScreen } from '../screens/family/FamilyWalletScreen';
import { FamilyAdmissionsScreen } from '../screens/family/FamilyAdmissionsScreen';
import { FamilyToursScreen } from '../screens/family/FamilyToursScreen';
import { FamilyVisitsScreen } from '../screens/family/FamilyVisitsScreen';
import { FamilyResidentProfileScreen } from '../screens/family/FamilyResidentProfileScreen';
import { FamilySupportScreen } from '../screens/family/FamilySupportScreen';
import { SupportThreadScreen } from '../screens/shared/SupportThreadScreen';
import { ConversationListScreen } from '../screens/shared/ConversationListScreen';
import { ChatThreadScreen } from '../screens/shared/ChatThreadScreen';
import { NotificationsScreen } from '../screens/shared/NotificationsScreen';
import { AdmissionDetailScreen } from '../screens/family/AdmissionDetailScreen';
import { InvoiceDetailScreen } from '../screens/family/InvoiceDetailScreen';
import { BillingSummaryScreen } from '../screens/family/BillingSummaryScreen';
import { PaymentHistoryScreen } from '../screens/family/PaymentHistoryScreen';
import { FamilyMedicationsScreen } from '../screens/family/FamilyMedicationsScreen';
import { FamilyDailyCareScreen } from '../screens/family/FamilyDailyCareScreen';
import { FamilyActivitiesScreen } from '../screens/family/FamilyActivitiesScreen';
import { FamilyPhotosScreen } from '../screens/family/FamilyPhotosScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { EditProfileScreen } from '../screens/shared/EditProfileScreen';

const Tab = createBottomTabNavigator();
const HomeNavStack = createNativeStackNavigator();
const InvoiceNavStack = createNativeStackNavigator();
const WalletNavStack = createNativeStackNavigator();
const HealthNavStack = createNativeStackNavigator();
const ProfileNavStack = createNativeStackNavigator();

const COLOR = '#2E7D32';

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
    <HomeNavStack.Screen name="Messages" component={ConversationListScreen} />
    <HomeNavStack.Screen name="ChatThread" component={ChatThreadScreen} />
    <HomeNavStack.Screen name="Notifications" component={NotificationsScreen} />
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
    <HealthNavStack.Screen name="DailyCare" component={FamilyDailyCareScreen} />
    <HealthNavStack.Screen name="Activities" component={FamilyActivitiesScreen} />
    <HealthNavStack.Screen name="Photos" component={FamilyPhotosScreen} />
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
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLOR,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { borderTopColor: '#E5E7EB' },
      }}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ tabBarLabel: t('navigation.home'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home-outline" size={size} color={color} /> }} />
      <Tab.Screen name="Health" component={HealthStack} options={{ tabBarLabel: t('navigation.health'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="heart-pulse" size={size} color={color} /> }} />
      <Tab.Screen name="Wallet" component={WalletStack} options={{ tabBarLabel: t('navigation.wallet'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="wallet-outline" size={size} color={color} /> }} />
      <Tab.Screen name="Invoices" component={InvoiceStack} options={{ tabBarLabel: t('navigation.invoices'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="receipt" size={size} color={color} /> }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ tabBarLabel: t('navigation.profile'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-outline" size={size} color={color} /> }} />
    </Tab.Navigator>
  );
};
