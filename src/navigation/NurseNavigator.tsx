import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { NurseDashboardScreen } from '../screens/nurse/NurseDashboardScreen';
import { ResidentListScreen } from '../screens/nurse/ResidentListScreen';
import { MedicationScreen } from '../screens/nurse/MedicationScreen';
import { CreateCareNoteScreen } from '../screens/nurse/CreateCareNoteScreen';
import { CareNoteListScreen } from '../screens/nurse/CareNoteListScreen';
import { EditCareNoteScreen } from '../screens/nurse/EditCareNoteScreen';
import { CareNoteHistoryScreen } from '../screens/nurse/CareNoteHistoryScreen';
import { IncidentScreen } from '../screens/nurse/IncidentScreen';
import { VitalSignsScreen } from '../screens/nurse/VitalSignsScreen';
import { MyShiftsScreen } from '../screens/nurse/MyShiftsScreen';
import { NurseLeaveRequestScreen } from '../screens/nurse/NurseLeaveRequestScreen';
import { CareTasksScreen } from '../screens/nurse/CareTasksScreen';
import { ActivityScheduleScreen } from '../screens/nurse/ActivityScheduleScreen';
import { MealPlansScreen } from '../screens/nurse/MealPlansScreen';
import { NutritionReportsScreen } from '../screens/nurse/NutritionReportsScreen';
import { AdmissionListScreen } from '../screens/nurse/AdmissionListScreen';
import { AdmissionDetailScreen } from '../screens/nurse/AdmissionDetailScreen';
import { InitialHealthRecordScreen } from '../screens/nurse/InitialHealthRecordScreen';
import { DrugAllergiesScreen } from '../screens/nurse/DrugAllergiesScreen';
import { ShiftReportScreen } from '../screens/nurse/ShiftReportScreen';
import { CareAppointmentsScreen } from '../screens/nurse/CareAppointmentsScreen';
import { VisitApprovalsScreen } from '../screens/nurse/VisitApprovalsScreen';
import { SupportRequestsScreen } from '../screens/nurse/SupportRequestsScreen';
import { SupportThreadScreen } from '../screens/shared/SupportThreadScreen';
import { ConversationListScreen } from '../screens/shared/ConversationListScreen';
import { ChatThreadScreen } from '../screens/shared/ChatThreadScreen';
import { NotificationsScreen } from '../screens/shared/NotificationsScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { EditProfileScreen } from '../screens/shared/EditProfileScreen';

const Tab = createBottomTabNavigator();
const DashStack = createNativeStackNavigator();
const NoteNavStack = createNativeStackNavigator();
const MedNavStack = createNativeStackNavigator();
const ProfileNavStack = createNativeStackNavigator();

const COLOR = '#0F5040';

const DashboardStack = () => (
  <DashStack.Navigator screenOptions={{ headerShown: false }}>
    <DashStack.Screen name="DashboardMain" component={NurseDashboardScreen} />
    <DashStack.Screen name="MyShifts" component={MyShiftsScreen} />
    <DashStack.Screen name="LeaveRequests" component={NurseLeaveRequestScreen} />
    <DashStack.Screen name="CareTasks" component={CareTasksScreen} />
    <DashStack.Screen name="Vitals" component={VitalSignsScreen} />
    <DashStack.Screen name="Activities" component={ActivityScheduleScreen} />
    <DashStack.Screen name="MealPlans" component={MealPlansScreen} />
    <DashStack.Screen name="NutritionReports" component={NutritionReportsScreen} />
    <DashStack.Screen name="Admissions" component={AdmissionListScreen} />
    <DashStack.Screen name="AdmissionDetail" component={AdmissionDetailScreen} />
    <DashStack.Screen name="InitialHealthRecord" component={InitialHealthRecordScreen} />
    <DashStack.Screen name="DrugAllergies" component={DrugAllergiesScreen} />
    <DashStack.Screen name="IncidentScreen" component={IncidentScreen} />
    <DashStack.Screen name="ShiftReport" component={ShiftReportScreen} />
    <DashStack.Screen name="CareAppointments" component={CareAppointmentsScreen} />
    <DashStack.Screen name="VisitApprovals" component={VisitApprovalsScreen} />
    <DashStack.Screen name="SupportRequests" component={SupportRequestsScreen} />
    <DashStack.Screen name="SupportThread" component={SupportThreadScreen} />
    <DashStack.Screen name="Messages" component={ConversationListScreen} />
    <DashStack.Screen name="ChatThread" component={ChatThreadScreen} />
    <DashStack.Screen name="Notifications" component={NotificationsScreen} />
  </DashStack.Navigator>
);

const NoteStack = () => (
  <NoteNavStack.Navigator screenOptions={{ headerShown: false }}>
    <NoteNavStack.Screen name="NoteList" component={CareNoteListScreen} />
    <NoteNavStack.Screen name="CreateNote" component={CreateCareNoteScreen} />
    <NoteNavStack.Screen name="EditNote" component={EditCareNoteScreen} />
    <NoteNavStack.Screen name="NoteHistory" component={CareNoteHistoryScreen} />
  </NoteNavStack.Navigator>
);

const MedStack = () => (
  <MedNavStack.Navigator screenOptions={{ headerShown: false }}>
    <MedNavStack.Screen name="MedMain" component={MedicationScreen} />
    <MedNavStack.Screen name="Incidents" component={IncidentScreen} />
  </MedNavStack.Navigator>
);

const ProfileStack = () => (
  <ProfileNavStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileNavStack.Screen name="ProfileMain" component={ProfileScreen} />
    <ProfileNavStack.Screen name="EditProfile" component={EditProfileScreen} />
  </ProfileNavStack.Navigator>
);

export const NurseNavigator: React.FC = () => {
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
      <Tab.Screen name="Dashboard" component={DashboardStack} options={{ tabBarLabel: t('navigation.home'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home-outline" size={size} color={color} /> }} />
      <Tab.Screen name="Residents" component={ResidentListScreen} options={{ tabBarLabel: t('navigation.residents'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-group-outline" size={size} color={color} /> }} />
      <Tab.Screen name="Medications" component={MedStack} options={{ tabBarLabel: t('navigation.medications'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="pill" size={size} color={color} /> }} />
      <Tab.Screen name="CareNotes" component={NoteStack} options={{ tabBarLabel: t('navigation.careNotes'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="note-edit-outline" size={size} color={color} /> }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ tabBarLabel: t('navigation.profile'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-outline" size={size} color={color} /> }} />
    </Tab.Navigator>
  );
};
