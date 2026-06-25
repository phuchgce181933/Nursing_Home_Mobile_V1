import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FamilyDashboardScreen } from '../screens/family/FamilyDashboardScreen';
import { FamilyHealthScreen } from '../screens/family/FamilyHealthScreen';
import { FamilyInvoicesScreen } from '../screens/family/FamilyInvoicesScreen';
import { FamilyWalletScreen } from '../screens/family/FamilyWalletScreen';
import { FamilyAdmissionsScreen } from '../screens/family/FamilyAdmissionsScreen';
import { FamilyToursScreen } from '../screens/family/FamilyToursScreen';
import { FamilySupportScreen } from '../screens/family/FamilySupportScreen';
import { AdmissionDetailScreen } from '../screens/family/AdmissionDetailScreen';
import { InvoiceDetailScreen } from '../screens/family/InvoiceDetailScreen';
import { BillingSummaryScreen } from '../screens/family/BillingSummaryScreen';
import { PaymentHistoryScreen } from '../screens/family/PaymentHistoryScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();
const HomeNavStack = createNativeStackNavigator();
const InvoiceNavStack = createNativeStackNavigator();
const WalletNavStack = createNativeStackNavigator();

const COLOR = '#2E7D32';

const HomeStack = () => (
  <HomeNavStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeNavStack.Screen name="DashboardMain" component={FamilyDashboardScreen} />
    <HomeNavStack.Screen name="Admissions" component={FamilyAdmissionsScreen} />
    <HomeNavStack.Screen name="AdmissionDetail" component={AdmissionDetailScreen} />
    <HomeNavStack.Screen name="Tours" component={FamilyToursScreen} />
    <HomeNavStack.Screen name="Support" component={FamilySupportScreen} />
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

export const FamilyNavigator: React.FC = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: COLOR,
      tabBarInactiveTintColor: '#9CA3AF',
      tabBarStyle: { borderTopColor: '#E5E7EB' },
    }}
  >
    <Tab.Screen name="Home" component={HomeStack} options={{ tabBarLabel: 'Trang chủ', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home-outline" size={size} color={color} /> }} />
    <Tab.Screen name="Health" component={FamilyHealthScreen} options={{ tabBarLabel: 'Sức khỏe', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="heart-pulse" size={size} color={color} /> }} />
    <Tab.Screen name="Wallet" component={WalletStack} options={{ tabBarLabel: 'Ví tiền', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="wallet-outline" size={size} color={color} /> }} />
    <Tab.Screen name="Invoices" component={InvoiceStack} options={{ tabBarLabel: 'Hóa đơn', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="receipt" size={size} color={color} /> }} />
    <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Hồ sơ', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-outline" size={size} color={color} /> }} />
  </Tab.Navigator>
);
