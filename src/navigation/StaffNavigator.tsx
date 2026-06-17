import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NurseDashboardScreen } from '../screens/staff/NurseDashboardScreen';
import { ResidentListScreen } from '../screens/nurse/ResidentListScreen';
import { MedicationScreen } from '../screens/staff/MedicationScreen';
import { CreateCareNoteScreen } from '../screens/staff/CreateCareNoteScreen';
import { CareNoteListScreen } from '../screens/staff/CareNoteListScreen';
import { IncidentScreen } from '../screens/staff/IncidentScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const COLOR = '#0F5040';

const NoteStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="NoteList" component={CareNoteListScreen} />
    <Stack.Screen name="CreateNote" component={CreateCareNoteScreen} />
  </Stack.Navigator>
);

const MedStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MedMain" component={MedicationScreen} />
    <Stack.Screen name="Incidents" component={IncidentScreen} />
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
    <Tab.Screen name="Dashboard" component={NurseDashboardScreen} options={{ tabBarLabel: 'Trang chủ', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home-outline" size={size} color={color} /> }} />
    <Tab.Screen name="Residents" component={ResidentListScreen} options={{ tabBarLabel: 'Cư dân', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-group-outline" size={size} color={color} /> }} />
    <Tab.Screen name="Medications" component={MedStack} options={{ tabBarLabel: 'Thuốc', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="pill" size={size} color={color} /> }} />
    <Tab.Screen name="CareNotes" component={NoteStack} options={{ tabBarLabel: 'Ghi chú', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="note-edit-outline" size={size} color={color} /> }} />
    <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Hồ sơ', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-outline" size={size} color={color} /> }} />
  </Tab.Navigator>
);
