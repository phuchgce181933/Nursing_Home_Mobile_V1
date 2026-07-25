import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Button, Chip, FAB, Dialog, Portal, TextInput, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { INCIDENTS } from '../../api/endpoints';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { useToast } from '../../utils/toast';

const COLOR = '#0F5040';
const NS = 'nurse.incidents';
const SEV_COLORS: Record<string, string> = { low: '#065F46', medium: '#92400E', high: '#991B1B', critical: '#991B1B' };
const NEXT_STATUS: Record<string, string> = { open: 'investigating', investigating: 'resolved', resolved: 'closed' };

export const IncidentScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ incidentType: '', description: '', severity: 'medium', location: '' });

  const SEV_FILTERS = [
    { value: '', label: t(`${NS}.filterAll`) },
    { value: 'low', label: t(`${NS}.filterLow`) },
    { value: 'medium', label: t(`${NS}.filterMedium`) },
    { value: 'high', label: t(`${NS}.filterHigh`) },
    { value: 'critical', label: t(`${NS}.filterCritical`) },
  ];
  const NEXT_LABEL: Record<string, string> = {
    investigating: t(`${NS}.actionInvestigate`), resolved: t(`${NS}.actionResolve`), closed: t(`${NS}.actionClose`),
  };

  const listQ = useQuery({ queryKey: ['incidents', filter], queryFn: async () => (await api.get(INCIDENTS.LIST, { params: { severity: filter || undefined } })).data });
  const items = listQ.data?.items ?? [];

  const createMut = useMutation({
    mutationFn: async () => (await api.post(INCIDENTS.CREATE, { ...form, incidentAt: new Date().toISOString() })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incidents'] }); setShowCreate(false); setForm({ incidentType: '', description: '', severity: 'medium', location: '' }); toast(t(`${NS}.toastReported`), 'success'); },
    onError: (e: any) => toast(e?.response?.data?.message ?? t(`${NS}.toastReportError`), 'error'),
  });

  const statusMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => (await api.patch(INCIDENTS.UPDATE_STATUS(id), { status })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incidents'] }); toast(t(`${NS}.toastUpdated`), 'success'); },
    onError: (e: any) => toast(e?.response?.data?.message ?? t(`${NS}.toastUpdateError`, 'Unable to update status.'), 'error'),
  });

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        {navigation?.canGoBack?.() ? <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation.goBack()} style={styles.backBtn} /> : null}
        <Text style={styles.topTitle}>{t(`${NS}.title`)}</Text>
      </View>
      <View style={styles.filterRow}>
        {SEV_FILTERS.map(f => <Chip key={f.value} selected={filter === f.value} onPress={() => setFilter(f.value)} style={filter === f.value ? { backgroundColor: COLOR } : undefined} textStyle={filter === f.value ? { color: '#fff' } : undefined} compact>{f.label}</Chip>)}
      </View>
      <ScreenLayout loading={listQ.isLoading} error={listQ.error ? (listQ.error as Error).message : null} onRetry={listQ.refetch} isEmpty={items.length === 0} emptyMessage={t(`${NS}.empty`)}>
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
                  <Card.Actions><Button compact textColor={COLOR} onPress={() => statusMut.mutate({ id: item._id, status: next })}>{NEXT_LABEL[next]}</Button></Card.Actions>
                ) : null}
              </Card>
            );
          }} />
      </ScreenLayout>
      <FAB icon="plus" style={[styles.fab, { backgroundColor: COLOR }]} color="#fff" onPress={() => setShowCreate(true)} />

      <Portal>
        <Dialog visible={showCreate} onDismiss={() => setShowCreate(false)} style={{ borderRadius: 16 }}>
          <Dialog.Title>{t(`${NS}.createTitle`)}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 380 }}>
            <TextInput label={t(`${NS}.typeLabel`)} mode="outlined" value={form.incidentType} onChangeText={v => setForm(f => ({ ...f, incidentType: v }))} dense style={styles.input} placeholder={t(`${NS}.typePlaceholder`)} maxLength={200} />
            <TextInput label={t(`${NS}.descriptionLabel`)} mode="outlined" value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} dense multiline numberOfLines={3} style={styles.input} maxLength={500} />
            <Text style={styles.charCount}>{form.description.length}/500</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>{t(`${NS}.severityLabel`)}</Text>
            <View style={styles.sevRow}>
              {(['low', 'medium', 'high', 'critical'] as const).map(s => (
                <Chip key={s} selected={form.severity === s} onPress={() => setForm(f => ({ ...f, severity: s }))} compact style={form.severity === s ? { backgroundColor: SEV_COLORS[s] } : undefined} textStyle={form.severity === s ? { color: '#fff' } : undefined}>
                  {t(`${NS}.filter${s.charAt(0).toUpperCase()}${s.slice(1)}`)}
                </Chip>
              ))}
            </View>
            <TextInput label={t(`${NS}.locationLabel`)} mode="outlined" value={form.location} onChangeText={v => setForm(f => ({ ...f, location: v }))} dense style={styles.input} placeholder={t(`${NS}.locationPlaceholder`)} maxLength={200} />
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowCreate(false)}>{t('common.cancel')}</Button>
            <Button mode="contained" buttonColor={COLOR} onPress={() => createMut.mutate()} loading={createMut.isPending} disabled={!form.incidentType || !form.description}>{t(`${NS}.report`)}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' }, topBar: { backgroundColor: COLOR, paddingHorizontal: 8, paddingBottom: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center' }, backBtn: { margin: 0 }, topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' }, filterRow: { flexDirection: 'row', gap: 6, padding: 12, flexWrap: 'wrap' }, list: { padding: 16, paddingBottom: 80 }, card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' }, row: { flexDirection: 'row', alignItems: 'flex-start' }, name: { fontSize: 14, fontWeight: '600', color: '#111827' }, desc: { fontSize: 12, color: '#374151', marginTop: 2 }, sub: { fontSize: 11, color: '#9CA3AF', marginTop: 4 }, fab: { position: 'absolute', bottom: 16, right: 16 }, input: { marginBottom: 8 }, sevRow: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' }, charCount: { fontSize: 10, color: '#9CA3AF', textAlign: 'right', marginTop: -6, marginBottom: 8 },
});
