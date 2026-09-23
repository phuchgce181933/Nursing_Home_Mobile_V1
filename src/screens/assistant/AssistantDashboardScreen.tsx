import React, { useMemo } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Text, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/useAuth';
import { RoleHeader } from '../../components/layout/RoleHeader';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { useCaregiverTasks } from '../../hooks/useTasks';
import { getStatusEntry, useStatusLabel } from '../../utils/statusMap';
import { useAppTheme } from '../../theme/useAppTheme';
import type { AppColors } from '../../constants/theme';
import { formatLocalDate } from '../../utils/date';

const NS = 'assistant.dashboard';
const today = () => formatLocalDate(new Date());

/**
 * Trạng thái còn phải xử lý, theo đúng VALID_TRANSITIONS của backend
 * (services/careTaskService.js): `completed`, `skipped` và `missed` đều là
 * trạng thái KẾT THÚC (danh sách chuyển tiếp rỗng), chỉ `pending` và
 * `in_progress` mới còn việc để làm. Vì vậy "Còn lại" KHÔNG phải Tổng − Xong:
 * một nhiệm vụ bị bỏ qua hay bị lỡ đã đóng, không nằm trong việc còn lại.
 */
const OPEN_STATUSES = ['pending', 'in_progress'];

const FEATURES = [
  { icon: 'clock-outline', labelKey: 'featureShifts', screen: 'MyShifts', color: '#1565C0' },
  { icon: 'calendar-remove-outline', labelKey: 'featureLeave', screen: 'LeaveRequests', color: '#E65100' },
  { icon: 'account-group-outline', labelKey: 'featureResidents', screen: 'AssignedResidents', color: '#2E7D32' },
  { icon: 'food-apple-outline', labelKey: 'featureDietPlans', screen: 'DietPlans', color: '#F57F17' },
  { icon: 'run', labelKey: 'featureRehab', screen: 'RehabSchedule', color: '#6A1B9A' },
  { icon: 'door-open', labelKey: 'featureRoomStatus', screen: 'RoomStatus', color: '#00838F' },
  { icon: 'heart-pulse', labelKey: 'featureVitals', screen: 'Vitals', color: '#C62828' },
  { icon: 'notebook-outline', labelKey: 'featureCareNotes', screen: 'CareNotes', color: '#00796B' },
  { icon: 'chat-outline', labelKey: 'featureMessages', screen: 'Messages', color: '#00695C' },
  { icon: 'bell-outline', labelKey: 'featureNotifications', screen: 'Notifications', color: '#5D4037' },
];

export const AssistantDashboardScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { colors, roleColor, scheme } = useAppTheme('caregiver');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const taskTypeLabel = useStatusLabel();
  const tasksQ = useCaregiverTasks({ workDate: today() });
  const tasks = tasksQ.data?.data ?? tasksQ.data ?? [];

  const totalCount = tasks.length;
  const completedCount = tasks.filter((tk: any) => tk.status === 'completed').length;
  const remainingCount = tasks.filter((tk: any) => OPEN_STATUSES.includes(tk.status)).length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  return (
    <View style={styles.flex}>
      <RoleHeader
        title={t(`${NS}.title`)}
        subtitle={t(`${NS}.subtitle`, { name: user?.fullName ?? '' })}
        stats={[
          { value: totalCount, label: t(`${NS}.total`), icon: 'format-list-checks' },
          { value: completedCount, label: t(`${NS}.done`), icon: 'check-circle-outline' },
          { value: remainingCount, label: t(`${NS}.remaining`), icon: 'clock-outline' },
        ]}
        roleColor={roleColor}
      />

      <ScreenLayout
        loading={tasksQ.isLoading}
        // Không in message của axios ra màn hình — đó là chuỗi kỹ thuật tiếng Anh.
        error={tasksQ.error ? t(`${NS}.loadError`) : null}
        onRetry={tasksQ.refetch}
        isEmpty={tasks.length === 0}
        emptyMessage={t(`${NS}.empty`)}
      >
        <FlatList
          data={tasks}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={tasksQ.isFetching} onRefresh={tasksQ.refetch} tintColor={roleColor} />}
          ListHeaderComponent={
            <View>
              <View style={styles.progressSection}>
                <ProgressBar progress={progress} color={roleColor} style={styles.progressBar} />
                <Text style={styles.progressText}>
                  {t(`${NS}.progressText`, { percent: Math.round(progress * 100), done: completedCount, total: totalCount })}
                </Text>
              </View>

              <SectionHeader title={t(`${NS}.featuresTitle`)} roleColor={roleColor} />
              <View style={styles.grid}>
                {FEATURES.map(f => (
                  <Pressable key={f.screen} style={styles.featureCard}
                    onPress={() => navigation?.navigate(f.screen)}>
                    <View style={[styles.featureIcon, { backgroundColor: f.color + '15' }]}>
                      <MaterialCommunityIcons name={f.icon as any} size={26} color={f.color} />
                    </View>
                    <Text style={styles.featureLabel}>{t(`${NS}.${f.labelKey}`)}</Text>
                  </Pressable>
                ))}
              </View>

              <SectionHeader title={t(`${NS}.tasksTitle`)} roleColor={roleColor} />
            </View>
          }
          renderItem={({ item }) => {
            // Icon/màu lấy từ bảng trạng thái dùng chung thay vì bảng hex riêng
            // của màn này — bảng cũ chỉ đúng ở chế độ sáng.
            const entry = getStatusEntry(item.status, scheme);
            const room = item.residentId?.roomId?.roomNumber;
            // API đã populate roomId.roomNumber (careTaskRepository.POPULATE) —
            // trước đây Mobile bỏ luôn field này.
            const subtitle = [
              item.residentId?.fullName,
              room ? t(`${NS}.roomLabel`, { number: room }) : null,
              item.scheduledTime,
            ].filter(Boolean).join(' · ');
            return (
              <Pressable
                style={styles.taskRow}
                onPress={() => navigation?.navigate('TaskList')}
                android_ripple={{ color: roleColor + '22' }}
              >
                <MaterialCommunityIcons name={entry.icon as any} size={24} color={entry.textColor} />
                <View style={styles.taskInfo}>
                  <Text style={styles.taskTitle} numberOfLines={1}>
                    {taskTypeLabel(item.taskType)}
                  </Text>
                  <Text style={styles.taskSub} numberOfLines={1}>
                    {subtitle}
                  </Text>
                </View>
                <StatusBadge status={item.status} size="sm" />
              </Pressable>
            );
          }}
        />
      </ScreenLayout>
    </View>
  );
};

const createStyles = (c: AppColors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.background },
  list: { padding: 16, paddingBottom: 32 },
  progressSection: { marginBottom: 16 },
  progressBar: { borderRadius: 4, height: 8 },
  progressText: { fontSize: 12, color: c.textSecondary, marginTop: 4, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  featureCard: { width: '30%', alignItems: 'center', gap: 6, paddingVertical: 8 },
  featureIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  featureLabel: { fontSize: 11, fontWeight: '500', color: c.textSecondary, textAlign: 'center' },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  taskInfo: { flex: 1 },
  // Nhãn loại nhiệm vụ đã là tiếng Việt viết hoa đúng chuẩn -> không 'capitalize'.
  taskTitle: { fontSize: 14, fontWeight: '500', color: c.text },
  taskSub: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
});
