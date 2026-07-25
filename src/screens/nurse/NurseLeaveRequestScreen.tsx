import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip, Button, FAB, Dialog, Portal, TextInput, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useLeaveRequests, useCreateLeaveRequest, useCancelLeaveRequest } from '../../hooks/useLeaveRequests';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { CalendarPicker } from '../../components/shared/CalendarPicker';
import { useToast } from '../../utils/toast';

const COLOR = '#0F5040';
const NS = 'nurse.leaveRequests';

const toDateStr = (d: Date) => d.toISOString().split('T')[0];
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d; };
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

export const NurseLeaveRequestScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { t } = useTranslation();
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [form, setForm] = useState({ type: 'annual', startDate: toDateStr(tomorrow()), endDate: toDateStr(addDays(tomorrow(), 1)), reason: '' });

  const STATUS_FILTERS = [
    { value: '', label: t(`${NS}.filterAll`) },
    { value: 'pending', label: t(`${NS}.filterPending`) },
    { value: 'approved', label: t(`${NS}.filterApproved`) },
    { value: 'rejected', label: t(`${NS}.filterRejected`) },
  ];
  const LEAVE_TYPES = [
    { value: 'annual', label: t(`${NS}.typeAnnual`) },
    { value: 'sick', label: t(`${NS}.typeSick`) },
    { value: 'emergency', label: t(`${NS}.typeEmergency`) },
    { value: 'unpaid', label: t(`${NS}.typeUnpaid`) },
    { value: 'other', label: t(`${NS}.typeOther`) },
  ];

  const listQ = useLeaveRequests({ status: filter || undefined });
  const items = listQ.data?.data ?? listQ.data ?? [];
  const createMut = useCreateLeaveRequest();
  const cancelMut = useCancelLeaveRequest();

  const handleCreate = () => {
    if (!form.startDate || !form.endDate) { toast(t(`${NS}.warnSelectDates`), 'warning'); return; }
    if (!form.reason.trim()) { toast(t(`${NS}.warnReason`), 'warning'); return; }
    createMut.mutate(form, {
      onSuccess: () => { setShowCreate(false); setForm({ type: 'annual', startDate: toDateStr(tomorrow()), endDate: toDateStr(addDays(tomorrow(), 1)), reason: '' }); toast(t(`${NS}.toastSubmitted`), 'success'); },
      onError: (e: any) => toast(e.response?.data?.message ?? t(`${NS}.toastSubmitError`), 'error'),
    });
  };

  const handleCancel = () => {
    if (!cancelId) return;
    cancelMut.mutate(cancelId, {
      onSuccess: () => { setCancelId(null); toast(t(`${NS}.toastCancelled`), 'success'); },
      onError: () => toast(t(`${NS}.toastCancelError`), 'error'),
    });
  };

  const daysCount = form.startDate && form.endDate
    ? Math.max(1, Math.round((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000) + 1)
    : 0;

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <View style={styles.topRow}>
          <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation.goBack()} />
          <Text style={styles.topTitle}>{t(`${NS}.title`)}</Text>
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
        onRetry={listQ.refetch} isEmpty={items.length === 0} emptyMessage={t(`${NS}.empty`)}>
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={listQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined">
              <Card.Content>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.type}>{LEAVE_TYPES.find(lt => lt.value === item.type)?.label ?? item.type}</Text>
                    <Text style={styles.dates}>
                      {item.startDate ? new Date(item.startDate).toLocaleDateString('vi-VN') : ''} — {item.endDate ? new Date(item.endDate).toLocaleDateString('vi-VN') : ''}
                    </Text>
                    {item.daysRequested ? <Text style={styles.daysCount}>{t(`${NS}.daysCount`, { count: item.daysRequested })}</Text> : null}
                    <Text style={styles.reason} numberOfLines={2}>{item.reason}</Text>
                  </View>
                  <StatusBadge status={item.status} size="sm" />
                </View>
              </Card.Content>
              {item.status === 'pending' ? (
                <Card.Actions><Button compact textColor="#991B1B" onPress={() => setCancelId(item._id)}>{t(`${NS}.cancel`)}</Button></Card.Actions>
              ) : null}
            </Card>
          )} />
      </ScreenLayout>
      <FAB icon="plus" style={[styles.fab, { backgroundColor: COLOR }]} color="#fff" onPress={() => setShowCreate(true)} />

      <Portal>
        <Dialog visible={showCreate} onDismiss={() => setShowCreate(false)} style={{ borderRadius: 16 }}>
          <Dialog.Title>{t(`${NS}.createTitle`)}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 480 }}>
            <Text style={styles.fieldLabel}>{t(`${NS}.typeLabel`)}</Text>
            <View style={styles.chipRow2}>
              {LEAVE_TYPES.map(lt => (
                <Chip key={lt.value} selected={form.type === lt.value}
                  onPress={() => setForm(f => ({ ...f, type: lt.value }))}
                  style={form.type === lt.value ? { backgroundColor: COLOR } : undefined}
                  textStyle={form.type === lt.value ? { color: '#fff' } : undefined} compact>{lt.label}</Chip>
              ))}
            </View>

            <CalendarPicker label={t(`${NS}.startDate`)} value={form.startDate}
              onChange={v => setForm(f => ({ ...f, startDate: v, endDate: v > f.endDate ? v : f.endDate }))}
              minDate={form.type === 'emergency' ? toDateStr(new Date()) : toDateStr(tomorrow())}
              color={COLOR} />

            <CalendarPicker label={t(`${NS}.endDate`)} value={form.endDate}
              onChange={v => setForm(f => ({ ...f, endDate: v }))}
              minDate={form.startDate || toDateStr(tomorrow())}
              color={COLOR} />

            {daysCount > 0 && (
              <View style={styles.daysPreview}>
                <Text style={[styles.daysPreviewText, { color: COLOR }]}>
                  {t(`${NS}.daysPreview`, { count: daysCount })}
                </Text>
              </View>
            )}

            <TextInput label={t(`${NS}.reasonLabel`)} mode="outlined" value={form.reason}
              onChangeText={v => setForm(f => ({ ...f, reason: v }))} dense multiline
              numberOfLines={3} style={styles.input} />
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowCreate(false)}>{t('common.cancel')}</Button>
            <Button mode="contained" buttonColor={COLOR} onPress={handleCreate} loading={createMut.isPending}>{t(`${NS}.submit`)}</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={!!cancelId} onDismiss={() => setCancelId(null)}>
          <Dialog.Title>{t(`${NS}.cancelConfirmTitle`)}</Dialog.Title>
          <Dialog.Actions>
            <Button onPress={() => setCancelId(null)}>{t('common.close')}</Button>
            <Button mode="contained" buttonColor="#991B1B" onPress={handleCancel} loading={cancelMut.isPending}>{t(`${NS}.cancelConfirmButton`)}</Button>
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
  list: { padding: 16, paddingBottom: 80 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center' },
  type: { fontSize: 14, fontWeight: '600', color: '#111827' },
  dates: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  daysCount: { fontSize: 11, color: COLOR, marginTop: 2 },
  reason: { fontSize: 12, color: '#374151', marginTop: 4 },
  fab: { position: 'absolute', bottom: 16, right: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  chipRow2: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 12 },
  input: { marginBottom: 8 },
  daysPreview: { backgroundColor: '#F0FDF4', borderRadius: 8, paddingVertical: 8, marginBottom: 12, alignItems: 'center' },
  daysPreviewText: { fontSize: 15, fontWeight: '700' },
});
