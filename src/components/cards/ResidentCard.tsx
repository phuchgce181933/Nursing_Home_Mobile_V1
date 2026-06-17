import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { AvatarCircle } from '../shared/AvatarCircle';
import { StatusBadge } from '../shared/StatusBadge';

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
  const age = getAge(resident.dateOfBirth);
  const room = getRoomLabel(resident.roomId);
  const subtitle = [room, age != null ? `${age} tuổi` : null].filter(Boolean).join(' · ');

  return (
    <>
      <Pressable
        onPress={onPress}
        android_ripple={{ color: '#E5E7EB' }}
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '500', color: '#111827' },
  subtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});
