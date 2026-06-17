import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Button, Chip, FAB, Dialog, Portal, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { INCIDENTS } from '../../api/endpoints';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { useToast } from '../../utils/toast';

const COLOR = '#0F5040';
const SEV_FILTERS = [{ value: '', label: 'Tất cả' }, { value: 'low', label: 'Thấp' }, { value: 'medium', label: 'TB' }, { value: 'high', label: 'Cao' }, { value: 'critical', label: 'Nguy kịch' }];
const SEV_COLORS: Record<string, string> = { low: '#065F46', medium: '#92400E', high: '#991B1B', critical: '#991B1B' };
const NEXT_STATUS: Record<string, string> = { open: 'investigating', investigating: 'resolved', resolved: 'closed' };

export const IncidentScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ incidentType: '', description: '', severity: 'medium', location: '' });

  const listQ = useQuery({ queryKey: ['incidents', filter], queryFn: async () => (await api.get(INCIDENTS.LIST, { params: { severity: filter || undefined } })).data });
  const items = listQ.data?.data ?? listQ.data ?? [];

  const createMut = useMutation({
    mutationFn: async () => (await api.post(INCIDENTS.CREATE, { ...form, incidentAt: new Date().toISOString() })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incidents'] }); setShowCreate(false); setForm({ incidentType: '', description: '', severity: 'medium', location: '' }); toast('Đã báo cáo sự cố', 'success'); },
    onError: () => toast('Không thể báo cáo', 'error'),
  });

  const statusMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => (await api.patch(INCIDENTS.UPDATE_STATUS(id), { status })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incidents'] }); toast('Đã cập nhật trạng thái', 'success'); },
  });

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}><Text style={styles.topTitle}>Quản lý sự cố</Text></View>
      <View style={styles.filterRow}>
        {SEV_FILTERS.map(f => <Chip key={f.value} selected={filter === f.value} onPress={() => setFilter(f.value)} style={filter === f.value ? { backgroundColor: COLOR } : undefined} textStyle={filter === f.value ? { color: '#fff' } : undefined} compact>{f.label}</Chip>)}
      </View>
      <ScreenLayout loading={listQ.isLoading} error={listQ.error ? (listQ.error as Error).message : null} onRetry={listQ.refetch} isEmpty={items.length === 0} emptyMessage="Không có sự cố nào">
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={false} onRefresh={listQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => {
            const next = NEXT_STATUS[item.status];
            return (
              <Card style={styles.card} mode="outlined">
                <Card.Content>
                  <View style={styles.row}>
                    <MaterialCommunityIcons name="alert-circle" size={24} color={SEV_COLORS[item.severity] ?? '#6B7280'} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.name}>{item.incidentType}</Text>
                      <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
                      <Text style={styles.sub}>{item.incidentAt ? new Date(item.incidentAt).toLocaleString('vi-VN') : ''}{item.location ? ` · ${item.location}` : ''}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <StatusBadge status={item.severity} size="sm" />
                      <StatusBadge status={item.status} size="sm" />
                    </View>
                  </View>
                </Card.Content>
                {next ? (
                  <Card.Actions><Button compact textColor={COLOR} onPress={() => statusMut.mutate({ id: item._id, status: next })}>{next === 'investigating' ? 'Xử lý' : next === 'resolved' ? 'Giải quyết' : 'Đóng'}</Button></Card.Actions>
                ) : null}
              </Card>
            );
          }} />
      </ScreenLayout>
      <FAB icon="plus" style={[styles.fab, { backgroundColor: COLOR }]} color="#fff" onPress={() => setShowCreate(true)} />

      <Portal>
        <Dialog visible={showCreate} onDismiss={() => setShowCreate(false)} style={{ borderRadius: 16 }}>
          <Dialog.Title>Báo cáo sự cố</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 380 }}>
            <TextInput label="Loại sự cố *" mode="outlined" value={form.incidentType} onChangeText={v => setForm(f => ({ ...f, incidentType: v }))} dense style={styles.input} placeholder="Té ngã, phản ứng thuốc..." />
            <TextInput label="Mô tả chi tiết *" mode="outlined" value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} dense multiline numberOfLines={3} style={styles.input} />
            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>Mức độ:</Text>
            <View style={styles.sevRow}>
              {(['low', 'medium', 'high', 'critical'] as const).map(s => (
                <Chip key={s} selected={form.severity === s} onPress={() => setForm(f => ({ ...f, severity: s }))} compact style={form.severity === s ? { backgroundColor: SEV_COLORS[s] } : undefined} textStyle={form.severity === s ? { color: '#fff' } : undefined}>
                  {s === 'low' ? 'Thấp' : s === 'medium' ? 'TB' : s === 'high' ? 'Cao' : 'Nguy kịch'}
                </Chip>
              ))}
            </View>
            <TextInput label="Vị trí" mode="outlined" value={form.location} onChangeText={v => setForm(f => ({ ...f, location: v }))} dense style={styles.input} placeholder="Phòng 101, Hành lang..." />
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowCreate(false)}>Hủy</Button>
            <Button mode="contained" buttonColor={COLOR} onPress={() => createMut.mutate()} loading={createMut.isPending} disabled={!form.incidentType || !form.description}>Báo cáo</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' }, topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 }, topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' }, filterRow: { flexDirection: 'row', gap: 6, padding: 12, flexWrap: 'wrap' }, list: { padding: 16, paddingBottom: 80 }, card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' }, row: { flexDirection: 'row', alignItems: 'flex-start' }, name: { fontSize: 14, fontWeight: '600', color: '#111827' }, desc: { fontSize: 12, color: '#374151', marginTop: 2 }, sub: { fontSize: 11, color: '#9CA3AF', marginTop: 4 }, fab: { position: 'absolute', bottom: 16, right: 16 }, input: { marginBottom: 8 }, sevRow: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
});
