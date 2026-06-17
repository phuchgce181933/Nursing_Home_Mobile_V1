import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, Divider } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/useAuth';
import { AvatarCircle } from '../../components/shared/AvatarCircle';
import { getRoleColor } from '../../theme/theme';

const ROLE_LABELS: Record<string, string> = {
  manager: 'Điều dưỡng trưởng',
  admin: 'Quản trị viên',
  nurse: 'Y tá',
  doctor: 'Bác sĩ',
  caregiver: 'Hộ lý',
  family: 'Gia đình',
};

export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const roleColor = getRoleColor(user?.role);

  if (!user) return null;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
      <View style={[styles.header, { backgroundColor: roleColor, paddingTop: insets.top + 16 }]}>
        <AvatarCircle name={user.fullName} size={64} />
        <Text style={styles.name}>{user.fullName}</Text>
        <Text style={styles.role}>{ROLE_LABELS[user.role] ?? user.role}</Text>
      </View>

      <View style={styles.body}>
        <Card style={styles.card}>
          <Card.Content>
            <InfoRow label="Email" value={user.email} />
            <Divider style={styles.divider} />
            <InfoRow label="Điện thoại" value={user.phone || 'Chưa cập nhật'} />
            <Divider style={styles.divider} />
            <InfoRow label="Giới tính" value={user.gender === 'male' ? 'Nam' : user.gender === 'female' ? 'Nữ' : 'Khác'} />
            {user.staffProfile ? (
              <>
                <Divider style={styles.divider} />
                <InfoRow label="Mã nhân viên" value={user.staffProfile.staffCode} />
                {user.staffProfile.specialty ? (
                  <>
                    <Divider style={styles.divider} />
                    <InfoRow label="Chuyên môn" value={user.staffProfile.specialty} />
                  </>
                ) : null}
              </>
            ) : null}
          </Card.Content>
        </Card>

        <Button
          mode="outlined"
          onPress={logout}
          textColor="#991B1B"
          style={styles.logoutBtn}
        >
          Đăng xuất
        </Button>
      </View>
    </ScrollView>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { alignItems: 'center', paddingBottom: 20 },
  name: { color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 12 },
  role: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  body: { padding: 16 },
  card: { borderRadius: 12 },
  divider: { marginVertical: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  infoLabel: { fontSize: 13, color: '#6B7280' },
  infoValue: { fontSize: 13, fontWeight: '500', color: '#111827' },
  logoutBtn: { marginTop: 24, borderColor: '#991B1B', borderRadius: 8 },
});
