import React, { useState } from 'react';
import { View, ScrollView, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { StatusBadge } from '../../components/shared/StatusBadge';

const COLOR = '#2E7D32';

const formatDate = (d: string) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return d; }
};

export const FamilyMedicationsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'meds' | 'prescriptions'>('meds');

  const residentsQ = useQuery({
    queryKey: ['familyResidents'],
    queryFn: async () => (await api.get(FAMILY.RESIDENTS)).data,
  });
  const residents = residentsQ.data?.data ?? residentsQ.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId = selectedId ?? residents[0]?._id;

  const medsQ = useQuery({
    queryKey: ['familyMeds', activeId],
    queryFn: async () => (await api.get(FAMILY.MEDICATIONS(activeId))).data,
    enabled: !!activeId,
  });

  const prescQ = useQuery({
    queryKey: ['familyPrescriptions', activeId],
    queryFn: async () => (await api.get(FAMILY.PRESCRIPTIONS(activeId))).data,
    enabled: !!activeId,
  });

  const meds = medsQ.data?.data ?? medsQ.data ?? [];
  const prescriptions = prescQ.data?.data ?? prescQ.data ?? [];
  const loading = residentsQ.isLoading || (tab === 'meds' ? medsQ.isLoading : prescQ.isLoading);
  const refetch = () => { medsQ.refetch(); prescQ.refetch(); };

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Thuốc & Đơn thuốc</Text>
      </View>

      {residents.length > 0 && (
        <View style={styles.residentBar}>
          {residents.length === 1 ? (
            <View style={styles.singleResident}>
              <MaterialCommunityIcons name="account-outline" size={18} color={COLOR} />
              <Text style={styles.singleResidentName}>{residents[0].fullName}</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {residents.map((r: any) => (
                <Chip key={r._id} selected={activeId === r._id} onPress={() => setSelectedId(r._id)}
                  style={[styles.resChip, activeId === r._id && { backgroundColor: COLOR }]}
                  textStyle={activeId === r._id ? { color: '#fff' } : undefined} compact>
                  {r.fullName}
                </Chip>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      <View style={styles.tabRow}>
        <Chip selected={tab === 'meds'} onPress={() => setTab('meds')}
          style={tab === 'meds' ? { backgroundColor: COLOR } : undefined}
          textStyle={tab === 'meds' ? { color: '#fff' } : undefined}>
          Thuốc hiện tại
        </Chip>
        <Chip selected={tab === 'prescriptions'} onPress={() => setTab('prescriptions')}
          style={tab === 'prescriptions' ? { backgroundColor: COLOR } : undefined}
          textStyle={tab === 'prescriptions' ? { color: '#fff' } : undefined}>
          Đơn thuốc
        </Chip>
      </View>

      <ScreenLayout loading={loading} error={medsQ.error ? (medsQ.error as Error).message : null} onRetry={refetch}
        isEmpty={tab === 'meds' ? meds.length === 0 : prescriptions.length === 0}
        emptyMessage={tab === 'meds' ? 'Không có thuốc đang sử dụng' : 'Không có đơn thuốc'}>
        {tab === 'meds' ? (
          <FlatList data={meds} keyExtractor={(i: any, idx) => i._id ?? `${idx}`}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={COLOR} />}
            renderItem={({ item }) => (
              <Card style={styles.card} mode="outlined">
                <Card.Content style={styles.medRow}>
                  <View style={styles.medIcon}>
                    <MaterialCommunityIcons name="pill" size={20} color={COLOR} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medName}>{item.medicationName ?? item.name ?? 'Thuốc'}</Text>
                    <Text style={styles.medSub}>
                      {item.dosage ?? ''}{item.frequency ? ` · ${item.frequency}` : ''}{item.route ? ` · ${item.route}` : ''}
                    </Text>
                    {item.instructions && <Text style={styles.medNote} numberOfLines={2}>{item.instructions}</Text>}
                  </View>
                  {item.status && <StatusBadge status={item.status} size="sm" />}
                </Card.Content>
              </Card>
            )}
          />
        ) : (
          <FlatList data={prescriptions} keyExtractor={(i: any, idx) => i._id ?? `${idx}`}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={COLOR} />}
            renderItem={({ item }) => (
              <Card style={styles.card} mode="outlined">
                <Card.Content>
                  <View style={styles.prescHeader}>
                    <Text style={styles.prescTitle}>{item.diagnosis ?? 'Đơn thuốc'}</Text>
                    {item.status && <StatusBadge status={item.status} size="sm" />}
                  </View>
                  <Text style={styles.prescMeta}>
                    BS: {item.prescribedBy?.fullName ?? '—'} · {formatDate(item.createdAt)}
                    {item.validUntil ? ` · HSD: ${formatDate(item.validUntil)}` : ''}
                  </Text>
                  {(item.items ?? item.medications ?? []).map((med: any, i: number) => (
                    <View key={i} style={styles.prescItem}>
                      <MaterialCommunityIcons name="pill" size={14} color="#6B7280" />
                      <Text style={styles.prescItemText}>
                        {med.medicationName ?? med.name} — {med.dosage}{med.frequency ? ` · ${med.frequency}` : ''}
                      </Text>
                    </View>
                  ))}
                </Card.Content>
              </Card>
            )}
          />
        )}
      </ScreenLayout>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  residentBar: { paddingHorizontal: 12, paddingVertical: 8 },
  singleResident: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E8F5E9', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  singleResidentName: { fontSize: 14, fontWeight: '600', color: COLOR },
  resChip: { marginRight: 8, borderRadius: 20 },
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 4 },
  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  medRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  medIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  medName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  medSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  medNote: { fontSize: 11, color: '#9CA3AF', marginTop: 2, fontStyle: 'italic' },
  prescHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  prescTitle: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 },
  prescMeta: { fontSize: 12, color: '#6B7280', marginBottom: 8 },
  prescItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  prescItemText: { fontSize: 12, color: '#374151' },
});
