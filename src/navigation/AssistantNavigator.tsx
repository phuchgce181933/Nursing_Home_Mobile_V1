import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../theme/useAppTheme';
import { AssistantDashboardScreen } from '../screens/assistant/AssistantDashboardScreen';
import { TaskListScreen } from '../screens/assistant/TaskListScreen';
import { HygieneScreen } from '../screens/assistant/HygieneScreen';
import { MealSupportScreen } from '../screens/assistant/MealSupportScreen';
import { DailyBehaviorScreen } from '../screens/assistant/DailyBehaviorScreen';
import { RoomStatusScreen } from '../screens/assistant/RoomStatusScreen';
import { CarePlansScreen } from '../screens/assistant/CarePlansScreen';
import { PhotoUploadScreen } from '../screens/assistant/PhotoUploadScreen';
import { MyShiftsScreen } from '../screens/assistant/MyShiftsScreen';
import { LeaveRequestScreen } from '../screens/assistant/LeaveRequestScreen';
import { DietPlansScreen } from '../screens/assistant/DietPlansScreen';
import { RehabilitationScheduleScreen } from '../screens/assistant/RehabilitationScheduleScreen';
import { AssignedResidentsScreen } from '../screens/assistant/AssignedResidentsScreen';
import { VitalSignsScreen } from '../screens/nurse/VitalSignsScreen';
import { ActivityScheduleScreen } from '../screens/nurse/ActivityScheduleScreen';
import { IncidentScreen } from '../screens/nurse/IncidentScreen';
import { CareNoteListScreen as AssistantCareNoteListScreen } from '../screens/assistant/CareNoteListScreen';
import { EditCareNoteScreen } from '../screens/nurse/EditCareNoteScreen';
import { ConversationListScreen } from '../screens/shared/ConversationListScreen';
import { ChatThreadScreen } from '../screens/shared/ChatThreadScreen';
import { NotificationsScreen } from '../screens/shared/NotificationsScreen';
import { NotificationSettingsScreen } from '../screens/shared/NotificationSettingsScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { EditProfileScreen } from '../screens/shared/EditProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const ProfileNavStack = createNativeStackNavigator();

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AssistantHome" component={AssistantDashboardScreen} />
    <Stack.Screen name="TaskList" component={TaskListScreen} />
    <Stack.Screen name="RoomStatus" component={RoomStatusScreen} />
    <Stack.Screen name="Vitals" component={VitalSignsScreen} />
    <Stack.Screen name="MyShifts" component={MyShiftsScreen} />
    {/* Lịch hoạt động dùng chung với y tá; truyền role để tô màu nâu hộ lý (§25). */}
    <Stack.Screen name="Activities" component={ActivityScheduleScreen} initialParams={{ role: 'caregiver' }} />
    <Stack.Screen name="LeaveRequests" component={LeaveRequestScreen} />
    <Stack.Screen name="DietPlans" component={DietPlansScreen} />
    <Stack.Screen name="RehabSchedule" component={RehabilitationScheduleScreen} />
    <Stack.Screen name="AssignedResidents" component={AssignedResidentsScreen} />
    <Stack.Screen name="CareNotes" component={AssistantCareNoteListScreen} />
    <Stack.Screen name="EditNote" component={EditCareNoteScreen} />
    <Stack.Screen name="Messages" component={ConversationListScreen} />
    <Stack.Screen name="ChatThread" component={ChatThreadScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
  </Stack.Navigator>
);

const CareStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Hygiene" component={HygieneScreen} />
    <Stack.Screen name="MealSupport" component={MealSupportScreen} />
    <Stack.Screen name="DailyBehavior" component={DailyBehaviorScreen} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <ProfileNavStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileNavStack.Screen name="ProfileMain" component={ProfileScreen} />
    <ProfileNavStack.Screen name="EditProfile" component={EditProfileScreen} />
  </ProfileNavStack.Navigator>
);

export const AssistantNavigator: React.FC = () => {
  const { t } = useTranslation();
  const { colors, roleColor } = useAppTheme('caregiver');
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: roleColor,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarLabel: t('navigation.home'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Care"
        component={CareStack}
        options={{
          tabBarLabel: t('navigation.care'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="hand-heart-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="CarePlans"
        component={CarePlansScreen}
        options={{
          tabBarLabel: t('navigation.carePlans'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="clipboard-text-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Photos"
        component={PhotoUploadScreen}
        options={{
          tabBarLabel: t('navigation.photos'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="image-multiple-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Incidents"
        component={IncidentScreen}
        options={{
          tabBarLabel: t('navigation.incidents'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="alert-circle-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarLabel: t('navigation.profile'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-outline" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};
