import React from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, ProgressBar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStaffList } from '../../hooks/useStaff';
import { useShifts } from '../../hooks/useShifts';
import { AvatarCircle } from '../../components/shared/AvatarCircle';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { SectionHeader } from '../../components/layout/SectionHeader';

const COLOR = '#1B3A6B';
const today = () => new Date().toISOString().split('T')[0];

export const StaffAssignmentScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const staffQ = useStaffList({ assignmentDate: today(), isActive: true });
  const shiftsQ = useShifts({ fromDate: today(), toDate: today() });
  const staff = staffQ.data?.data ?? [];
  const shifts = shiftsQ.data?.data ?? [];
  const loading = staffQ.isLoading;
  const error = staffQ.error;

  const refetch = () => {
    staffQ.refetch();
    shiftsQ.refetch();
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Phân công ca</Text>
        <Text style={styles.topSub}>{today()} · {staff.length} nhân viên</Text>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={COLOR} />}
      >
        <ScreenLayout loading={loading} error={error ? (error as Error).message : null} onRetry={refetch}>
          <SectionHeader title="Nhân viên" roleColor={COLOR} />
          {staff.map((s: any) => {
            const staffShifts = shifts.filter((sh: any) => {
              const staffId = typeof sh.assignedStaffId === 'object' ? sh.assignedStaffId?._id : sh.assignedStaffId;
              return staffId === s.staffProfile?._id;
            });
            const totalShifts = staffShifts.length;
            const completedShifts = staffShifts.filter((sh: any) => sh.status === 'completed').length;
            const progress = totalShifts > 0 ? completedShifts / totalShifts : 0;

            return (
              <Card key={s._id} style={styles.card} mode="elevated">
                <Card.Content>
                  <View style={styles.cardRow}>
                    <AvatarCircle name={s.fullName} size={44} />
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName}>{s.fullName}</Text>
                      <Text style={styles.cardRole}>{s.staffProfile?.staffCode ?? s.role}</Text>
                    </View>
                    <StatusBadge status={staffShifts[0]?.status} size="sm" />
                  </View>
                  <ProgressBar
                    progress={progress}
                    color={COLOR}
                    style={styles.progress}
                  />
                  <Text style={styles.progressText}>
                    {completedShifts}/{totalShifts} ca hoàn thành
                  </Text>
                </Card.Content>
              </Card>
            );
          })}

          {staff.length === 0 ? (
            <Text style={styles.emptyText}>Không có nhân viên nào trong ca</Text>
          ) : null}
        </ScreenLayout>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  topSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  body: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 16, marginBottom: 12, backgroundColor: '#fff' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  cardRole: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  progress: { marginTop: 12, borderRadius: 4, height: 6 },
  progressText: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 24 },
});
