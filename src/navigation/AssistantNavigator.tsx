import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AssistantDashboardScreen } from '../screens/assistant/AssistantDashboardScreen';
import { TaskListScreen } from '../screens/assistant/TaskListScreen';
import { HygieneScreen } from '../screens/assistant/HygieneScreen';
import { MealSupportScreen } from '../screens/assistant/MealSupportScreen';
import { DailyBehaviorScreen } from '../screens/assistant/DailyBehaviorScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const COLOR = '#6B4200';

const CareStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="HygieneMain" component={HygieneScreen} />
    <Stack.Screen name="DailyBehavior" component={DailyBehaviorScreen} />
  </Stack.Navigator>
);

export const AssistantNavigator: React.FC = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: COLOR,
      tabBarInactiveTintColor: '#9CA3AF',
      tabBarStyle: { borderTopColor: '#E5E7EB' },
    }}
  >
    <Tab.Screen name="Dashboard" component={AssistantDashboardScreen} options={{ tabBarLabel: 'Trang chủ', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home-outline" size={size} color={color} /> }} />
    <Tab.Screen name="Tasks" component={TaskListScreen} options={{ tabBarLabel: 'Nhiệm vụ', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="format-list-checks" size={size} color={color} /> }} />
    <Tab.Screen name="Care" component={CareStack} options={{ tabBarLabel: 'Chăm sóc', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="hand-heart-outline" size={size} color={color} /> }} />
    <Tab.Screen name="Meals" component={MealSupportScreen} options={{ tabBarLabel: 'Bữa ăn', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="silverware-fork-knife" size={size} color={color} /> }} />
    <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Hồ sơ', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-outline" size={size} color={color} /> }} />
  </Tab.Navigator>
);
