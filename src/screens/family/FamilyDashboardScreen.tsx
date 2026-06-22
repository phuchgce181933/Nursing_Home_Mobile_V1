import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl, Pressable, TouchableOpacity } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { useAuth } from '../../auth/useAuth';
import { RoleHeader } from '../../components/layout/RoleHeader';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { AvatarCircle } from '../../components/shared/AvatarCircle';
import { StatusBadge } from '../../components/shared/StatusBadge';

const COLOR = '#2E7D32';

export const FamilyDashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const nav = useNavigation<any>();
  const [selectedResident, setSelectedResident] = useState<string | null>(null);

  const residentsQ = useQuery({
    queryKey: ['familyResidents'],
    queryFn: async () => { const r = await api.get(FAMILY.RESIDENTS); return r.data; },
  });

  const walletQ = useQuery({
    queryKey: ['familyWallet'],
    queryFn: async () => { const r = await api.get(FAMILY.WALLET_BALANCE); return r.data?.data ?? r.data; },
  });

  const residents = residentsQ.data?.data ?? residentsQ.data ?? [];
  const wallet = walletQ.data;
  const activeResident = selectedResident ? residents.find((r: any) => r._id === selectedResident) : residents[0];

  const vitalsQ = useQuery({
    queryKey: ['familyVitals', activeResident?._id],
    queryFn: async () => { const r = await api.get(FAMILY.VITALS(activeResident._id)); return r.data; },
    enabled: !!activeResident?._id,
  });

  const loading = residentsQ.isLoading;
  const refetch = () => { residentsQ.refetch(); walletQ.refetch(); vitalsQ.refetch(); };
  const vitals = vitalsQ.data;

  const quickActions = [
    { icon: 'heart-pulse', label: 'Sức khỏe', color: '#DC2626', bg: '#FEE2E2', onPress: () => nav.navigate('Health') },
    { icon: 'pill', label: 'Thuốc', color: '#065F46', bg: '#D1FAE5', onPress: () => nav.navigate('Health', { screen: 'Medications' }) },
    { icon: 'stethoscope', label: 'Lịch hẹn', color: '#1E40AF', bg: '#DBEAFE', onPress: () => nav.navigate('Home', { screen: 'Appointments' }) },
    { icon: 'run', label: 'Hoạt động', color: '#92400E', bg: '#FFEDD5', onPress: () => nav.navigate('Home', { screen: 'Activities' }) },
    { icon: 'file-document-edit-outline', label: 'Nhập viện', color: '#7C3AED', bg: '#EDE9FE', onPress: () => nav.navigate('Home', { screen: 'Admissions' }) },
    { icon: 'calendar-check', label: 'Tham quan', color: '#0F766E', bg: '#CCFBF1', onPress: () => nav.navigate('Home', { screen: 'Tours' }) },
    { icon: 'lifebuoy', label: 'Hỗ trợ', color: '#BE185D', bg: '#FCE7F3', onPress: () => nav.navigate('Home', { screen: 'Support' }) },
    { icon: 'wallet-outline', label: 'Ví tiền', color: '#2E7D32', bg: '#E8F5E9', onPress: () => nav.navigate('Wallet') },
  ];

  return (
    <View style={styles.flex}>
      <RoleHeader
        title={`Xin chào, ${user?.fullName?.split(' ').pop() ?? ''}`}
        subtitle={new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
        stats={[
          { value: residents.length, label: 'Người thân' },
          { value: wallet?.balance != null ? `${(wallet.balance / 1000).toFixed(0)}k` : '--', label: 'Số dư ví' },
        ]}
        roleColor={COLOR}
      />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={COLOR} />}
      >
        <ScreenLayout loading={loading} error={residentsQ.error ? (residentsQ.error as Error).message : null} onRetry={refetch}>
          {residents.length > 1 ? (
            <>
              <SectionHeader title="Chọn người thân" roleColor={COLOR} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {residents.map((r: any) => (
                  <Pressable
                    key={r._id}
                    onPress={() => setSelectedResident(r._id)}
                    style={[styles.residentChip, activeResident?._id === r._id && { backgroundColor: COLOR }]}
                  >
                    <Text style={[styles.residentChipText, activeResident?._id === r._id && { color: '#fff' }]}>
                      {r.fullName}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : null}

          {activeResident ? (
            <Card style={styles.card} mode="elevated">
              <Card.Content style={styles.residentRow}>
                <AvatarCircle name={activeResident.fullName} size={48} />
                <View style={styles.residentInfo}>
                  <Text style={styles.residentName}>{activeResident.fullName}</Text>
                  <Text style={styles.residentSub}>
                    {activeResident.residentCode} · {activeResident.residencyStatus === 'admitted' ? 'Đang ở' : activeResident.residencyStatus}
                  </Text>
                </View>
                <StatusBadge status={activeResident.residencyStatus} size="sm" />
              </Card.Content>
            </Card>
          ) : null}

          <SectionHeader title="Thao tác nhanh" roleColor={COLOR} />
          <View style={styles.actionGrid}>
            {quickActions.map((a) => (
              <TouchableOpacity key={a.label} style={styles.actionItem} onPress={a.onPress} activeOpacity={0.7}>
                <View style={[styles.actionIcon, { backgroundColor: a.bg }]}>
                  <MaterialCommunityIcons name={a.icon as any} size={22} color={a.color} />
                </View>
                <Text style={styles.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {vitals ? (
            <>
              <SectionHeader title="Sinh hiệu gần nhất" roleColor={COLOR} />
              <View style={styles.vitalsGrid}>
                {[
                  { label: 'Huyết áp', value: `${vitals.bloodPressureSystolic ?? '--'}/${vitals.bloodPressureDiastolic ?? '--'}`, unit: 'mmHg', icon: 'heart-pulse' },
                  { label: 'Nhịp tim', value: vitals.pulse ?? '--', unit: 'bpm', icon: 'heart' },
                  { label: 'Nhiệt độ', value: vitals.temperatureCelsius ?? '--', unit: '°C', icon: 'thermometer' },
                  { label: 'SpO2', value: vitals.oxygenSaturation ?? '--', unit: '%', icon: 'water-percent' },
                ].map((v, i) => (
                  <Card key={i} style={styles.vitalCard}>
                    <Card.Content style={styles.vitalContent}>
                      <MaterialCommunityIcons name={v.icon as any} size={20} color={COLOR} />
                      <Text style={styles.vitalValue}>{v.value}</Text>
                      <Text style={styles.vitalUnit}>{v.unit}</Text>
                      <Text style={styles.vitalLabel}>{v.label}</Text>
                    </Card.Content>
                  </Card>
                ))}
              </View>
            </>
          ) : null}

          <SectionHeader title="Ví điện tử" roleColor={COLOR} />
          <Card style={styles.card} mode="elevated" onPress={() => nav.navigate('Wallet')}>
            <Card.Content>
              <Text style={styles.walletBalance}>
                {wallet?.balance != null ? wallet.balance.toLocaleString('vi-VN') : '--'} ₫
              </Text>
              <Text style={styles.walletSub}>
                Đã nạp: {wallet?.totalTopup?.toLocaleString('vi-VN') ?? '0'} ₫ · Đã chi: {wallet?.totalSpent?.toLocaleString('vi-VN') ?? '0'} ₫
              </Text>
            </Card.Content>
          </Card>
        </ScreenLayout>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 12 },
  residentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  residentInfo: { flex: 1 },
  residentName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  residentSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  residentChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#E8F5E9', marginRight: 8,
  },
  residentChipText: { fontSize: 13, fontWeight: '500', color: '#2E7D32' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  actionItem: { width: '22%', alignItems: 'center', gap: 6 },
  actionIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 10, fontWeight: '600', color: '#374151', textAlign: 'center' },
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vitalCard: { width: '48%', borderRadius: 12 },
  vitalContent: { alignItems: 'center', paddingVertical: 10 },
  vitalValue: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 4 },
  vitalUnit: { fontSize: 10, color: '#9CA3AF' },
  vitalLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  walletBalance: { fontSize: 24, fontWeight: '700', color: '#2E7D32' },
  walletSub: { fontSize: 12, color: '#6B7280', marginTop: 4 },
});
