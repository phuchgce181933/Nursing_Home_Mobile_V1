import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Text, Card, Chip, IconButton, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { useFamilyMedications, useFamilyPrescriptions } from '../../hooks/useFamilyHealth';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ResidentSwitcher } from '../../components/shared/ResidentSwitcher';

const COLOR = '#2E7D32';
const NS = 'family.medications';

const toDateStr = (d: Date) => d.toISOString().split('T')[0];

export const FamilyMedicationsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [tab, setTab] = useState<'schedule' | 'prescriptions'>('schedule');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [prescriptionStatus, setPrescriptionStatus] = useState('ACTIVE');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const TABS = [
    { value: 'schedule' as const, label: t(`${NS}.tabSchedule`) },
    { value: 'prescriptions' as const, label: t(`${NS}.tabPrescriptions`) },
  ];
  const PRESCRIPTION_STATUS_FILTERS = [
    { value: 'ACTIVE', label: t(`${NS}.filterActive`) },
    { value: 'COMPLETED', label: t(`${NS}.filterCompleted`) },
    { value: 'CANCELLED', label: t(`${NS}.filterCancelled`) },
  ];

  const residentsQ = useQuery({
    queryKey: ['familyResidents'],
    queryFn: async () => { const r = await api.get(FAMILY.RESIDENTS); return r.data; },
  });
  const residents = residentsQ.data?.data ?? residentsQ.data ?? [];
  const activeId = selectedId ?? residents[0]?._id;

  const today = toDateStr(new Date());
  const scheduleQ = useFamilyMedications(activeId, { from: `${today}T00:00:00.000Z`, to: `${today}T23:59:59.999Z` });
  const prescriptionsQ = useFamilyPrescriptions(activeId);

  const schedules = scheduleQ.data?.data ?? scheduleQ.data ?? [];
  const allPrescriptions = prescriptionsQ.data?.data ?? prescriptionsQ.data ?? [];
  const prescriptions = allPrescriptions.filter((p: any) => {
    if (p.status !== prescriptionStatus) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      p.diagnosisNote?.toLowerCase().includes(q) ||
      p.items?.some((it: any) => it.medicationName?.toLowerCase().includes(q))
    );
  });

  const loading = residentsQ.isLoading || (tab === 'schedule' ? scheduleQ.isLoading : prescriptionsQ.isLoading);
  const refetch = () => (tab === 'schedule' ? scheduleQ.refetch() : prescriptionsQ.refetch());

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <View style={styles.topRow}>
          <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation.goBack()} />
          <Text style={styles.topTitle}>{t(`${NS}.title`)}</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ResidentSwitcher residents={residents} activeId={activeId} onChange={setSelectedId} color={COLOR} />

      <View style={styles.tabRow}>
        {TABS.map((tb) => (
          <Chip key={tb.value} selected={tab === tb.value} onPress={() => setTab(tb.value)}
            style={tab === tb.value ? { backgroundColor: COLOR } : undefined}
            textStyle={tab === tb.value ? { color: '#fff' } : undefined}>{tb.label}</Chip>
        ))}
      </View>

      {tab === 'schedule' ? (
        <ScreenLayout loading={loading} error={scheduleQ.error ? (scheduleQ.error as Error).message : null}
          onRetry={refetch} isEmpty={schedules.length === 0} emptyMessage={t(`${NS}.emptySchedule`)}>
          <FlatList data={schedules} keyExtractor={(item: any) => item._id} contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={COLOR} />}
            renderItem={({ item }) => (
              <Card style={styles.card} mode="outlined">
                <Card.Content>
                  <View style={styles.rowBetween}>
                    <Text style={styles.medName}>{item.medicationName}</Text>
                    <StatusBadge status={item.status} size="sm" />
                  </View>
                  <Text style={styles.medDetail}>{item.dosage}{item.route ? ` · ${item.route}` : ''}</Text>
                  <Text style={styles.medTime}>
                    {item.scheduledTime ? new Date(item.scheduledTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                    {item.actualTimeTaken ? ` · ${t(`${NS}.takenAt`, { time: new Date(item.actualTimeTaken).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) })}` : ''}
                  </Text>
                </Card.Content>
              </Card>
            )}
          />
        </ScreenLayout>
      ) : (
        <ScreenLayout loading={loading} error={prescriptionsQ.error ? (prescriptionsQ.error as Error).message : null}
          onRetry={refetch} isEmpty={prescriptions.length === 0} emptyMessage={t(`${NS}.emptyPrescriptions`)}>
          <View style={styles.searchBar}>
            <TextInput mode="outlined" placeholder={t(`${NS}.searchPlaceholder`)} value={search}
              onChangeText={setSearch} dense left={<TextInput.Icon icon="magnify" />} />
          </View>
          <View style={styles.filterRow}>
            {PRESCRIPTION_STATUS_FILTERS.map((f) => (
              <Chip key={f.value} selected={prescriptionStatus === f.value} onPress={() => setPrescriptionStatus(f.value)}
                style={prescriptionStatus === f.value ? { backgroundColor: COLOR } : undefined}
                textStyle={prescriptionStatus === f.value ? { color: '#fff' } : undefined} compact>{f.label}</Chip>
            ))}
          </View>
          <FlatList data={prescriptions} keyExtractor={(item: any) => item._id} contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={COLOR} />}
            renderItem={({ item }) => {
              const expanded = expandedId === item._id;
              return (
                <Card style={styles.card} mode="outlined">
                  <Pressable onPress={() => setExpandedId(expanded ? null : item._id)}>
                    <Card.Content>
                      <View style={styles.rowBetween}>
                        <Text style={styles.medName}>{item.diagnosisNote || t(`${NS}.defaultTitle`)}</Text>
                        <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color="#9CA3AF" />
                      </View>
                      <Text style={styles.medDetail}>
                        {t(`${NS}.doctorLabel`, { name: item.doctorId?.fullName ?? '—' })} · {t(`${NS}.validUntil`, { date: item.validUntil ? new Date(item.validUntil).toLocaleDateString('vi-VN') : '--' })}
                      </Text>
                      <Text style={styles.medTime}>{t(`${NS}.medicationCount`, { count: item.items?.length ?? 0 })}</Text>
                    </Card.Content>
                  </Pressable>
                  {expanded ? (
                    <Card.Content style={styles.itemsBox}>
                      {(item.items ?? []).map((it: any, idx: number) => (
                        <View key={idx} style={styles.itemRow}>
                          <Text style={styles.itemName}>{it.medicationName}</Text>
                          <Text style={styles.itemDetail}>
                            {it.dosage}{it.unit ? ` ${it.unit}` : ''} · {t(`${NS}.perDay`, { count: it.frequency })}{it.route ? ` · ${it.route}` : ''}
                          </Text>
                          {it.times?.length ? <Text style={styles.itemTimes}>{t(`${NS}.timesLabel`, { times: it.times.join(', ') })}</Text> : null}
                          {it.startDate ? <Text style={styles.itemTimes}>{t(`${NS}.fromDate`, { date: new Date(it.startDate).toLocaleDateString('vi-VN') })}</Text> : null}
                        </View>
                      ))}
                    </Card.Content>
                  ) : null}
                </Card>
              );
            }}
          />
        </ScreenLayout>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 4, paddingBottom: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingBottom: 8, flexWrap: 'wrap' },
  searchBar: { paddingHorizontal: 16, paddingBottom: 8 },
  list: { padding: 16, paddingTop: 0, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  medName: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 },
  medDetail: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  medTime: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  itemsBox: { paddingTop: 0, borderTopWidth: 1, borderTopColor: '#F0F0F0', marginTop: 4 },
  itemRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  itemName: { fontSize: 13, fontWeight: '500', color: '#111827' },
  itemDetail: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  itemTimes: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
});
