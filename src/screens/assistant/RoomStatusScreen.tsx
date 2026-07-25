import React from 'react';
import { ScrollView, View, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { Text, Card, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { FACILITIES } from '../../api/endpoints';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { getStatusEntry } from '../../utils/statusMap';

const COLOR = '#6B4200';
const NS = 'assistant.roomStatus';

export const RoomStatusScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const roomsQ = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const res = await api.get(FACILITIES.BUILDINGS);
      return res.data;
    },
  });

  const facilities = roomsQ.data;
  const buildings = facilities?.buildings ?? facilities?.data ?? [];
  const allRooms: any[] = [];

  if (Array.isArray(buildings)) {
    buildings.forEach((b: any) => {
      (b.floors ?? []).forEach((f: any) => {
        (f.rooms ?? []).forEach((r: any) => {
          allRooms.push({ ...r, floorName: f.floorNumber ?? f.name, buildingName: b.name });
        });
      });
    });
  }

  const statusCounts = {
    available: allRooms.filter((r) => r.status === 'available').length,
    full: allRooms.filter((r) => r.status === 'full').length,
    maintenance: allRooms.filter((r) => r.status === 'maintenance').length,
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation?.goBack()} style={styles.backBtn} />
        <View>
          <Text style={styles.topTitle}>{t(`${NS}.title`)}</Text>
          <Text style={styles.topSub}>{t(`${NS}.roomCount`, { count: allRooms.length })}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={false} onRefresh={roomsQ.refetch} tintColor={COLOR} />}
      >
        <ScreenLayout
          loading={roomsQ.isLoading}
          error={roomsQ.error ? (roomsQ.error as Error).message : null}
          onRetry={roomsQ.refetch}
          isEmpty={allRooms.length === 0}
          emptyMessage={t(`${NS}.empty`)}
        >
          <View style={styles.summaryRow}>
            {[
              { label: t(`${NS}.statusAvailable`), count: statusCounts.available, color: '#065F46', bg: '#D1FAE5' },
              { label: t(`${NS}.statusFull`), count: statusCounts.full, color: '#1E40AF', bg: '#DBEAFE' },
              { label: t(`${NS}.statusMaintenance`), count: statusCounts.maintenance, color: '#92400E', bg: '#FFEDD5' },
            ].map((s, i) => (
              <Card key={i} style={[styles.summaryCard, { backgroundColor: s.bg }]}>
                <Card.Content style={styles.summaryContent}>
                  <Text style={[styles.summaryCount, { color: s.color }]}>{s.count}</Text>
                  <Text style={[styles.summaryLabel, { color: s.color }]}>{s.label}</Text>
                </Card.Content>
              </Card>
            ))}
          </View>

          <SectionHeader title={t(`${NS}.listTitle`)} roleColor={COLOR} />
          <View style={styles.roomGrid}>
            {allRooms.map((room) => {
              const entry = getStatusEntry(room.status);
              const label = entry.i18nKey ? t(entry.i18nKey, { defaultValue: room.status }) : room.status;
              return (
                <Pressable key={room._id} style={[styles.roomCard, { borderColor: entry.textColor }]}>
                  <Text style={styles.roomNumber}>{room.roomNumber}</Text>
                  <Text style={[styles.roomStatus, { color: entry.textColor }]}>{label}</Text>
                  <Text style={styles.roomOccupancy}>{room.occupiedCount}/{room.capacity}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScreenLayout>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 8, paddingBottom: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center' },
  backBtn: { margin: 0 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  topSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  body: { padding: 16, paddingBottom: 32 },
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryCard: { flex: 1, borderRadius: 12 },
  summaryContent: { alignItems: 'center', paddingVertical: 12 },
  summaryCount: { fontSize: 20, fontWeight: '700' },
  summaryLabel: { fontSize: 11, marginTop: 2 },
  roomGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roomCard: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    padding: 12,
    alignItems: 'center',
  },
  roomNumber: { fontSize: 16, fontWeight: '700', color: '#111827' },
  roomStatus: { fontSize: 11, marginTop: 4 },
  roomOccupancy: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
});
