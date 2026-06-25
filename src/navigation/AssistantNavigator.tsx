import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AssistantDashboardScreen } from '../screens/assistant/AssistantDashboardScreen';
import { TaskListScreen } from '../screens/assistant/TaskListScreen';
import { HygieneScreen } from '../screens/assistant/HygieneScreen';
import { MealSupportScreen } from '../screens/assistant/MealSupportScreen';
import { DailyBehaviorScreen } from '../screens/assistant/DailyBehaviorScreen';
import { RoomStatusScreen } from '../screens/assistant/RoomStatusScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const COLOR = '#6B4200';

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AssistantHome" component={AssistantDashboardScreen} />
    <Stack.Screen name="TaskList" component={TaskListScreen} />
    <Stack.Screen name="RoomStatus" component={RoomStatusScreen} />
  </Stack.Navigator>
);

const CareStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Hygiene" component={HygieneScreen} />
    <Stack.Screen name="MealSupport" component={MealSupportScreen} />
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
    <Tab.Screen
      name="Home"
      component={HomeStack}
      options={{
        tabBarLabel: 'Trang chủ',
        tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home-outline" size={size} color={color} />,
      }}
    />
    <Tab.Screen
      name="Care"
      component={CareStack}
      options={{
        tabBarLabel: 'Chăm sóc',
        tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="hand-heart-outline" size={size} color={color} />,
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
