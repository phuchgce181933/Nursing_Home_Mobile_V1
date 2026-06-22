import React from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../auth/useAuth';
import { RoleHeader } from '../../components/layout/RoleHeader';
import { useMyShifts } from '../../hooks/useShifts';
import { useDailyMedSchedule } from '../../hooks/useMedications';
import { useIncidents } from '../../hooks/useIncidents';
import { StatusBadge } from '../../components/shared/StatusBadge';

const COLOR = '#0F5040';
const today = () => new Date().toISOString().split('T')[0];

export const NurseHomeScreen: React.FC = () => {
  const { user } = useAuth();
  const nav = useNavigation<any>();

  const shiftsQ = useMyShifts({ fromDate: today(), toDate: today() });
  const medsQ = useDailyMedSchedule({ date: today() });
  const incidentsQ = useIncidents({ status: 'open' });

  const todayShifts = shiftsQ.data?.data ?? shiftsQ.data ?? [];
  const medGroups = medsQ.data ?? [];
  const allMeds = Array.isArray(medGroups) ? medGroups.flatMap((g: any) => g.schedules ?? []) : [];
  const pendingMeds = allMeds.filter((m: any) => m.status === 'PENDING' || m.status === 'OVERDUE').length;
  const overdueMeds = allMeds.filter((m: any) => m.status === 'OVERDUE').length;
  const openIncidents = (incidentsQ.data?.data ?? incidentsQ.data ?? []).length;

  const isLoading = shiftsQ.isLoading || medsQ.isLoading;
  const refetchAll = () => { shiftsQ.refetch(); medsQ.refetch(); incidentsQ.refetch(); };

  const quickActions = [
    { icon: 'calendar-clock', label: 'Ca làm', color: '#1E40AF', bg: '#DBEAFE', nav: 'ShiftsTab' },
    { icon: 'pill', label: 'Phát thuốc', color: '#92400E', bg: '#FFEDD5', nav: 'MedsTab' },
    { icon: 'heart-pulse', label: 'Sức khỏe', color: '#991B1B', bg: '#FEE2E2', nav: 'CareTab', screen: 'HealthMonitoring' },
    { icon: 'note-edit-outline', label: 'Ghi chú', color: '#065F46', bg: '#D1FAE5', nav: 'CareTab', screen: 'NoteList' },
    { icon: 'clipboard-list-outline', label: 'Nhiệm vụ', color: '#6B4200', bg: '#FEF3C7', nav: 'CareTab', screen: 'CareTasks' },
    { icon: 'calendar-remove', label: 'Nghỉ phép', color: '#7C3AED', bg: '#EDE9FE', nav: 'CareTab', screen: 'LeaveRequests' },
  ];

  return (
    <View style={styles.flex}>
      <RoleHeader
        title={`Xin chào, ${user?.fullName?.split(' ').pop() ?? 'Y tá'}`}
        subtitle={new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
        stats={[
          { value: todayShifts.length, label: 'Ca hôm nay' },
          { value: pendingMeds, label: 'Thuốc chờ' },
          { value: openIncidents, label: 'Sự cố mở' },
        ]}
        roleColor={COLOR}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetchAll} tintColor={COLOR} />}
      >
        {overdueMeds > 0 && (
          <Card style={styles.alertCard} mode="outlined">
            <Card.Content style={styles.alertRow}>
              <MaterialCommunityIcons name="alert-circle" size={20} color="#DC2626" />
              <Text style={styles.alertText}>{overdueMeds} thuốc quá hạn cần xử lý ngay</Text>
            </Card.Content>
          </Card>
        )}

        <Text style={styles.sectionTitle}>Thao tác nhanh</Text>
        <View style={styles.actionGrid}>
          {quickActions.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={styles.actionItem}
              onPress={() => {
                if (a.screen) {
                  nav.navigate(a.nav, { screen: a.screen });
                } else {
                  nav.navigate(a.nav);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: a.bg }]}>
                <MaterialCommunityIcons name={a.icon as any} size={22} color={a.color} />
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {todayShifts.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Ca làm hôm nay</Text>
            {todayShifts.slice(0, 3).map((shift: any) => (
              <Card key={shift._id} style={styles.shiftCard} mode="outlined">
                <Card.Content style={styles.shiftRow}>
                  <View style={styles.shiftIcon}>
                    <MaterialCommunityIcons name="clock-outline" size={20} color={COLOR} />
                  </View>
                  <View style={styles.shiftInfo}>
                    <Text style={styles.shiftTime}>
                      {shift.startTime} - {shift.endTime}
                    </Text>
                    <Text style={styles.shiftMeta}>
                      {shift.shiftType?.replace(/_/g, ' ') ?? 'Ca làm'} · {shift.location ?? ''}
                    </Text>
                  </View>
                  <StatusBadge status={shift.status} size="sm" />
                </Card.Content>
              </Card>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>Tổng quan thuốc hôm nay</Text>
        <View style={styles.medStatsRow}>
          {[
            { label: 'Tổng', value: allMeds.length, color: '#374151' },
            { label: 'Chờ', value: allMeds.filter((m: any) => m.status === 'PENDING').length, color: '#92400E' },
            { label: 'Đã cho', value: allMeds.filter((m: any) => m.status === 'TAKEN' || m.status === 'LATE_TAKEN').length, color: '#065F46' },
            { label: 'Quá hạn', value: overdueMeds, color: '#DC2626' },
          ].map((s) => (
            <View key={s.label} style={styles.medStatItem}>
              <Text style={[styles.medStatValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.medStatLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  scroll: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginTop: 20, marginBottom: 10 },
  alertCard: { borderRadius: 12, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2', marginBottom: 4 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  alertText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#DC2626' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionItem: { width: '30%', alignItems: 'center', gap: 6 },
  actionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 11, fontWeight: '600', color: '#374151', textAlign: 'center' },
  shiftCard: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  shiftRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shiftIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  shiftInfo: { flex: 1 },
  shiftTime: { fontSize: 14, fontWeight: '600', color: '#111827' },
  shiftMeta: { fontSize: 12, color: '#6B7280', marginTop: 2, textTransform: 'capitalize' },
  medStatsRow: { flexDirection: 'row', gap: 8 },
  medStatItem: { flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  medStatValue: { fontSize: 20, fontWeight: '700' },
  medStatLabel: { fontSize: 10, color: '#6B7280', marginTop: 2 },
});
