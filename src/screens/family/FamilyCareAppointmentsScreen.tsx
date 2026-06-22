import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { StatusBadge } from '../../components/shared/StatusBadge';

const COLOR = '#2E7D32';

const formatDate = (d: string) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }); }
  catch { return d; }
};
const formatTime = (d: string) => {
  if (!d) return '';
  try { return new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
};

export const FamilyCareAppointmentsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  const residentsQ = useQuery({
    queryKey: ['familyResidents'],
    queryFn: async () => (await api.get(FAMILY.RESIDENTS)).data,
  });
  const residents = residentsQ.data?.data ?? residentsQ.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId = selectedId ?? residents[0]?._id;

  const appointmentsQ = useQuery({
    queryKey: ['familyCareAppointments', activeId],
    queryFn: async () => (await api.get(FAMILY.CARE_APPOINTMENTS(activeId))).data,
    enabled: !!activeId,
  });

  const appointments = appointmentsQ.data?.data ?? appointmentsQ.data ?? [];
  const loading = residentsQ.isLoading || appointmentsQ.isLoading;

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Lịch hẹn khám</Text>
        <Text style={styles.topSub}>Các cuộc hẹn chăm sóc sức khỏe</Text>
      </View>

      {residents.length > 1 && (
        <View style={styles.chipRow}>
          {residents.map((r: any) => (
            <Chip key={r._id} selected={activeId === r._id} onPress={() => setSelectedId(r._id)}
              style={activeId === r._id ? { backgroundColor: COLOR } : undefined}
              textStyle={activeId === r._id ? { color: '#fff' } : undefined} compact>
              {r.fullName}
            </Chip>
          ))}
        </View>
      )}

      <ScreenLayout loading={loading} error={appointmentsQ.error ? (appointmentsQ.error as Error).message : null}
        onRetry={appointmentsQ.refetch} isEmpty={appointments.length === 0}
        emptyMessage="Không có lịch hẹn khám nào">
        <FlatList data={appointments} keyExtractor={(i: any, idx) => i._id ?? `${idx}`}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={appointmentsQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined">
              <Card.Content>
                <View style={styles.cardHeader}>
                  <View style={styles.typeBadge}>
                    <MaterialCommunityIcons name="stethoscope" size={16} color={COLOR} />
                    <Text style={styles.typeText}>{item.appointmentType ?? item.type ?? 'Khám'}</Text>
                  </View>
                  <StatusBadge status={item.status} size="sm" />
                </View>

                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="calendar" size={14} color="#6B7280" />
                  <Text style={styles.infoText}>
                    {formatDate(item.scheduledStartAt ?? item.date)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color="#6B7280" />
                  <Text style={styles.infoText}>
                    {formatTime(item.scheduledStartAt ?? item.startTime)}
                    {item.scheduledEndAt ? ` - ${formatTime(item.scheduledEndAt)}` : ''}
                  </Text>
                </View>

                {item.staffId?.fullName && (
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="doctor" size={14} color="#6B7280" />
                    <Text style={styles.infoText}>{item.staffId.fullName}</Text>
                  </View>
                )}

                {item.location && (
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="map-marker-outline" size={14} color="#6B7280" />
                    <Text style={styles.infoText}>{item.location}</Text>
                  </View>
                )}

                {item.notes && (
                  <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text>
                )}
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
  topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  topSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  chipRow: { flexDirection: 'row', gap: 6, padding: 12, flexWrap: 'wrap' },
  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 10, backgroundColor: '#fff' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  typeText: { fontSize: 11, fontWeight: '600', color: COLOR, textTransform: 'capitalize' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  infoText: { fontSize: 13, color: '#374151' },
  notes: { fontSize: 12, color: '#6B7280', marginTop: 6, fontStyle: 'italic' },
});
