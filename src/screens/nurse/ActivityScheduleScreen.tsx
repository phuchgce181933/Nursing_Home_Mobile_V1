import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip, IconButton, Dialog, Portal, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useActivities, useActivityDetail } from '../../hooks/useActivities';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';

const COLOR = '#0F5040';
const STATUS_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'scheduled', label: 'Lên lịch' },
  { value: 'ongoing', label: 'Đang diễn ra' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
];

export const ActivityScheduleScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activitiesQ = useActivities({ status: filter || undefined });
  const items = activitiesQ.data?.data ?? activitiesQ.data ?? [];

  const detailQ = useActivityDetail(selectedId ?? undefined);
  const detail = detailQ.data?.data ?? detailQ.data;

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.topRow}>
          <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation.goBack()} />
          <Text style={styles.topTitle}>Hoạt động</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(f => (
          <Chip key={f.value} selected={filter === f.value} onPress={() => setFilter(f.value)}
            style={filter === f.value ? { backgroundColor: COLOR } : undefined}
            textStyle={filter === f.value ? { color: '#fff' } : undefined} compact>{f.label}</Chip>
        ))}
      </View>

      <ScreenLayout loading={activitiesQ.isLoading} error={activitiesQ.error ? (activitiesQ.error as Error).message : null}
        onRetry={activitiesQ.refetch} isEmpty={items.length === 0} emptyMessage="Không có hoạt động nào">
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={activitiesQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined" onPress={() => setSelectedId(item._id)}>
              <Card.Content>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{item.title}</Text>
                    {item.category ? <Text style={styles.category}>{item.category}</Text> : null}
                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="calendar-outline" size={14} color="#6B7280" />
                      <Text style={styles.info}>
                        {item.scheduledAt ? new Date(item.scheduledAt).toLocaleString('vi-VN') : ''}
                      </Text>
                    </View>
                    {item.location ? (
                      <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="map-marker-outline" size={14} color="#6B7280" />
                        <Text style={styles.info}>{item.location}</Text>
                      </View>
                    ) : null}
                    {item.durationMinutes ? (
                      <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="timer-outline" size={14} color="#6B7280" />
                        <Text style={styles.info}>{item.durationMinutes} phút</Text>
                      </View>
                    ) : null}
                    {item.participants?.length > 0 && (
                      <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="account-group-outline" size={14} color="#6B7280" />
                        <Text style={styles.info}>{item.participants.length} người tham gia</Text>
                      </View>
                    )}
                  </View>
                  <StatusBadge status={item.status} size="sm" />
                </View>
              </Card.Content>
            </Card>
          )} />
      </ScreenLayout>

      <Portal>
        <Dialog visible={!!selectedId} onDismiss={() => setSelectedId(null)} style={{ borderRadius: 16 }}>
          <Dialog.Title>{detail?.title ?? 'Chi tiết hoạt động'}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 400 }}>
            {detail ? (
              <View style={{ padding: 4 }}>
                {detail.category ? <Text style={styles.detailLabel}>Danh mục: <Text style={styles.detailValue}>{detail.category}</Text></Text> : null}
                {detail.scheduledAt ? <Text style={styles.detailLabel}>Thời gian: <Text style={styles.detailValue}>{new Date(detail.scheduledAt).toLocaleString('vi-VN')}</Text></Text> : null}
                {detail.location ? <Text style={styles.detailLabel}>Địa điểm: <Text style={styles.detailValue}>{detail.location}</Text></Text> : null}
                {detail.durationMinutes ? <Text style={styles.detailLabel}>Thời lượng: <Text style={styles.detailValue}>{detail.durationMinutes} phút</Text></Text> : null}
                {detail.description ? <Text style={[styles.detailLabel, { marginTop: 8 }]}>Mô tả:{'\n'}<Text style={styles.detailValue}>{detail.description}</Text></Text> : null}
                {detail.participants?.length > 0 && (
                  <>
                    <Text style={[styles.detailLabel, { marginTop: 8 }]}>Người tham gia ({detail.participants.length}):</Text>
                    {detail.participants.slice(0, 10).map((p: any, i: number) => (
                      <Text key={i} style={styles.participant}>• {p.residentId?.fullName ?? p.fullName ?? `Cư dân ${i + 1}`}</Text>
                    ))}
                  </>
                )}
              </View>
            ) : <Text style={{ color: '#9CA3AF' }}>Đang tải...</Text>}
          </Dialog.ScrollArea>
          <Dialog.Actions><Button onPress={() => setSelectedId(null)}>Đóng</Button></Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 4, paddingBottom: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  filterRow: { flexDirection: 'row', gap: 6, padding: 12, flexWrap: 'wrap' },
  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: '600', color: '#111827' },
  category: { fontSize: 12, color: COLOR, marginTop: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  info: { fontSize: 12, color: '#6B7280' },
  detailLabel: { fontSize: 13, fontWeight: '500', color: '#6B7280', marginBottom: 4 },
  detailValue: { fontWeight: '400', color: '#111827' },
  participant: { fontSize: 12, color: '#374151', marginLeft: 8 },
});
