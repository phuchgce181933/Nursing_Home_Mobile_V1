import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Button, Chip, FAB, Dialog, Portal, TextInput, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { CAREGIVER } from '../../api/endpoints';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { useToast } from '../../utils/toast';
import { formatLocalDate } from '../../utils/date';

const COLOR = '#6B4200';
const NS = 'assistant.hygiene';
const today = () => formatLocalDate(new Date());
const PERSONAL_TYPES = ['bathing', 'oral_care', 'grooming', 'toileting', 'diaper_change'];
const ENV_TYPES = ['room_tidy', 'bathroom_clean', 'linen_change', 'laundry'];

export const HygieneScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ residentId: '', activityCategory: 'personal', activityType: 'bathing', completionStatus: 'completed', notes: '' });

  const TYPE_LABEL: Record<string, string> = {
    bathing: t(`${NS}.typeBathing`), oral_care: t(`${NS}.typeOralCare`), grooming: t(`${NS}.typeGrooming`),
    toileting: t(`${NS}.typeToileting`), diaper_change: t(`${NS}.typeDiaperChange`), room_tidy: t(`${NS}.typeRoomTidy`),
    bathroom_clean: t(`${NS}.typeBathroomClean`), linen_change: t(`${NS}.typeLinenChange`), laundry: t(`${NS}.typeLaundry`),
  };
  const CAT_LABEL: Record<string, string> = { personal: t(`${NS}.catPersonal`), environment: t(`${NS}.catEnvironment`) };
  const STATUS_OPTIONS: Record<string, string> = {
    completed: t('status.completed'), partial: t('status.partial'), refused: t('status.refused'), assisted: t('status.assisted'),
  };

  const listQ = useQuery({ queryKey: ['hygiene', today()], queryFn: async () => (await api.get(CAREGIVER.HYGIENE, { params: { workDate: today() } })).data });
  const residentsQ = useQuery({ queryKey: ['hygieneResidents'], queryFn: async () => (await api.get(CAREGIVER.HYGIENE_RESIDENTS)).data });
  const items = listQ.data?.data ?? listQ.data ?? [];
  const residents = residentsQ.data?.data ?? residentsQ.data ?? [];
  const types = form.activityCategory === 'personal' ? PERSONAL_TYPES : ENV_TYPES;

  const saveMut = useMutation({
    mutationFn: async () => {
      if (editingId) {
        return (await api.put(CAREGIVER.HYGIENE_DETAIL(editingId), {
          activityType: form.activityType,
          completionStatus: form.completionStatus,
          notes: form.notes,
        })).data;
      }
      return (await api.post(CAREGIVER.HYGIENE, { ...form, workDate: today() })).data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hygiene'] }); setShowCreate(false); setEditingId(null); toast(t(`${NS}.toastRecorded`), 'success'); },
    onError: (e: any) => toast(e.response?.data?.message ?? t(`${NS}.toastRecordError`), 'error'),
  });

  const openEdit = (item: any) => {
    setEditingId(item._id);
    setForm({
      residentId: typeof item.residentId === 'object' ? item.residentId?._id : item.residentId,
      activityCategory: item.activityCategory,
      activityType: item.activityType,
      completionStatus: item.completionStatus,
      notes: item.notes || '',
    });
    setShowCreate(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ residentId: '', activityCategory: 'personal', activityType: 'bathing', completionStatus: 'completed', notes: '' });
    setShowCreate(true);
  };

  const deleteMut = useMutation({
    mutationFn: async () => (await api.delete(CAREGIVER.HYGIENE_DETAIL(deleteId!))).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hygiene'] }); setDeleteId(null); toast(t(`${NS}.toastDeleted`), 'success'); },
    onError: () => toast(t(`${NS}.toastDeleteError`), 'error'),
  });

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation?.goBack()} style={styles.backBtn} />
        <View><Text style={styles.topTitle}>{t(`${NS}.title`)}</Text><Text style={styles.topSub}>{today()}</Text></View>
      </View>
      <ScreenLayout loading={listQ.isLoading} error={listQ.error ? (listQ.error as Error).message : null} onRetry={listQ.refetch} isEmpty={items.length === 0} emptyMessage={t(`${NS}.empty`)}>
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={listQ.isFetching} onRefresh={listQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined" onPress={() => openEdit(item)} onLongPress={() => setDeleteId(item._id)}>
              <Card.Content style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.residentId?.fullName ?? '--'}</Text>
                  <Text style={styles.sub}>{CAT_LABEL[item.activityCategory] ?? item.activityCategory} · {TYPE_LABEL[item.activityType] ?? item.activityType}</Text>
                  {item.notes ? <Text style={styles.notes} numberOfLines={1}>{item.notes}</Text> : null}
                </View>
                <StatusBadge status={item.completionStatus} size="sm" />
              </Card.Content>
            </Card>
          )} />
      </ScreenLayout>
      <FAB icon="plus" style={[styles.fab, { backgroundColor: COLOR }]} color="#fff" onPress={openCreate} />

      <Portal>
        <Dialog visible={showCreate} onDismiss={() => { setShowCreate(false); setEditingId(null); }} style={{ borderRadius: 16 }}>
          <Dialog.Title>{editingId ? t(`${NS}.editTitle`, 'Cập nhật hoạt động') : t(`${NS}.createTitle`)}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 420 }}>
            {!editingId && (
              <>
                <Text style={styles.label}>{t(`${NS}.residentLabel`)}</Text>
                <View style={styles.chipRow}>{residents.slice(0, 15).map((r: any) => <Chip key={r._id} selected={form.residentId === r._id} onPress={() => setForm(f => ({ ...f, residentId: r._id }))} compact style={form.residentId === r._id ? { backgroundColor: COLOR } : undefined} textStyle={form.residentId === r._id ? { color: '#fff' } : undefined}>{r.fullName}</Chip>)}</View>
              </>
            )}
            <Text style={styles.label}>{t(`${NS}.categoryLabel`)}</Text>
            <View style={styles.chipRow}>{Object.entries(CAT_LABEL).map(([k, v]) => <Chip key={k} selected={form.activityCategory === k} onPress={() => setForm(f => ({ ...f, activityCategory: k, activityType: k === 'personal' ? 'bathing' : 'room_tidy' }))} compact style={form.activityCategory === k ? { backgroundColor: COLOR } : undefined} textStyle={form.activityCategory === k ? { color: '#fff' } : undefined}>{v}</Chip>)}</View>
            <Text style={styles.label}>{t(`${NS}.activityLabel`)}</Text>
            <View style={styles.chipRow}>{types.map(tp => <Chip key={tp} selected={form.activityType === tp} onPress={() => setForm(f => ({ ...f, activityType: tp }))} compact style={form.activityType === tp ? { backgroundColor: COLOR } : undefined} textStyle={form.activityType === tp ? { color: '#fff' } : undefined}>{TYPE_LABEL[tp]}</Chip>)}</View>
            <Text style={styles.label}>{t(`${NS}.statusLabel`)}</Text>
            <View style={styles.chipRow}>{Object.entries(STATUS_OPTIONS).map(([k, v]) => <Chip key={k} selected={form.completionStatus === k} onPress={() => setForm(f => ({ ...f, completionStatus: k }))} compact>{v}</Chip>)}</View>
            <TextInput label={t(`${NS}.notesLabel`)} mode="outlined" value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} dense multiline maxLength={500} style={{ marginTop: 8 }} />
          </Dialog.ScrollArea>
          <Dialog.Actions><Button onPress={() => { setShowCreate(false); setEditingId(null); }}>{t('common.cancel')}</Button><Button mode="contained" buttonColor={COLOR} onPress={() => saveMut.mutate()} loading={saveMut.isPending} disabled={!editingId && !form.residentId}>{t(`${NS}.save`)}</Button></Dialog.Actions>
        </Dialog>
        <Dialog visible={!!deleteId} onDismiss={() => setDeleteId(null)}><Dialog.Title>{t(`${NS}.deleteConfirmTitle`)}</Dialog.Title><Dialog.Actions><Button onPress={() => setDeleteId(null)}>{t('common.cancel')}</Button><Button mode="contained" buttonColor="#991B1B" onPress={() => deleteMut.mutate()} loading={deleteMut.isPending}>{t('common.delete')}</Button></Dialog.Actions></Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' }, topBar: { backgroundColor: COLOR, paddingHorizontal: 8, paddingBottom: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center' }, backBtn: { margin: 0 }, topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' }, topSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }, list: { padding: 16, paddingBottom: 80 }, card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' }, row: { flexDirection: 'row', alignItems: 'center' }, name: { fontSize: 14, fontWeight: '600', color: '#111827' }, sub: { fontSize: 12, color: '#6B7280', marginTop: 2 }, notes: { fontSize: 11, color: '#374151', marginTop: 2 }, fab: { position: 'absolute', bottom: 16, right: 16 }, label: { fontSize: 13, color: '#6B7280', marginBottom: 4, marginTop: 8 }, chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
