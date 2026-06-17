import React from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { useAuth } from '../../auth/useAuth';
import { RoleHeader } from '../../components/layout/RoleHeader';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { AlertBanner } from '../../components/shared/AlertBanner';
import { AvatarCircle } from '../../components/shared/AvatarCircle';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { useShifts } from '../../hooks/useShifts';
import { useStaffList } from '../../hooks/useStaff';
import { useIncidents } from '../../hooks/useIncidents';

const COLOR = '#1B3A6B';

const today = () => new Date().toISOString().split('T')[0];

export const DashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const shiftsQ = useShifts({ fromDate: today(), toDate: today(), status: 'published' });
  const staffQ = useStaffList({ assignmentDate: today(), isActive: true });
  const incidentsQ = useIncidents({ status: 'open' });

  const shifts = shiftsQ.data?.data ?? [];
  const staffList = staffQ.data?.data ?? [];
  const incidents = incidentsQ.data?.data ?? [];
  const loading = shiftsQ.isLoading || staffQ.isLoading;
  const error = shiftsQ.error || staffQ.error;

  const totalResidents = staffQ.data?.total ?? 0;
  const criticalIncidents = incidents.filter((i: any) => i.severity === 'critical' || i.severity === 'high');

  const refetch = () => {
    shiftsQ.refetch();
    staffQ.refetch();
    incidentsQ.refetch();
  };

  return (
    <View style={styles.flex}>
      <RoleHeader
        title={`Ca trực · ${today()}`}
        subtitle={`${user?.fullName ?? ''} · Điều dưỡng trưởng`}
        stats={[
          { value: totalResidents, label: 'Nhân viên' },
          { value: shifts.length, label: 'Ca hôm nay' },
          { value: criticalIncidents.length, label: 'Cảnh báo' },
        ]}
        roleColor={COLOR}
      />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={COLOR} />}
      >
        <ScreenLayout loading={loading} error={error ? (error as Error).message : null} onRetry={refetch}>
          {criticalIncidents.length > 0 ? (
            <>
              <SectionHeader title="Cảnh báo" roleColor={COLOR} />
              {criticalIncidents.slice(0, 5).map((inc: any) => (
                <AlertBanner
                  key={inc._id}
                  message={`${inc.description}`}
                  severity={inc.severity === 'critical' ? 'critical' : 'warning'}
                  timestamp={inc.incidentAt ? new Date(inc.incidentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : undefined}
                />
              ))}
            </>
          ) : null}

          <SectionHeader title="Phân công ca hôm nay" roleColor={COLOR} />
          {shifts.length === 0 ? (
            <Text style={styles.emptyText}>Không có ca nào hôm nay</Text>
          ) : null}
          {shifts.map((shift: any) => {
            const staff = shift.assignedStaffId;
            const staffName = typeof staff === 'object' ? (staff?.userId?.fullName ?? staff?.staffCode ?? '') : '';
            return (
              <Card key={shift._id} style={styles.card} mode="outlined">
                <Card.Content style={styles.cardRow}>
                  <AvatarCircle name={staffName || 'N/A'} size={40} />
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{staffName || 'Nhân viên'}</Text>
                    <Text style={styles.cardSub}>
                      {shift.name} · {shift.startTime}–{shift.endTime}
                    </Text>
                  </View>
                  <StatusBadge status={shift.status} size="sm" />
                </Card.Content>
              </Card>
            );
          })}

          <SectionHeader title="Nhân viên đang trực" roleColor={COLOR} />
          {staffList.slice(0, 10).map((s: any) => (
            <Card key={s._id} style={styles.card} mode="outlined">
              <Card.Content style={styles.cardRow}>
                <AvatarCircle name={s.fullName} size={36} />
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{s.fullName}</Text>
                  <Text style={styles.cardSub}>{s.role} · {s.staffProfile?.staffCode ?? ''}</Text>
                </View>
              </Card.Content>
            </Card>
          ))}
        </ScreenLayout>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '500', color: '#111827' },
  cardSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 16 },
});
