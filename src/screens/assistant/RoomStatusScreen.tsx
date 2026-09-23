import React from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { CAREGIVER } from '../../api/endpoints';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { getStatusEntry, useStatusLabel } from '../../utils/statusMap';

const COLOR = '#6B4200';
const NS = 'assistant.roomStatus';

type Room = {
  _id: string;
  roomNumber: string;
  label: string | null;
  roomType?: string;
  status?: string;
  capacity: number;
  occupiedCount: number;
  building?: { name?: string; code?: string } | null;
  floor?: { label?: string; name?: string } | null;
  beds: { _id: string; bedCode: string; bedType?: string; status?: string }[];
  residents: { _id: string; fullName: string; residentCode?: string; bed?: { bedCode?: string } | null }[];
};

/**
 * Tình trạng phòng ốc — phạm vi hộ lý.
 *
 * Trước đây màn này gọi `GET /api/facilities/buildings`, vốn trả về danh sách
 * toà nhà phẳng (`code name address description isActive`) chứ không có
 * `floors[].rooms[]`, nên vòng lặp lồng nhau luôn ra 0 phòng. Endpoint đó cũng
 * không giới hạn theo người gọi nên không phải nguồn dữ liệu đúng cho hộ lý.
 *
 * Nguồn đúng là `GET /api/caregiver/residents/rooms`: chỉ những phòng đang có
 * cư dân thuộc `StaffProfile.assignedResidentIds` của chính người gọi, và trong
 * mỗi phòng cũng chỉ liệt kê các cư dân trong phạm vi đó.
 *
 * Mọi giá trị enum (`Room.status`, `Room.roomType`, `Bed.status`) đều đi qua
 * bảng nhãn dùng chung `status.*`, không in thẳng chuỗi backend.
 */
export const RoomStatusScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const statusLabel = useStatusLabel();

  const roomsQ = useQuery({
    queryKey: ['caregiverRooms'],
    queryFn: async () => {
      const res = await api.get(CAREGIVER.ROOMS);
      return res.data;
    },
  });

  const rooms: Room[] = roomsQ.data?.data ?? [];

  const statusCounts = {
    available: rooms.filter((r) => r.status === 'available').length,
    full: rooms.filter((r) => r.status === 'full').length,
    maintenance: rooms.filter((r) => r.status === 'maintenance').length,
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation?.goBack()} style={styles.backBtn} />
        <View>
          <Text style={styles.topTitle}>{t(`${NS}.title`)}</Text>
          <Text style={styles.topSub}>{t(`${NS}.roomCount`, { count: rooms.length })}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={roomsQ.isFetching} onRefresh={roomsQ.refetch} tintColor={COLOR} />}
      >
        {/* Không đẩy message kỹ thuật của axios ra giao diện. */}
        <ScreenLayout
          loading={roomsQ.isLoading}
          error={roomsQ.error ? t(`${NS}.loadError`) : null}
          onRetry={roomsQ.refetch}
          isEmpty={rooms.length === 0}
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

          {rooms.map((room) => {
            const entry = getStatusEntry(room.status);
            const area = [room.building?.name, room.floor?.name].filter(Boolean).join(' · ');
            return (
              <Card key={room._id} style={styles.roomCard} mode="outlined">
                <Card.Content>
                  <View style={styles.roomHeader}>
                    <View style={styles.roomHeaderLeft}>
                      <Text style={styles.roomTitle}>{room.label ?? room.roomNumber}</Text>
                      {area ? <Text style={styles.roomArea}>{area}</Text> : null}
                    </View>
                    <View style={[styles.statusChip, { backgroundColor: entry.bgColor }]}>
                      <Text style={[styles.statusChipText, { color: entry.textColor }]}>
                        {statusLabel(room.status)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.metaLine}>
                    {[
                      statusLabel(room.roomType),
                      t(`${NS}.occupancy`, { occupied: room.occupiedCount, capacity: room.capacity }),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>

                  {room.beds.length ? (
                    <View style={styles.block}>
                      <Text style={styles.blockTitle}>{t(`${NS}.bedsTitle`)}</Text>
                      <View style={styles.bedRow}>
                        {room.beds.map((bed) => {
                          const bedEntry = getStatusEntry(bed.status);
                          return (
                            <View key={bed._id} style={[styles.bedChip, { borderColor: bedEntry.textColor }]}>
                              <Text style={styles.bedCode}>{bed.bedCode}</Text>
                              <Text style={[styles.bedStatus, { color: bedEntry.textColor }]}>
                                {statusLabel(bed.status)}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.block}>
                    <Text style={styles.blockTitle}>{t(`${NS}.residentsTitle`)}</Text>
                    {room.residents.length ? (
                      room.residents.map((r) => (
                        <Text key={r._id} style={styles.residentLine}>
                          {[r.fullName, r.residentCode, r.bed?.bedCode].filter(Boolean).join(' · ')}
                        </Text>
                      ))
                    ) : (
                      <Text style={styles.residentLine}>{t(`${NS}.noResidents`)}</Text>
                    )}
                  </View>
                </Card.Content>
              </Card>
            );
          })}
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
  roomCard: { borderRadius: 12, marginBottom: 10, backgroundColor: '#fff' },
  roomHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  roomHeaderLeft: { flex: 1, paddingRight: 8 },
  roomTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  roomArea: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusChipText: { fontSize: 11, fontWeight: '600' },
  metaLine: { fontSize: 12, color: '#4B5563', marginTop: 8 },
  block: { marginTop: 10 },
  blockTitle: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4 },
  bedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  bedChip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center' },
  bedCode: { fontSize: 12, fontWeight: '600', color: '#111827' },
  bedStatus: { fontSize: 10, marginTop: 1 },
  residentLine: { fontSize: 13, color: '#374151', lineHeight: 19 },
});
