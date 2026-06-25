import React from 'react';
import { ScrollView, View, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../auth/useAuth';
import { useMyShifts } from '../../hooks/useShifts';
import { useDailyMedSchedule } from '../../hooks/useMedications';
import { RoleHeader } from '../../components/layout/RoleHeader';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { SectionHeader } from '../../components/layout/SectionHeader';

const COLOR = '#0F5040';

type FeatureItem = { icon: string; label: string; screen: string; color: string };

const FEATURES: FeatureItem[] = [
  { icon: 'clock-outline', label: 'Ca trực', screen: 'MyShifts', color: '#1565C0' },
  { icon: 'calendar-remove-outline', label: 'Nghỉ phép', screen: 'LeaveRequests', color: '#E65100' },
  { icon: 'format-list-checks', label: 'Nhiệm vụ', screen: 'CareTasks', color: '#2E7D32' },
  { icon: 'heart-pulse', label: 'Sinh hiệu', screen: 'Vitals', color: '#C62828' },
  { icon: 'calendar-star', label: 'Hoạt động', screen: 'Activities', color: '#6A1B9A' },
  { icon: 'silverware-fork-knife', label: 'Kế hoạch ăn', screen: 'MealPlans', color: '#F57F17' },
  { icon: 'chart-bar', label: 'Dinh dưỡng', screen: 'NutritionReports', color: '#00838F' },
  { icon: 'account-plus-outline', label: 'Nhập viện', screen: 'Admissions', color: '#4E342E' },
  { icon: 'alert-outline', label: 'Sự cố', screen: 'IncidentScreen', color: '#991B1B' },
  { icon: 'calendar-check-outline', label: 'Cuộc hẹn', screen: 'CareAppointments', color: '#0277BD' },
];

export const NurseDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();

  const shiftsQ = useMyShifts();
  const medsQ = useDailyMedSchedule();

  const shifts = shiftsQ.data?.data?.data ?? [];
  const medsGroups = medsQ.data?.data ?? [];
  const allMedSchedules = Array.isArray(medsGroups) ? medsGroups.flatMap((g: any) => g.schedules ?? []) : [];
  const pendingMeds = allMedSchedules.filter((m: any) => m.status === 'PENDING' || m.status === 'OVERDUE').length;
  const upcomingShifts = shifts.filter((s: any) => s.status === 'confirmed' || s.status === 'published');
  const confirmedShifts = upcomingShifts.length;

  const refetch = () => { shiftsQ.refetch(); medsQ.refetch(); };

  return (
    <View style={styles.flex}>
      <RoleHeader
        title={`Xin chào, ${user?.fullName ?? ''}`}
        subtitle={`${user?.role === 'doctor' ? 'Bác sĩ' : 'Y tá'} · Nursing Home`}
        stats={[
          { value: confirmedShifts, label: 'Ca trực' },
          { value: pendingMeds, label: 'Thuốc chờ' },
        ]}
        roleColor={COLOR}
      />

      <ScrollView style={styles.flex} contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={COLOR} />}>
        <ScreenLayout loading={false} error={null} onRetry={refetch}>
          <SectionHeader title="Chức năng" roleColor={COLOR} />
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
              <SectionHeader title="Cảnh báo" roleColor={COLOR} />
              <Card style={[styles.alertCard, { borderLeftColor: '#F59E0B' }]} mode="outlined">
                <Card.Content style={styles.alertRow}>
                  <MaterialCommunityIcons name="pill" size={24} color="#F59E0B" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertTitle}>{pendingMeds} thuốc cần phát</Text>
                    <Text style={styles.alertSub}>Kiểm tra tab Thuốc để phát thuốc cho cư dân</Text>
                  </View>
                </Card.Content>
              </Card>
            </>
          )}

          {confirmedShifts > 0 && (
            <>
              <SectionHeader title="Ca trực sắp tới" roleColor={COLOR} actionLabel="Xem tất cả"
                onAction={() => navigation.navigate('MyShifts')} />
              {upcomingShifts.slice(0, 3).map((s: any) => (
                <Card key={s._id} style={styles.shiftCard} mode="outlined">
                  <Card.Content style={styles.shiftRow}>
                    <MaterialCommunityIcons name="clock-outline" size={20} color={COLOR} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shiftTime}>{s.startTime ?? ''} - {s.endTime ?? ''}</Text>
                      {s.date ? <Text style={styles.shiftDate}>{new Date(s.date).toLocaleDateString('vi-VN')}</Text> : null}
                      {s.location ? <Text style={styles.shiftLocation}>{s.location}</Text> : null}
                    </View>
                    <Text style={styles.shiftStatus}>{s.status === 'confirmed' ? 'Đã xác nhận' : s.status === 'published' ? 'Chờ xác nhận' : s.status}</Text>
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

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 16, paddingBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  featureCard: { width: '30%', alignItems: 'center', gap: 6, paddingVertical: 8 },
  featureIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  featureLabel: { fontSize: 11, fontWeight: '500', color: '#374151', textAlign: 'center' },
  alertCard: { borderRadius: 12, marginBottom: 12, borderLeftWidth: 4 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  alertTitle: { fontSize: 14, fontWeight: '600', color: '#92400E' },
  alertSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  shiftCard: { borderRadius: 12, marginBottom: 6, backgroundColor: '#fff' },
  shiftRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  shiftTime: { fontSize: 14, fontWeight: '500', color: '#111827' },
  shiftDate: { fontSize: 12, color: '#6B7280' },
  shiftLocation: { fontSize: 12, color: '#6B7280' },
  shiftStatus: { fontSize: 11, color: COLOR, fontWeight: '500' },
});
