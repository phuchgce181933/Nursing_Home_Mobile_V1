import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, ScrollView, Pressable } from 'react-native';
import { Text, Card, Button, FAB, Dialog, Portal, TextInput, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { CalendarPicker } from '../../components/shared/CalendarPicker';
import { useToast } from '../../utils/toast';

const COLOR = '#2E7D32';
const NS = 'family.visits';

export const FamilyVisitsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [form, setForm] = useState({ residentId: '', visitorName: '', visitorPhone: '', requestedDate: '', requestedTimeSlot: '', numberOfVisitors: '1', notes: '' });

  const residentsQ = useQuery({
    queryKey: ['familyResidents'],
    queryFn: async () => { const r = await api.get(FAMILY.RESIDENTS); return r.data; },
  });
  const residents = residentsQ.data?.data ?? residentsQ.data ?? [];

  const listQ = useQuery({ queryKey: ['residentVisits'], queryFn: async () => (await api.get(FAMILY.VISITS)).data });
  const items = listQ.data?.data ?? listQ.data ?? [];

  const openCreate = () => {
    setForm({ residentId: residents[0]?._id ?? '', visitorName: '', visitorPhone: '', requestedDate: '', requestedTimeSlot: '', numberOfVisitors: '1', notes: '' });
    setShowCreate(true);
  };

  const createMut = useMutation({
    mutationFn: async () => (await api.post(FAMILY.VISITS, { ...form, numberOfVisitors: Number(form.numberOfVisitors) || 1 })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['residentVisits'] }); setShowCreate(false); toast(t(`${NS}.toastCreated`), 'success'); },
    onError: () => toast(t(`${NS}.toastCreateError`), 'error'),
  });

  const cancelMut = useMutation({
    mutationFn: async () => (await api.patch(FAMILY.VISIT_CANCEL(cancelId!))).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['residentVisits'] }); setCancelId(null); toast(t(`${NS}.toastCancelled`), 'success'); },
    onError: () => toast(t(`${NS}.toastCancelError`), 'error'),
  });

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation?.goBack()} style={styles.backBtn} />
        <Text style={styles.topTitle}>{t(`${NS}.title`)}</Text>
      </View>
      <ScreenLayout loading={listQ.isLoading} error={listQ.error ? (listQ.error as Error).message : null} onRetry={listQ.refetch} isEmpty={items.length === 0} emptyMessage={t(`${NS}.empty`)}>
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={false} onRefresh={listQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined">
              <Card.Content>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.resident?.fullName ?? '--'}</Text>
                    <Text style={styles.sub}>{item.requestedDate ? new Date(item.requestedDate).toLocaleDateString('vi-VN') : ''} · {item.requestedTimeSlot ?? ''} · {t(`${NS}.visitorsCount`, { count: item.numberOfVisitors ?? 1 })}</Text>
                    <Text style={styles.sub}>{item.visitorName} · {item.visitorPhone}</Text>
                    {item.status === 'rejected' && item.rejectionReason ? (
                      <Text style={styles.rejectReason}>{t(`${NS}.rejectionReason`, { reason: item.rejectionReason })}</Text>
                    ) : null}
                  </View>
                  <StatusBadge status={item.status} size="sm" />
                </View>
              </Card.Content>
              {item.status === 'pending' || item.status === 'approved' ? (
                <Card.Actions><Button compact textColor="#991B1B" onPress={() => setCancelId(item._id)}>{t(`${NS}.cancel`)}</Button></Card.Actions>
              ) : null}
            </Card>
          )} />
      </ScreenLayout>
      <FAB icon="plus" style={[styles.fab, { backgroundColor: COLOR }]} color="#fff" onPress={openCreate} />

      <Portal>
        <Dialog visible={showCreate} onDismiss={() => setShowCreate(false)} style={{ borderRadius: 16 }}>
          <Dialog.Title>{t(`${NS}.createTitle`)}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 450 }}>
            <ScrollView>
              {residents.length > 1 ? (
                <View style={styles.chipRow}>
                  {residents.map((r: any) => (
                    <Pressable key={r._id} onPress={() => setForm(f => ({ ...f, residentId: r._id }))}
                      style={[styles.residentChip, form.residentId === r._id && { backgroundColor: COLOR }]}>
                      <Text style={[styles.residentChipText, form.residentId === r._id && { color: '#fff' }]}>{r.fullName}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <TextInput label={t(`${NS}.visitorNameLabel`)} mode="outlined" value={form.visitorName} onChangeText={v => setForm(f => ({ ...f, visitorName: v }))} dense style={styles.input} />
              <TextInput label={t(`${NS}.visitorPhoneLabel`)} mode="outlined" value={form.visitorPhone} onChangeText={v => setForm(f => ({ ...f, visitorPhone: v }))} dense keyboardType="phone-pad" style={styles.input} />
              <CalendarPicker label={t(`${NS}.requestedDateLabel`)} value={form.requestedDate} onChange={v => setForm(f => ({ ...f, requestedDate: v }))} color={COLOR} />
              <TextInput label={t(`${NS}.timeSlotLabel`)} mode="outlined" placeholder="14:00-15:00" value={form.requestedTimeSlot} onChangeText={v => setForm(f => ({ ...f, requestedTimeSlot: v }))} dense style={styles.input} />
              <TextInput label={t(`${NS}.visitorsLabel`)} mode="outlined" value={form.numberOfVisitors} onChangeText={v => setForm(f => ({ ...f, numberOfVisitors: v }))} dense keyboardType="numeric" style={styles.input} />
              <TextInput label={t(`${NS}.notesLabel`)} mode="outlined" value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} dense multiline style={styles.input} />
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowCreate(false)}>{t('common.cancel')}</Button>
            <Button mode="contained" buttonColor={COLOR} onPress={() => createMut.mutate()} loading={createMut.isPending}
              disabled={!form.residentId || !form.visitorName || !form.visitorPhone || !form.requestedDate}>{t(`${NS}.submit`)}</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={!!cancelId} onDismiss={() => setCancelId(null)}>
          <Dialog.Title>{t(`${NS}.cancelConfirmTitle`)}</Dialog.Title>
          <Dialog.Actions><Button onPress={() => setCancelId(null)}>{t('common.cancel')}</Button><Button mode="contained" buttonColor="#991B1B" onPress={() => cancelMut.mutate()} loading={cancelMut.isPending}>{t(`${NS}.confirmCancel`)}</Button></Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 8, paddingBottom: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center' },
  backBtn: { margin: 0 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  list: { padding: 16, paddingBottom: 80 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '600', color: '#111827' },
  sub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  rejectReason: { fontSize: 11, color: '#991B1B', marginTop: 4, fontStyle: 'italic' },
  fab: { position: 'absolute', bottom: 16, right: 16 },
  input: { marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  residentChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#E8F5E9' },
  residentChipText: { fontSize: 13, fontWeight: '500', color: '#2E7D32' },
});
