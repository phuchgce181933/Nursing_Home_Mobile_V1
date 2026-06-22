import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { NurseHomeScreen } from '../screens/staff/NurseHomeScreen';
import { MyShiftsScreen } from '../screens/staff/MyShiftsScreen';
import { CareTasksScreen } from '../screens/staff/CareTasksScreen';
import { MedicationScreen } from '../screens/staff/MedicationScreen';
import { IncidentScreen } from '../screens/staff/IncidentScreen';
import { CareNoteListScreen } from '../screens/staff/CareNoteListScreen';
import { CreateCareNoteScreen } from '../screens/staff/CreateCareNoteScreen';
import { CareNoteDetailScreen } from '../screens/staff/CareNoteDetailScreen';
import { CareNoteHistoryScreen } from '../screens/staff/CareNoteHistoryScreen';
import { HealthMonitoringScreen } from '../screens/staff/HealthMonitoringScreen';
import { LeaveRequestScreen } from '../screens/staff/LeaveRequestScreen';
import { MealPlanViewScreen } from '../screens/staff/MealPlanViewScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { ResidentListScreen } from '../screens/nurse/ResidentListScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const COLOR = '#0F5040';

const ShiftsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MyShifts" component={MyShiftsScreen} />
    <Stack.Screen name="CareTasks" component={CareTasksScreen} />
  </Stack.Navigator>
);

const MedsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MedMain" component={MedicationScreen} />
    <Stack.Screen name="Incidents" component={IncidentScreen} />
  </Stack.Navigator>
);

const CareStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="NoteList" component={CareNoteListScreen} />
    <Stack.Screen name="CreateNote" component={CreateCareNoteScreen} />
    <Stack.Screen name="EditNote" component={CreateCareNoteScreen} />
    <Stack.Screen name="NoteDetail" component={CareNoteDetailScreen} />
    <Stack.Screen name="NoteHistory" component={CareNoteHistoryScreen} />
    <Stack.Screen name="HealthMonitoring" component={HealthMonitoringScreen} />
    <Stack.Screen name="CareTasks" component={CareTasksScreen} />
    <Stack.Screen name="LeaveRequests" component={LeaveRequestScreen} />
    <Stack.Screen name="MealPlans" component={MealPlanViewScreen} />
    <Stack.Screen name="Residents" component={ResidentListScreen} />
    <Stack.Screen name="IncidentsFromCare" component={IncidentScreen} />
  </Stack.Navigator>
);

export const StaffNavigator: React.FC = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: COLOR,
      tabBarInactiveTintColor: '#9CA3AF',
      tabBarStyle: { borderTopColor: '#E5E7EB' },
    }}
  >
    <Tab.Screen
      name="Home"
      component={NurseHomeScreen}
      options={{
        tabBarLabel: 'Trang chủ',
        tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home-outline" size={size} color={color} />,
      }}
    />
    <Tab.Screen
      name="ShiftsTab"
      component={ShiftsStack}
      options={{
        tabBarLabel: 'Ca làm',
        tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="calendar-clock" size={size} color={color} />,
      }}
    />
    <Tab.Screen
      name="MedsTab"
      component={MedsStack}
      options={{
        tabBarLabel: 'Thuốc',
        tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="pill" size={size} color={color} />,
      }}
    />
    <Tab.Screen
      name="CareTab"
      component={CareStack}
      options={{
        tabBarLabel: 'Chăm sóc',
        tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="clipboard-pulse-outline" size={size} color={color} />,
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        tabBarLabel: 'Hồ sơ',
        tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-outline" size={size} color={color} />,
      }}
    />
  </Tab.Navigator>
);
