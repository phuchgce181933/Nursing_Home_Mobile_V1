import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DashboardScreen } from '../screens/nurse/DashboardScreen';
import { ResidentListScreen } from '../screens/nurse/ResidentListScreen';
import { StaffAssignmentScreen } from '../screens/nurse/StaffAssignmentScreen';
import { ShiftReportScreen } from '../screens/nurse/ShiftReportScreen';
import { LeaveRequestScreen } from '../screens/nurse/LeaveRequestScreen';
import { CareAppointmentsScreen } from '../screens/nurse/CareAppointmentsScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const COLOR = '#1B3A6B';

const ManageStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AssignmentMain" component={StaffAssignmentScreen} />
    <Stack.Screen name="LeaveRequests" component={LeaveRequestScreen} />
    <Stack.Screen name="CareAppointments" component={CareAppointmentsScreen} />
  </Stack.Navigator>
);

export const NurseNavigator: React.FC = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: COLOR,
      tabBarInactiveTintColor: '#9CA3AF',
      tabBarStyle: { borderTopColor: '#E5E7EB' },
    }}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: 'Trang chủ', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home-outline" size={size} color={color} /> }} />
    <Tab.Screen name="Residents" component={ResidentListScreen} options={{ tabBarLabel: 'Cư dân', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-group-outline" size={size} color={color} /> }} />
    <Tab.Screen name="Manage" component={ManageStack} options={{ tabBarLabel: 'Quản lý', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="clipboard-list-outline" size={size} color={color} /> }} />
    <Tab.Screen name="Reports" component={ShiftReportScreen} options={{ tabBarLabel: 'Báo cáo', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="chart-box-outline" size={size} color={color} /> }} />
    <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Hồ sơ', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-outline" size={size} color={color} /> }} />
  </Tab.Navigator>
);
