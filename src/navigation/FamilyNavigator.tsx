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
import { ProfileScreen } from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const COLOR = '#2E7D32';

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DashboardMain" component={FamilyDashboardScreen} />
    <Stack.Screen name="Admissions" component={FamilyAdmissionsScreen} />
    <Stack.Screen name="Tours" component={FamilyToursScreen} />
    <Stack.Screen name="Support" component={FamilySupportScreen} />
  </Stack.Navigator>
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
    <Tab.Screen name="Wallet" component={FamilyWalletScreen} options={{ tabBarLabel: 'Ví tiền', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="wallet-outline" size={size} color={color} /> }} />
    <Tab.Screen name="Invoices" component={FamilyInvoicesScreen} options={{ tabBarLabel: 'Hóa đơn', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="receipt" size={size} color={color} /> }} />
    <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Hồ sơ', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-outline" size={size} color={color} /> }} />
  </Tab.Navigator>
);
