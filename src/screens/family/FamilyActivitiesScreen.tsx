import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip, Button, Dialog, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { useToast } from '../../utils/toast';

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

const CATEGORY_ICONS: Record<string, string> = {
  exercise: 'dumbbell',
  social: 'account-group',
  entertainment: 'music',
  education: 'school',
  therapy: 'meditation',
  outdoor: 'tree',
};

export const FamilyActivitiesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [detailItem, setDetailItem] = useState<any>(null);

  const residentsQ = useQuery({
    queryKey: ['familyResidents'],
    queryFn: async () => (await api.get(FAMILY.RESIDENTS)).data,
  });
  const residents = residentsQ.data?.data ?? residentsQ.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId = selectedId ?? residents[0]?._id;

  const activitiesQ = useQuery({
    queryKey: ['familyActivities', activeId, statusFilter],
    queryFn: async () => {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.get(FAMILY.ACTIVITIES(activeId), { params });
      return res.data;
    },
    enabled: !!activeId,
  });

  const activities = activitiesQ.data?.data ?? activitiesQ.data ?? [];
  const loading = residentsQ.isLoading || activitiesQ.isLoading;

  const STATUS_FILTERS = [
    { value: '', label: 'Tất cả' },
    { value: 'scheduled', label: 'Sắp tới' },
    { value: 'ongoing', label: 'Đang diễn ra' },
    { value: 'completed', label: 'Đã xong' },
  ];

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Hoạt động</Text>
        <Text style={styles.topSub}>Lịch hoạt động của người thân</Text>
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

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <Chip key={f.value} selected={statusFilter === f.value} onPress={() => setStatusFilter(f.value)}
            style={[styles.filterChip, statusFilter === f.value && { backgroundColor: COLOR }]}
            textStyle={statusFilter === f.value ? { color: '#fff' } : undefined} compact>
            {f.label}
          </Chip>
        ))}
      </View>

      <ScreenLayout loading={loading} error={activitiesQ.error ? (activitiesQ.error as Error).message : null}
        onRetry={activitiesQ.refetch} isEmpty={activities.length === 0}
        emptyMessage="Không có hoạt động nào">
        <FlatList data={activities} keyExtractor={(i: any, idx) => i._id ?? `${idx}`}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={activitiesQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => {
            const icon = CATEGORY_ICONS[item.category] ?? 'calendar-star';
            return (
              <Card style={styles.card} mode="outlined" onPress={() => setDetailItem(item)}>
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <View style={styles.catBadge}>
                      <MaterialCommunityIcons name={icon as any} size={16} color={COLOR} />
                      <Text style={styles.catText}>{item.category ?? 'Hoạt động'}</Text>
                    </View>
                    <StatusBadge status={item.status} size="sm" />
                  </View>
                  <Text style={styles.actTitle}>{item.title ?? item.name ?? 'Hoạt động'}</Text>
                  <View style={styles.metaRow}>
                    <MaterialCommunityIcons name="calendar" size={13} color="#6B7280" />
                    <Text style={styles.metaText}>{formatDate(item.startDate ?? item.date)}</Text>
                    {(item.startTime || item.startDate) && (
                      <>
                        <MaterialCommunityIcons name="clock-outline" size={13} color="#6B7280" />
                        <Text style={styles.metaText}>{item.startTime ?? formatTime(item.startDate)}</Text>
                      </>
                    )}
                  </View>
                  {item.location && (
                    <View style={styles.metaRow}>
                      <MaterialCommunityIcons name="map-marker-outline" size={13} color="#6B7280" />
                      <Text style={styles.metaText}>{item.location}</Text>
                    </View>
                  )}
                  {item.description && <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>}
                </Card.Content>
              </Card>
            );
          }}
        />
      </ScreenLayout>

      <Portal>
        <Dialog visible={!!detailItem} onDismiss={() => setDetailItem(null)} style={{ borderRadius: 16 }}>
          <Dialog.Title>{detailItem?.title ?? 'Chi tiết hoạt động'}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 350 }}>
            <View style={{ padding: 8, gap: 10 }}>
              {detailItem?.status && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Trạng thái:</Text>
                  <StatusBadge status={detailItem.status} size="sm" />
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Ngày:</Text>
                <Text style={styles.detailValue}>{formatDate(detailItem?.startDate ?? detailItem?.date)}</Text>
              </View>
              {detailItem?.startTime && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Giờ:</Text>
                  <Text style={styles.detailValue}>{detailItem.startTime} - {detailItem.endTime ?? ''}</Text>
                </View>
              )}
              {detailItem?.location && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Địa điểm:</Text>
                  <Text style={styles.detailValue}>{detailItem.location}</Text>
                </View>
              )}
              {detailItem?.duration && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Thời lượng:</Text>
                  <Text style={styles.detailValue}>{detailItem.duration} phút</Text>
                </View>
              )}
              {detailItem?.participantCount != null && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Số người:</Text>
                  <Text style={styles.detailValue}>{detailItem.participantCount}</Text>
                </View>
              )}
              {detailItem?.description && (
                <View>
                  <Text style={styles.detailLabel}>Mô tả:</Text>
                  <Text style={[styles.detailValue, { marginTop: 4 }]}>{detailItem.description}</Text>
                </View>
              )}
            </View>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setDetailItem(null)}>Đóng</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  topSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  chipRow: { flexDirection: 'row', gap: 6, padding: 12, paddingBottom: 4, flexWrap: 'wrap' },
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingBottom: 4, flexWrap: 'wrap' },
  filterChip: { borderRadius: 20 },
  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 10, backgroundColor: '#fff' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  catText: { fontSize: 11, fontWeight: '600', color: COLOR, textTransform: 'capitalize' },
  actTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  metaText: { fontSize: 12, color: '#6B7280', marginRight: 8 },
  desc: { fontSize: 12, color: '#6B7280', marginTop: 4, fontStyle: 'italic' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  detailValue: { fontSize: 13, color: '#111827' },
});
