import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { useFamilyMedicationHistory } from '../../hooks/useFamilyHealth';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ResidentSwitcher } from '../../components/shared/ResidentSwitcher';
import { CalendarPicker } from '../../components/shared/CalendarPicker';
import { BackHeader } from '../../components/layout/BackHeader';

const COLOR = '#2E7D32';
const NS = 'family.medicationHistory';

const toDateStr = (d: Date) => d.toISOString().split('T')[0];

export const FamilyMedicationHistoryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const today = new Date();
  const monthAgo = new Date();
  monthAgo.setDate(today.getDate() - 30);
  const [from, setFrom] = useState(toDateStr(monthAgo));
  const [to, setTo] = useState(toDateStr(today));

  const residentsQ = useQuery({
    queryKey: ['familyResidents'],
    queryFn: async () => { const r = await api.get(FAMILY.RESIDENTS); return r.data; },
  });
  const residents = residentsQ.data?.data ?? residentsQ.data ?? [];
  const activeId = selectedId ?? residents[0]?._id;

  const historyQ = useFamilyMedicationHistory(activeId, {
    from: `${from}T00:00:00.000Z`,
    to: `${to}T23:59:59.999Z`,
  });

  const result = historyQ.data?.data ?? historyQ.data ?? {};
  const summary = result.summary ?? {};
  const records = result.records ?? [];
  const lowCompliance = !!result.lowCompliance;

  const loading = residentsQ.isLoading || historyQ.isLoading;
  const refetch = () => historyQ.refetch();

  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.title`)} color={COLOR} onBack={() => navigation.goBack()} />

      <ResidentSwitcher residents={residents} activeId={activeId} onChange={setSelectedId} color={COLOR} />

      <ScreenLayout loading={loading} error={historyQ.error ? (historyQ.error as Error).message : null}
        onRetry={refetch} isEmpty={records.length === 0} emptyMessage={t(`${NS}.empty`)}>
        <FlatList
          data={records}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={historyQ.isFetching} onRefresh={refetch} tintColor={COLOR} />}
          ListHeaderComponent={
            <View>
              <View style={styles.dateRow}>
                <View style={styles.dateCol}>
                  <CalendarPicker label={t(`${NS}.fromLabel`)} value={from} onChange={setFrom} color={COLOR} />
                </View>
                <View style={styles.dateCol}>
                  <CalendarPicker label={t(`${NS}.toLabel`)} value={to} onChange={setTo} minDate={from} color={COLOR} />
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{summary.total ?? 0}</Text>
                  <Text style={styles.statLabel}>{t(`${NS}.statTotal`)}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: '#16A34A' }]}>{summary.taken ?? 0}</Text>
                  <Text style={styles.statLabel}>{t(`${NS}.statTaken`)}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: '#EF4444' }]}>{summary.missed ?? 0}</Text>
                  <Text style={styles.statLabel}>{t(`${NS}.statMissed`)}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: lowCompliance ? '#EF4444' : '#111827' }]}>
                    {summary.complianceRate != null ? `${summary.complianceRate}%` : '--'}
                  </Text>
                  <Text style={styles.statLabel}>{t(`${NS}.statCompliance`)}</Text>
                </View>
              </View>

              {lowCompliance ? (
                <View style={styles.warningBanner}>
                  <Text style={styles.warningText}>{t(`${NS}.lowComplianceWarning`)}</Text>
                </View>
              ) : null}
            </View>
          }
          renderItem={({ item }: any) => (
            <Card style={styles.card} mode="outlined">
              <Card.Content>
                <View style={styles.rowBetween}>
                  <Text style={styles.medName}>{item.medicationName}</Text>
                  <StatusBadge status={item.status} size="sm" />
                </View>
                <Text style={styles.medDetail}>
                  {item.date ? new Date(item.date).toLocaleDateString('vi-VN') : ''}
                  {item.dosage ? ` · ${item.dosage}` : ''}
                  {item.route ? ` · ${item.route}` : ''}
                </Text>
                <Text style={styles.medTime}>
                  {item.scheduledTime ? new Date(item.scheduledTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                  {item.actualTimeTaken ? ` · ${t(`${NS}.takenAt`, { time: new Date(item.actualTimeTaken).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) })}` : ''}
                </Text>
                {item.missedReason ? <Text style={styles.medReason}>{t(`${NS}.reasonLabel`, { reason: item.missedReason })}</Text> : null}
                {item.notes ? <Text style={styles.medDetail}>{item.notes}</Text> : null}
              </Card.Content>
            </Card>
          )}
        />
      </ScreenLayout>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  list: { padding: 16, paddingTop: 8, paddingBottom: 32 },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateCol: { flex: 1 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 10, color: '#6B7280', marginTop: 2, textAlign: 'center' },
  warningBanner: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, marginBottom: 12 },
  warningText: { fontSize: 12, color: '#B91C1C' },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  medName: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 },
  medDetail: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  medTime: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  medReason: { fontSize: 11, color: '#B91C1C', marginTop: 4 },
});
