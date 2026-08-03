import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Button, Chip, FAB, Dialog, Portal, TextInput, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { CAREGIVER } from '../../api/endpoints';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { useToast } from '../../utils/toast';

const COLOR = '#6B4200';
const NS = 'assistant.dailyBehavior';
const today = () => new Date().toISOString().split('T')[0];
const SEV_COLORS: Record<string, string> = { normal: '#065F46', mild: '#1E40AF', moderate: '#92400E', urgent: '#991B1B' };

export const DailyBehaviorScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ residentId: '', observationCategory: 'mood', moodLevel: 'neutral', behaviorType: '', severity: 'normal', notes: '' });

  const CAT_LABEL: Record<string, string> = { mood: t(`${NS}.catMood`), behavior: t(`${NS}.catBehavior`), abnormal: t(`${NS}.catAbnormal`) };
  const MOOD_LABEL: Record<string, string> = {
    calm: t(`${NS}.moodCalm`), happy: t(`${NS}.moodHappy`), neutral: t(`${NS}.moodNeutral`), anxious: t(`${NS}.moodAnxious`),
    sad: t(`${NS}.moodSad`), agitated: t(`${NS}.moodAgitated`), confused: t(`${NS}.moodConfused`), irritable: t(`${NS}.moodIrritable`),
  };
  const BEHAVIOR_LABEL: Record<string, string> = {
    cooperative: t(`${NS}.behaviorCooperative`), withdrawn: t(`${NS}.behaviorWithdrawn`), restless: t(`${NS}.behaviorRestless`),
    wandering: t(`${NS}.behaviorWandering`), verbal_outburst: t(`${NS}.behaviorVerbalOutburst`), physical_resistance: t(`${NS}.behaviorPhysicalResistance`),
    sleep_disturbance: t(`${NS}.behaviorSleepDisturbance`), appetite_change: t(`${NS}.behaviorAppetiteChange`), other: t(`${NS}.behaviorOther`),
  };
  const SEV_LABEL: Record<string, string> = {
    normal: t(`${NS}.sevNormal`), mild: t(`${NS}.sevMild`), moderate: t(`${NS}.sevModerate`), urgent: t(`${NS}.sevUrgent`),
  };

  const listQ = useQuery({ queryKey: ['behaviors', today()], queryFn: async () => (await api.get(CAREGIVER.DAILY_BEHAVIORS, { params: { workDate: today() } })).data });
  const residentsQ = useQuery({ queryKey: ['behaviorResidents'], queryFn: async () => (await api.get(CAREGIVER.DAILY_BEHAVIOR_RESIDENTS)).data });
  const items = listQ.data?.data ?? listQ.data ?? [];
  const residents = residentsQ.data?.data ?? residentsQ.data ?? [];

  const saveMut = useMutation({
    mutationFn: async () => {
      const body: any = { observationCategory: form.observationCategory, severity: form.severity, notes: form.notes };
      if (form.observationCategory === 'mood') body.moodLevel = form.moodLevel;
      else body.behaviorType = form.behaviorType || 'other';
      if (editingId) {
        return (await api.put(CAREGIVER.DAILY_BEHAVIOR_DETAIL(editingId), body)).data;
      }
      return (await api.post(CAREGIVER.DAILY_BEHAVIORS, { ...body, residentId: form.residentId, workDate: today(), observedAt: new Date().toISOString() })).data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['behaviors'] }); setShowCreate(false); setEditingId(null); toast(t(`${NS}.toastRecorded`), 'success'); },
    onError: (e: any) => toast(e.response?.data?.message ?? t(`${NS}.toastRecordError`), 'error'),
  });

  const openEdit = (item: any) => {
    setEditingId(item._id);
    setForm({
      residentId: typeof item.residentId === 'object' ? item.residentId?._id : item.residentId,
      observationCategory: item.observationCategory,
      moodLevel: item.moodLevel || 'neutral',
      behaviorType: item.behaviorType || '',
      severity: item.severity || 'normal',
      notes: item.notes || '',
    });
    setShowCreate(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ residentId: '', observationCategory: 'mood', moodLevel: 'neutral', behaviorType: '', severity: 'normal', notes: '' });
    setShowCreate(true);
  };

  const deleteMut = useMutation({
    mutationFn: async () => (await api.delete(CAREGIVER.DAILY_BEHAVIOR_DETAIL(deleteId!))).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['behaviors'] }); setDeleteId(null); toast(t(`${NS}.toastDeleted`), 'success'); },
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
                  <Text style={styles.sub}>
                    {CAT_LABEL[item.observationCategory] ?? item.observationCategory}
                    {item.moodLevel ? ` · ${MOOD_LABEL[item.moodLevel] ?? item.moodLevel}` : ''}
                    {item.behaviorType ? ` · ${BEHAVIOR_LABEL[item.behaviorType] ?? item.behaviorType}` : ''}
                  </Text>
                  {item.notes ? <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text> : null}
                  <Text style={styles.time}>{item.observedAt ? new Date(item.observedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
                </View>
                <Chip compact style={{ backgroundColor: SEV_COLORS[item.severity] ? `${SEV_COLORS[item.severity]}20` : '#F0F0F0' }}><Text style={{ fontSize: 10, color: SEV_COLORS[item.severity] ?? '#374151' }}>{SEV_LABEL[item.severity] ?? item.severity}</Text></Chip>
              </Card.Content>
            </Card>
          )} />
      </ScreenLayout>
      <FAB icon="plus" style={[styles.fab, { backgroundColor: COLOR }]} color="#fff" onPress={openCreate} />

      <Portal>
        <Dialog visible={showCreate} onDismiss={() => { setShowCreate(false); setEditingId(null); }} style={{ borderRadius: 16 }}>
          <Dialog.Title>{editingId ? t(`${NS}.editTitle`, 'Cập nhật quan sát') : t(`${NS}.createTitle`)}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 440 }}>
            {!editingId && (
              <>
                <Text style={styles.label}>{t(`${NS}.residentLabel`)}</Text>
                <View style={styles.chipRow}>{residents.slice(0, 15).map((r: any) => <Chip key={r._id} selected={form.residentId === r._id} onPress={() => setForm(f => ({ ...f, residentId: r._id }))} compact style={form.residentId === r._id ? { backgroundColor: COLOR } : undefined} textStyle={form.residentId === r._id ? { color: '#fff' } : undefined}>{r.fullName}</Chip>)}</View>
              </>
            )}
            <Text style={styles.label}>{t(`${NS}.categoryLabel`)}</Text>
            <View style={styles.chipRow}>{Object.entries(CAT_LABEL).map(([k, v]) => <Chip key={k} selected={form.observationCategory === k} onPress={() => setForm(f => ({ ...f, observationCategory: k }))} compact style={form.observationCategory === k ? { backgroundColor: COLOR } : undefined} textStyle={form.observationCategory === k ? { color: '#fff' } : undefined}>{v}</Chip>)}</View>
            {form.observationCategory === 'mood' ? (<><Text style={styles.label}>{t(`${NS}.moodLabel`)}</Text><View style={styles.chipRow}>{Object.entries(MOOD_LABEL).map(([k, v]) => <Chip key={k} selected={form.moodLevel === k} onPress={() => setForm(f => ({ ...f, moodLevel: k }))} compact>{v}</Chip>)}</View></>) : (<><Text style={styles.label}>{t(`${NS}.behaviorTypeLabel`)}</Text><View style={styles.chipRow}>{Object.entries(BEHAVIOR_LABEL).map(([k, v]) => <Chip key={k} selected={form.behaviorType === k} onPress={() => setForm(f => ({ ...f, behaviorType: k }))} compact>{v}</Chip>)}</View></>)}
            <Text style={styles.label}>{t(`${NS}.severityLabel`)}</Text>
            <View style={styles.chipRow}>{Object.entries(SEV_LABEL).map(([k, v]) => <Chip key={k} selected={form.severity === k} onPress={() => setForm(f => ({ ...f, severity: k }))} compact style={form.severity === k ? { backgroundColor: SEV_COLORS[k] } : undefined} textStyle={form.severity === k ? { color: '#fff' } : undefined}>{v}</Chip>)}</View>
            <TextInput label={t(`${NS}.notesLabel`)} mode="outlined" value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} dense multiline maxLength={500} style={{ marginTop: 8 }} />
          </Dialog.ScrollArea>
          <Dialog.Actions><Button onPress={() => { setShowCreate(false); setEditingId(null); }}>{t('common.cancel')}</Button><Button mode="contained" buttonColor={COLOR} onPress={() => saveMut.mutate()} loading={saveMut.isPending} disabled={(!editingId && !form.residentId) || !form.notes}>{t(`${NS}.save`)}</Button></Dialog.Actions>
        </Dialog>
        <Dialog visible={!!deleteId} onDismiss={() => setDeleteId(null)}><Dialog.Title>{t(`${NS}.deleteConfirmTitle`)}</Dialog.Title><Dialog.Actions><Button onPress={() => setDeleteId(null)}>{t('common.cancel')}</Button><Button mode="contained" buttonColor="#991B1B" onPress={() => deleteMut.mutate()} loading={deleteMut.isPending}>{t('common.delete')}</Button></Dialog.Actions></Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' }, topBar: { backgroundColor: COLOR, paddingHorizontal: 8, paddingBottom: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center' }, backBtn: { margin: 0 }, topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' }, topSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }, list: { padding: 16, paddingBottom: 80 }, card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' }, row: { flexDirection: 'row', alignItems: 'center' }, name: { fontSize: 14, fontWeight: '600', color: '#111827' }, sub: { fontSize: 12, color: '#6B7280', marginTop: 2 }, notes: { fontSize: 12, color: '#374151', marginTop: 2 }, time: { fontSize: 11, color: '#9CA3AF', marginTop: 2 }, fab: { position: 'absolute', bottom: 16, right: 16 }, label: { fontSize: 13, color: '#6B7280', marginBottom: 4, marginTop: 8 }, chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
