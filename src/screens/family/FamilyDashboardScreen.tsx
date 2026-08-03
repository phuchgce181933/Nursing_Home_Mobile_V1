import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { useAuth } from '../../auth/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { AvatarCircle } from '../../components/shared/AvatarCircle';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { HomeHero } from '../../components/home/HomeHero';
import { AppCard } from '../../components/ui/AppCard';
import { SummaryCard } from '../../components/ui/SummaryCard';
import { QuickActionTile } from '../../components/ui/QuickActionTile';
import { COLORS, SPACING, RADIUS } from '../../theme/designSystem';

const COLOR = COLORS.primary;
const NS = 'family.dashboard';

const getRoomLabel = (roomId: any): string => {
  if (roomId && typeof roomId === 'object' && roomId.roomNumber) return `P.${roomId.roomNumber}`;
  return '';
};

export const FamilyDashboardScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [selectedResident, setSelectedResident] = useState<string | null>(null);

  const residentsQ = useQuery({
    queryKey: ['familyResidents'],
    queryFn: async () => { const r = await api.get(FAMILY.RESIDENTS); return r.data; },
  });

  const walletQ = useQuery({
    queryKey: ['familyWallet'],
    queryFn: async () => { const r = await api.get(FAMILY.WALLET_BALANCE); return r.data?.data ?? r.data; },
  });

  const unreadQ = useNotifications({ isRead: false, limit: 50 });

  const residents = residentsQ.data?.data ?? residentsQ.data ?? [];
  const wallet = walletQ.data;
  const activeResident = selectedResident ? residents.find((r: any) => r._id === selectedResident) : residents[0];
  const unreadCount = (unreadQ.data?.items ?? unreadQ.data?.data ?? []).length;

  const vitalsQ = useQuery({
    queryKey: ['familyVitals', activeResident?._id],
    queryFn: async () => { const r = await api.get(FAMILY.VITALS(activeResident!._id)); return r.data; },
    enabled: !!activeResident?._id,
  });

  const loading = residentsQ.isLoading;
  const isFetching = residentsQ.isFetching || walletQ.isFetching || vitalsQ.isFetching;
  const refetch = () => { residentsQ.refetch(); walletQ.refetch(); vitalsQ.refetch(); unreadQ.refetch(); };

  const vitals = vitalsQ.data;

  const QUICK_ACTIONS = [
    { icon: 'calendar-clock-outline', label: t(`${NS}.scheduleVisit`), onPress: () => navigation?.navigate('Visits') },
    { icon: 'clipboard-plus-outline', label: t(`${NS}.accessAdmissions`), onPress: () => navigation?.navigate('Admissions') },
    { icon: 'lifebuoy', label: t(`${NS}.contactSupport`), onPress: () => navigation?.navigate('Support') },
    { icon: 'chat-outline', label: t(`${NS}.messages`), onPress: () => navigation?.navigate('Messages') },
    { icon: 'bell-outline', label: t(`${NS}.notifications`), onPress: () => navigation?.navigate('Notifications') },
    { icon: 'heart-pulse', label: t(`${NS}.accessHealth`), onPress: () => navigation?.navigate('Health') },
    { icon: 'wallet-outline', label: t(`${NS}.accessWallet`), onPress: () => navigation?.navigate('Wallet') },
    { icon: 'receipt', label: t(`${NS}.accessInvoices`), onPress: () => navigation?.navigate('Invoices') },
    { icon: 'image-multiple-outline', label: t(`${NS}.accessPhotos`), onPress: () => navigation?.navigate('Health', { screen: 'Photos' }) },
  ];

  const VITAL_ITEMS = vitals ? [
    { label: t(`${NS}.bloodPressure`), value: `${vitals.bloodPressureSystolic ?? '--'}/${vitals.bloodPressureDiastolic ?? '--'}`, unit: 'mmHg', icon: 'heart-pulse' },
    { label: t(`${NS}.pulse`), value: vitals.pulse ?? '--', unit: 'bpm', icon: 'heart' },
    { label: t(`${NS}.temperature`), value: vitals.temperatureCelsius ?? '--', unit: '°C', icon: 'thermometer' },
    { label: t(`${NS}.spo2`), value: vitals.oxygenSaturation ?? '--', unit: '%', icon: 'water-percent' },
  ] : [];

  return (
    <View style={styles.flex}>
      <HomeHero
        greeting={t(`${NS}.greeting`, { name: user?.fullName ?? '' })}
        subtitle={t(`${NS}.subtitle`)}
        avatarName={user?.fullName ?? '?'}
        unreadCount={unreadCount}
        onPressNotifications={() => navigation?.navigate('Notifications')}
        onPressProfile={() => navigation?.navigate('Profile')}
        roleColor={COLOR}
      />

      <View style={styles.contentSheet}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.body}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={COLOR} />}
        >
          <ScreenLayout loading={loading} error={residentsQ.error ? (residentsQ.error as Error).message : null} onRetry={refetch}>
            <View style={styles.summaryRow}>
              <SummaryCard
                icon="account-group-outline"
                value={residents.length}
                label={t(`${NS}.relativesCount`)}
                color={COLOR}
              />
              <SummaryCard
                icon="wallet-outline"
                value={wallet?.balance != null ? `${wallet.balance.toLocaleString('vi-VN')} ₫` : '--'}
                label={t(`${NS}.walletBalance`)}
                color={COLOR}
                onPress={() => navigation?.navigate('Wallet')}
              />
            </View>

            {residents.length > 1 ? (
              <>
                <SectionHeader title={t(`${NS}.selectRelative`)} roleColor={COLOR} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll} contentContainerStyle={{ gap: SPACING.sm }}>
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
              <AppCard onPress={() => navigation?.navigate('ResidentProfile', { residentId: activeResident._id })} style={styles.residentCard}>
                <View style={styles.residentRow}>
                  <AvatarCircle name={activeResident.fullName} size={48} uri={activeResident.avatarUrl} />
                  <View style={styles.residentInfo}>
                    <Text style={styles.residentName}>{activeResident.fullName}</Text>
                    <Text style={styles.residentSub}>
                      {[activeResident.residentCode, getRoomLabel(activeResident.roomId)].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <StatusBadge status={activeResident.residencyStatus} size="sm" />
                </View>
              </AppCard>
            ) : null}

            <SectionHeader title={t(`${NS}.quickAccessTitle`)} roleColor={COLOR} />
            <View style={styles.quickGrid}>
              {QUICK_ACTIONS.map((a, i) => (
                <QuickActionTile key={i} icon={a.icon} label={a.label} color={COLOR} onPress={a.onPress} />
              ))}
            </View>

            <SectionHeader title={t(`${NS}.recentVitals`)} roleColor={COLOR} />
            {vitals ? (
              <AppCard style={styles.vitalsCard}>
                <View style={styles.vitalsGrid}>
                  {VITAL_ITEMS.map((v, i) => (
                    <View key={i} style={styles.vitalItem}>
                      <MaterialCommunityIcons name={v.icon as any} size={20} color={COLOR} />
                      <Text style={styles.vitalValue}>{v.value}</Text>
                      <Text style={styles.vitalUnit}>{v.unit}</Text>
                      <Text style={styles.vitalLabel}>{v.label}</Text>
                    </View>
                  ))}
                </View>
              </AppCard>
            ) : (
              <AppCard style={styles.emptyCard}>
                <MaterialCommunityIcons name="heart-pulse" size={28} color={COLORS.gray300} />
                <Text style={styles.emptyText}>{t(`${NS}.noVitalsYet`)}</Text>
              </AppCard>
            )}
          </ScreenLayout>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.gray50 },
  contentSheet: { flex: 1, marginTop: -40 },
  body: { padding: SPACING.md, paddingBottom: SPACING.xl },

  summaryRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg },

  pillScroll: { marginBottom: SPACING.md },
  residentChip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primarySoft,
  },
  residentChipText: { fontSize: 13, fontWeight: '500', color: COLOR },

  residentCard: { marginBottom: SPACING.lg },
  residentRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  residentInfo: { flex: 1 },
  residentName: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  residentSub: { fontSize: 12.5, color: COLORS.gray500, marginTop: 2 },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: SPACING.lg },

  vitalsCard: { marginBottom: SPACING.lg },
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  vitalItem: { width: '48%', alignItems: 'center', paddingVertical: SPACING.sm },
  vitalValue: { fontSize: 18, fontWeight: '700', color: COLORS.dark, marginTop: 4 },
  vitalUnit: { fontSize: 10, color: COLORS.gray500 },
  vitalLabel: { fontSize: 11, color: COLORS.gray500, marginTop: 2 },

  emptyCard: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyText: { fontSize: 13, color: COLORS.gray500, textAlign: 'center' },
});
