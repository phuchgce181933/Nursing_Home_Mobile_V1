import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { useAuth } from '../../auth/useAuth';
import { RoleHeader } from '../../components/layout/RoleHeader';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { AvatarCircle } from '../../components/shared/AvatarCircle';
import { StatusBadge } from '../../components/shared/StatusBadge';

const COLOR = '#2E7D32';
const NS = 'family.dashboard';

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

  const residents = residentsQ.data?.data ?? residentsQ.data ?? [];
  const wallet = walletQ.data;
  const activeResident = selectedResident ? residents.find((r: any) => r._id === selectedResident) : residents[0];

  const vitalsQ = useQuery({
    queryKey: ['familyVitals', activeResident?._id],
    queryFn: async () => { const r = await api.get(FAMILY.VITALS(activeResident!._id)); return r.data; },
    enabled: !!activeResident?._id,
  });

  const loading = residentsQ.isLoading;
  const refetch = () => { residentsQ.refetch(); walletQ.refetch(); vitalsQ.refetch(); };

  const vitals = vitalsQ.data;

  return (
    <View style={styles.flex}>
      <RoleHeader
        title={t(`${NS}.greeting`, { name: user?.fullName ?? '' })}
        subtitle={t(`${NS}.subtitle`)}
        stats={[
          { value: residents.length, label: t(`${NS}.relativesCount`), icon: 'account-group-outline' },
          { value: wallet?.balance != null ? `${(wallet.balance / 1000).toFixed(0)}k` : '--', label: t(`${NS}.walletBalance`), icon: 'wallet-outline' },
        ]}
        roleColor={COLOR}
      />

      <View style={styles.contentSheet}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={COLOR} />}
      >
        <ScreenLayout loading={loading} error={residentsQ.error ? (residentsQ.error as Error).message : null} onRetry={refetch}>
          {residents.length > 1 ? (
            <>
              <SectionHeader title={t(`${NS}.selectRelative`)} roleColor={COLOR} />
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
            <Card style={styles.card} mode="elevated" onPress={() => navigation?.navigate('ResidentProfile', { residentId: activeResident._id })}>
              <Card.Content style={styles.residentRow}>
                <AvatarCircle name={activeResident.fullName} size={48} uri={activeResident.avatarUrl} />
                <View style={styles.residentInfo}>
                  <Text style={styles.residentName}>{activeResident.fullName}</Text>
                  <Text style={styles.residentSub}>
                    {activeResident.residentCode} · {activeResident.residencyStatus === 'admitted' ? t(`${NS}.admitted`) : activeResident.residencyStatus}
                  </Text>
                </View>
                <StatusBadge status={activeResident.residencyStatus} size="sm" />
              </Card.Content>
            </Card>
          ) : null}

          <View style={styles.quickActionsRow}>
            <Pressable style={styles.actionTile} onPress={() => navigation?.navigate('Visits')}>
              <View style={[styles.actionIcon, { backgroundColor: COLOR }]}>
                <MaterialCommunityIcons name="calendar-clock-outline" size={22} color="#fff" />
              </View>
              <Text style={styles.actionLabel}>{t(`${NS}.scheduleVisit`)}</Text>
            </Pressable>
            <Pressable style={styles.actionTile} onPress={() => navigation?.navigate('Support')}>
              <View style={[styles.actionIcon, { backgroundColor: COLOR }]}>
                <MaterialCommunityIcons name="lifebuoy" size={22} color="#fff" />
              </View>
              <Text style={styles.actionLabel}>{t(`${NS}.contactSupport`)}</Text>
            </Pressable>
            <Pressable style={styles.actionTile} onPress={() => navigation?.navigate('Messages')}>
              <View style={[styles.actionIcon, { backgroundColor: COLOR }]}>
                <MaterialCommunityIcons name="chat-outline" size={22} color="#fff" />
              </View>
              <Text style={styles.actionLabel}>{t(`${NS}.messages`)}</Text>
            </Pressable>
            <Pressable style={styles.actionTile} onPress={() => navigation?.navigate('Notifications')}>
              <View style={[styles.actionIcon, { backgroundColor: COLOR }]}>
                <MaterialCommunityIcons name="bell-outline" size={22} color="#fff" />
              </View>
              <Text style={styles.actionLabel}>{t(`${NS}.notifications`)}</Text>
            </Pressable>
          </View>

          <SectionHeader title={t(`${NS}.quickAccessTitle`)} roleColor={COLOR} />
          <View style={styles.accessGrid}>
            {[
              { tab: 'Health', label: t(`${NS}.accessHealth`), icon: 'heart-pulse', color: '#2E7D32' },
              { tab: 'Wallet', label: t(`${NS}.accessWallet`), icon: 'wallet-outline', color: '#1565C0' },
              { tab: 'Invoices', label: t(`${NS}.accessInvoices`), icon: 'receipt', color: '#E65100' },
              { tab: 'Health', screen: 'Photos', label: t(`${NS}.accessPhotos`), icon: 'image-multiple-outline', color: '#6A1B9A' },
            ].map((a, i) => (
              <Pressable
                key={i}
                style={styles.accessTile}
                onPress={() => navigation?.navigate(a.tab, a.screen ? { screen: a.screen } : undefined)}
              >
                <View style={[styles.accessIcon, { backgroundColor: a.color + '15' }]}>
                  <MaterialCommunityIcons name={a.icon as any} size={24} color={a.color} />
                </View>
                <Text style={styles.accessLabel}>{a.label}</Text>
              </Pressable>
            ))}
          </View>

          <SectionHeader title={t(`${NS}.recentVitals`)} roleColor={COLOR} />
          {vitals ? (
            <View style={styles.vitalsGrid}>
              {[
                { label: t(`${NS}.bloodPressure`), value: `${vitals.bloodPressureSystolic ?? '--'}/${vitals.bloodPressureDiastolic ?? '--'}`, unit: 'mmHg', icon: 'heart-pulse' },
                { label: t(`${NS}.pulse`), value: vitals.pulse ?? '--', unit: 'bpm', icon: 'heart' },
                { label: t(`${NS}.temperature`), value: vitals.temperatureCelsius ?? '--', unit: '°C', icon: 'thermometer' },
                { label: t(`${NS}.spo2`), value: vitals.oxygenSaturation ?? '--', unit: '%', icon: 'water-percent' },
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
          ) : (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="heart-pulse" size={28} color="#9CA3AF" />
              <Text style={styles.emptyText}>{t(`${NS}.noVitalsYet`)}</Text>
            </View>
          )}
        </ScreenLayout>
      </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  contentSheet: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
  },
  body: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 16 },
  quickActionsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  actionTile: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14 },
  actionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 12, fontWeight: '500', color: '#374151', textAlign: 'center' },
  accessGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  accessTile: { width: '21%', alignItems: 'center', gap: 6 },
  accessIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  accessLabel: { fontSize: 10.5, fontWeight: '500', color: '#374151', textAlign: 'center' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 14, alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  residentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  residentInfo: { flex: 1 },
  residentName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  residentSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  residentChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#E8F5E9', marginRight: 8,
  },
  residentChipText: { fontSize: 13, fontWeight: '500', color: '#2E7D32' },
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vitalCard: { width: '48%', borderRadius: 12 },
  vitalContent: { alignItems: 'center', paddingVertical: 10 },
  vitalValue: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 4 },
  vitalUnit: { fontSize: 10, color: '#9CA3AF' },
  vitalLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
});
