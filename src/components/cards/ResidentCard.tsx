import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { AvatarCircle } from '../shared/AvatarCircle';
import { StatusBadge } from '../shared/StatusBadge';
import { useAppTheme } from '../../theme/useAppTheme';
import type { AppColors } from '../../constants/theme';

type Resident = {
  _id: string;
  fullName: string;
  residentCode?: string;
  dateOfBirth?: string;
  residencyStatus?: string;
  roomId?: { roomNumber?: string } | string;
  gender?: string;
};

type Props = {
  resident: Resident;
  onPress: () => void;
};

const getAge = (dob?: string): number | null => {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

const getRoomLabel = (roomId: Resident['roomId']): string => {
  if (!roomId) return '';
  if (typeof roomId === 'object' && roomId.roomNumber) return `Phòng ${roomId.roomNumber}`;
  return '';
};

export const ResidentCard: React.FC<Props> = ({ resident, onPress }) => {
  // Tên/phụ đề trước đây dùng hex sáng cố định (#111827 / #6B7280) nên ở chế độ
  // tối gần như chìm vào nền; đọc qua palette để cả hai chế độ đều đủ tương phản.
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const age = getAge(resident.dateOfBirth);
  const room = getRoomLabel(resident.roomId);
  const subtitle = [room, age != null ? `${age} tuổi` : null].filter(Boolean).join(' · ');

  return (
    <>
      <Pressable
        onPress={onPress}
        android_ripple={{ color: colors.surfaceMuted }}
        style={styles.container}
      >
        <AvatarCircle name={resident.fullName} size={40} />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{resident.fullName}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        <StatusBadge status={resident.residencyStatus} size="sm" />
      </Pressable>
      <Divider />
    </>
  );
};

const createStyles = (c: AppColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: c.surface,
  },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '500', color: c.text },
  subtitle: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
});
