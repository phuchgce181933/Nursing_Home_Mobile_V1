import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip, Button, Dialog, Portal, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMyShifts, useConfirmShift } from '../../hooks/useShifts';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { useToast } from '../../utils/toast';

const COLOR = '#0F5040';
const STATUS_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'published', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
];

export const MyShiftsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [filter, setFilter] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const shiftsQ = useMyShifts({ status: filter || undefined });
  const items = shiftsQ.data?.data?.data ?? [];
  const confirmMut = useConfirmShift();

  const handleConfirm = () => {
    if (!confirmId) return;
    confirmMut.mutate(confirmId, {
      onSuccess: () => { setConfirmId(null); toast('Đã xác nhận ca trực', 'success'); },
      onError: () => toast('Không thể xác nhận', 'error'),
    });
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.topRow}>
          <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation.goBack()} />
          <Text style={styles.topTitle}>Ca trực của tôi</Text>
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

      <ScreenLayout loading={shiftsQ.isLoading} error={shiftsQ.error ? (shiftsQ.error as Error).message : null}
        onRetry={shiftsQ.refetch} isEmpty={items.length === 0} emptyMessage="Không có ca trực nào">
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={shiftsQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined">
              <Card.Content>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.date}>
                      {item.date ? new Date(item.date).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' }) : ''}
                    </Text>
                    <View style={styles.timeRow}>
                      <MaterialCommunityIcons name="clock-outline" size={14} color="#6B7280" />
                      <Text style={styles.time}>{item.startTime ?? ''} - {item.endTime ?? ''}</Text>
                    </View>
                    {item.location ? (
                      <View style={styles.timeRow}>
                        <MaterialCommunityIcons name="map-marker-outline" size={14} color="#6B7280" />
                        <Text style={styles.location}>{item.location}</Text>
                      </View>
                    ) : null}
                    {item.shiftTemplateId?.name ? <Text style={styles.template}>{item.shiftTemplateId.name}</Text> : null}
                  </View>
                  <StatusBadge status={item.status} size="sm" />
                </View>
              </Card.Content>
              {item.status === 'published' ? (
                <Card.Actions>
                  <Button compact mode="contained" buttonColor={COLOR} onPress={() => setConfirmId(item._id)}>Xác nhận</Button>
                </Card.Actions>
              ) : null}
            </Card>
          )} />
      </ScreenLayout>

      <Portal>
        <Dialog visible={!!confirmId} onDismiss={() => setConfirmId(null)}>
          <Dialog.Title>Xác nhận ca trực?</Dialog.Title>
          <Dialog.Content><Text>Bạn xác nhận sẽ tham gia ca trực này.</Text></Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmId(null)}>Hủy</Button>
            <Button mode="contained" buttonColor={COLOR} onPress={handleConfirm} loading={confirmMut.isPending}>Xác nhận</Button>
          </Dialog.Actions>
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
  date: { fontSize: 14, fontWeight: '600', color: '#111827', textTransform: 'capitalize' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  time: { fontSize: 13, color: '#374151' },
  location: { fontSize: 12, color: '#6B7280' },
  template: { fontSize: 12, color: COLOR, marginTop: 4, fontStyle: 'italic' },
});
