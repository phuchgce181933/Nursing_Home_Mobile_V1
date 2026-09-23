import React, { useMemo } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/useAuth';
import { useMyShifts } from '../../hooks/useShifts';
import { useDailyMedSchedule } from '../../hooks/useMedications';
import { useNotifications } from '../../hooks/useNotifications';
import { RoleHeader } from '../../components/layout/RoleHeader';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { useAppTheme } from '../../theme/useAppTheme';
import type { AppColors } from '../../constants/theme';

const NS = 'nurse.dashboard';

export const NurseDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { colors, roleColor } = useAppTheme('nurse');
  const styles = useMemo(() => createStyles(colors), [colors]);

  const FEATURES = [
    { icon: 'clock-outline', label: t(`${NS}.featureShifts`), screen: 'MyShifts', color: '#1565C0' },
    { icon: 'format-list-checks', label: t(`${NS}.featureTasks`), screen: 'CareTasks', color: '#2E7D32' },
    { icon: 'heart-pulse', label: t(`${NS}.featureVitals`), screen: 'Vitals', color: '#C62828' },
    { icon: 'calendar-star', label: t(`${NS}.featureActivities`), screen: 'Activities', color: '#6A1B9A' },
    { icon: 'silverware-fork-knife', label: t(`${NS}.featureMealPlans`), screen: 'MealPlans', color: '#F57F17' },
    { icon: 'chart-bar', label: t(`${NS}.featureNutrition`), screen: 'NutritionReports', color: '#00838F' },
    { icon: 'alert-outline', label: t(`${NS}.featureIncidents`), screen: 'IncidentScreen', color: '#991B1B' },
    ...(user?.role === 'nurse' || user?.role === 'doctor'
      ? [{ icon: 'clipboard-pulse-outline', label: t(`${NS}.featureInitialHealth`), screen: 'InitialHealthRecord', color: '#0F5040' }]
      : []),
    ...(user?.role === 'doctor'
      ? [{ icon: 'pill', label: t(`${NS}.featureDrugAllergies`), screen: 'DrugAllergies', color: '#B71C1C' }]
      : []),
    ...(user?.role === 'manager' || user?.role === 'admin'
      ? [
          { icon: 'account-heart-outline', label: t(`${NS}.featureVisitApprovals`), screen: 'VisitApprovals', color: '#00838F' },
          { icon: 'lifebuoy', label: t(`${NS}.featureSupportRequests`), screen: 'SupportRequests', color: '#6A1B9A' },
        ]
      : []),
  ];

  // /api/shifts/my is only authorized for doctor/nurse/caregiver/staff/pharmacist, and
  // /api/medications/schedule/daily only for doctor/nurse — manager/admin get 403s for both,
  // since this dashboard is shared across all four roles but shifts/med schedules only apply
  // to actual care staff.
  const hasShifts = user?.role === 'doctor' || user?.role === 'nurse';
  const hasMedSchedule = user?.role === 'doctor' || user?.role === 'nurse';

  const shiftsQ = useMyShifts(undefined, { enabled: hasShifts });
  const medsQ = useDailyMedSchedule(undefined, { enabled: hasMedSchedule });
  const unreadQ = useNotifications({ isRead: false, limit: 50 });
  const unreadCount = (unreadQ.data?.items ?? unreadQ.data?.data ?? []).length;

  const shifts = shiftsQ.data?.data?.data ?? [];
  const medsGroups = medsQ.data?.data ?? [];
  const allMedSchedules = Array.isArray(medsGroups) ? medsGroups.flatMap((g: any) => g.schedules ?? []) : [];
  const pendingMeds = allMedSchedules.filter((m: any) => m.status === 'PENDING' || m.status === 'OVERDUE').length;
  const upcomingShifts = shifts.filter((s: any) => s.status === 'confirmed' || s.status === 'published');
  const confirmedShifts = upcomingShifts.length;

  const refetch = () => { if (hasShifts) shiftsQ.refetch(); if (hasMedSchedule) medsQ.refetch(); unreadQ.refetch(); };
  const isFetching = shiftsQ.isFetching || medsQ.isFetching;

  const roleSubtitle = user?.role === 'doctor' ? t(`${NS}.subtitleDoctor`)
    : user?.role === 'manager' ? t(`${NS}.subtitleManager`)
    : user?.role === 'admin' ? t(`${NS}.subtitleAdmin`)
    : t(`${NS}.subtitleNurse`);

  return (
    <View style={styles.flex}>
      <RoleHeader
        title={t(`${NS}.greeting`, { name: user?.fullName ?? '' })}
        subtitle={roleSubtitle}
        stats={hasShifts || hasMedSchedule ? [
          { value: confirmedShifts, label: t(`${NS}.shiftsLabel`), icon: 'clock-outline' },
          { value: pendingMeds, label: t(`${NS}.pendingMedsLabel`), icon: 'pill' },
        ] : undefined}
        roleColor={roleColor}
        unreadCount={unreadCount}
        onPressNotifications={() => navigation.navigate('Notifications')}
      />

      <ScrollView style={styles.flex} contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={roleColor} />}>
        <ScreenLayout loading={false} error={null} onRetry={refetch}>
          <SectionHeader title={t(`${NS}.featuresTitle`)} roleColor={roleColor} />
          <View style={styles.grid}>
            {FEATURES.map(f => (
              <Pressable key={f.screen} style={styles.featureCard}
                onPress={() => navigation.navigate(f.screen)}>
                <View style={[styles.featureIcon, { backgroundColor: f.color + '15' }]}>
                  <MaterialCommunityIcons name={f.icon as any} size={26} color={f.color} />
                </View>
                <Text style={styles.featureLabel}>{f.label}</Text>
              </Pressable>
            ))}
          </View>

          {pendingMeds > 0 && (
            <>
              <SectionHeader title={t(`${NS}.alertsTitle`)} roleColor={roleColor} />
              <Card style={[styles.alertCard, { borderLeftColor: '#F59E0B' }]} mode="outlined">
                <Card.Content style={styles.alertRow}>
                  <MaterialCommunityIcons name="pill" size={24} color="#F59E0B" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertTitle}>{t(`${NS}.medsNeeded`, { count: pendingMeds })}</Text>
                    <Text style={styles.alertSub}>{t(`${NS}.medsNeededSub`)}</Text>
                  </View>
                </Card.Content>
              </Card>
            </>
          )}

          {confirmedShifts > 0 && (
            <>
              <SectionHeader title={t(`${NS}.upcomingShifts`)} roleColor={roleColor} actionLabel={t(`${NS}.viewAll`)}
                onAction={() => navigation.navigate('MyShifts')} />
              {upcomingShifts.slice(0, 3).map((s: any) => (
                <Card key={s._id} style={styles.shiftCard} mode="outlined">
                  <Card.Content style={styles.shiftRow}>
                    <MaterialCommunityIcons name="clock-outline" size={20} color={roleColor} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shiftTime}>{s.startTime ?? ''} - {s.endTime ?? ''}</Text>
                      {s.workDate ? <Text style={styles.shiftDate}>{new Date(s.workDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</Text> : null}
                      {s.location ? <Text style={styles.shiftLocation}>{s.location}</Text> : null}
                    </View>
                    <Text style={[styles.shiftStatus, { color: roleColor }]}>{s.status === 'confirmed' ? t(`${NS}.shiftConfirmed`) : s.status === 'published' ? t(`${NS}.shiftPending`) : s.status}</Text>
                  </Card.Content>
                </Card>
              ))}
            </>
          )}
        </ScreenLayout>
      </ScrollView>
    </View>
  );
};

const createStyles = (c: AppColors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.background },
  body: { padding: 16, paddingBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  featureCard: { width: '30%', alignItems: 'center', gap: 6, paddingVertical: 8 },
  featureIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  featureLabel: { fontSize: 11, fontWeight: '500', color: c.text, textAlign: 'center' },
  alertCard: { borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, backgroundColor: c.surface },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  alertTitle: { fontSize: 14, fontWeight: '600', color: '#92400E' },
  alertSub: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
  shiftCard: { borderRadius: 12, marginBottom: 6, backgroundColor: c.surface },
  shiftRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  shiftTime: { fontSize: 14, fontWeight: '500', color: c.text },
  shiftDate: { fontSize: 12, color: c.textSecondary },
  shiftLocation: { fontSize: 12, color: c.textSecondary },
  shiftStatus: { fontSize: 11, fontWeight: '500' },
});
