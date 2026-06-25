import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip, IconButton, Dialog, Portal, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { ADMIN_ADMISSIONS } from '../../api/endpoints';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';

const COLOR = '#0F5040';
const STATUS_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'new_request', label: 'Mới' },
  { value: 'consulting', label: 'Tư vấn' },
  { value: 'assessing', label: 'Đánh giá' },
  { value: 'contracting', label: 'Hợp đồng' },
  { value: 'checked_in', label: 'Đã nhận' },
  { value: 'cancelled', label: 'Đã hủy' },
];

export const AdmissionListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const listQ = useQuery({
    queryKey: ['adminAdmissions', filter],
    queryFn: async () => {
      const res = await api.get(ADMIN_ADMISSIONS.LIST, { params: { status: filter || undefined } });
      return res.data;
    },
  });
  const items = listQ.data?.data ?? listQ.data ?? [];

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.topRow}>
          <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation.goBack()} />
          <Text style={styles.topTitle}>Yêu cầu nhập viện</Text>
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

      <ScreenLayout loading={listQ.isLoading} error={listQ.error ? (listQ.error as Error).message : null}
        onRetry={listQ.refetch} isEmpty={items.length === 0} emptyMessage="Không có yêu cầu nhập viện">
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={listQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined" onPress={() => setSelectedItem(item)}>
              <Card.Content>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.applicant?.fullName ?? '--'}</Text>
                    <Text style={styles.code}>{item.requestCode ?? ''}</Text>
                    <Text style={styles.sub}>
                      {item.applicant?.relationshipToRequester ?? ''} · {item.preferredAdmissionDate ? new Date(item.preferredAdmissionDate).toLocaleDateString('vi-VN') : ''}
                    </Text>
                    {item.reasonForAdmission ? <Text style={styles.reason} numberOfLines={2}>{item.reasonForAdmission}</Text> : null}
                  </View>
                  <StatusBadge status={item.status} size="sm" />
                </View>
              </Card.Content>
            </Card>
          )} />
      </ScreenLayout>

      <Portal>
        <Dialog visible={!!selectedItem} onDismiss={() => setSelectedItem(null)} style={{ borderRadius: 16 }}>
          <Dialog.Title>Chi tiết yêu cầu</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 400 }}>
            {selectedItem ? (
              <View style={{ padding: 4 }}>
                <Text style={styles.dLabel}>Mã: <Text style={styles.dValue}>{selectedItem.requestCode ?? ''}</Text></Text>
                <Text style={styles.dLabel}>Họ tên: <Text style={styles.dValue}>{selectedItem.applicant?.fullName ?? ''}</Text></Text>
                <Text style={styles.dLabel}>Quan hệ: <Text style={styles.dValue}>{selectedItem.applicant?.relationshipToRequester ?? ''}</Text></Text>
                {selectedItem.applicant?.dateOfBirth && <Text style={styles.dLabel}>Ngày sinh: <Text style={styles.dValue}>{new Date(selectedItem.applicant.dateOfBirth).toLocaleDateString('vi-VN')}</Text></Text>}
                {selectedItem.applicant?.gender && <Text style={styles.dLabel}>Giới tính: <Text style={styles.dValue}>{selectedItem.applicant.gender === 'male' ? 'Nam' : selectedItem.applicant.gender === 'female' ? 'Nữ' : selectedItem.applicant.gender}</Text></Text>}
                {selectedItem.preferredAdmissionDate && <Text style={styles.dLabel}>Ngày nhập mong muốn: <Text style={styles.dValue}>{new Date(selectedItem.preferredAdmissionDate).toLocaleDateString('vi-VN')}</Text></Text>}
                {selectedItem.reasonForAdmission && <Text style={styles.dLabel}>Lý do: <Text style={styles.dValue}>{selectedItem.reasonForAdmission}</Text></Text>}
                {selectedItem.requestedByPhone && <Text style={styles.dLabel}>SĐT: <Text style={styles.dValue}>{selectedItem.requestedByPhone}</Text></Text>}
                {selectedItem.notes && <Text style={styles.dLabel}>Ghi chú: <Text style={styles.dValue}>{selectedItem.notes}</Text></Text>}
                {selectedItem.applicant?.allergies?.length > 0 && <Text style={styles.dLabel}>Dị ứng: <Text style={styles.dValue}>{selectedItem.applicant.allergies.join(', ')}</Text></Text>}
                {selectedItem.applicant?.chronicConditions?.length > 0 && <Text style={styles.dLabel}>Bệnh mãn tính: <Text style={styles.dValue}>{selectedItem.applicant.chronicConditions.join(', ')}</Text></Text>}
                {selectedItem.consultationNotes && <Text style={styles.dLabel}>Ghi chú tư vấn: <Text style={styles.dValue}>{selectedItem.consultationNotes}</Text></Text>}
                <Text style={[styles.dLabel, { marginTop: 8 }]}>Ngày tạo: <Text style={styles.dValue}>{selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleString('vi-VN') : ''}</Text></Text>
              </View>
            ) : null}
          </Dialog.ScrollArea>
          <Dialog.Actions><Button onPress={() => setSelectedItem(null)}>Đóng</Button></Dialog.Actions>
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
  name: { fontSize: 14, fontWeight: '600', color: '#111827' },
  code: { fontSize: 11, color: COLOR, marginTop: 1 },
  sub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  reason: { fontSize: 12, color: '#374151', marginTop: 4 },
  dLabel: { fontSize: 13, fontWeight: '500', color: '#6B7280', marginBottom: 4 },
  dValue: { fontWeight: '400', color: '#111827' },
});
