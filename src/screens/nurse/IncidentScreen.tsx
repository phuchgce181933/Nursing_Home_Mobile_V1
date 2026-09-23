import React, { useState, useMemo } from 'react';
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
import { getStatusEntry } from '../../utils/statusMap';
import { useIncidentLabels, INCIDENT_SEVERITIES } from '../../utils/incidentLabels';
import { useAppTheme } from '../../theme/useAppTheme';
import { useAuth } from '../../auth/useAuth';
import type { AppColors } from '../../constants/theme';

const NS = 'nurse.incidents';

/**
 * Vòng đời hợp lệ theo services/incidentService.js -> updateIncidentStatus:
 * STATUS_ORDER = open -> investigating -> resolved -> closed (không lùi được).
 *
 * `reported` và `in_progress` là dữ liệu cũ nằm ngoài enum schema; backend coi
 * chúng là index -1 nên vẫn cho chuyển tiếp. Không có 2 dòng này thì các sự cố
 * đó hiện thẻ không có nút hành động nào — người dùng bị kẹt.
 */
const NEXT_STATUS: Record<string, string> = {
  reported: 'investigating',
  open: 'investigating',
  in_progress: 'investigating',
  investigating: 'resolved',
  resolved: 'closed',
};

export const IncidentScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const { t } = useTranslation();
  /**
   * Màn này được đăng ký cho CẢ hai vai: NurseNavigator và AssistantNavigator.
   * Trước đây nó khoá cứng `useAppTheme('nurse')` nên hộ lý cũng thấy màu xanh
   * của điều dưỡng (#0F5040). Lấy vai từ phiên đăng nhập để mỗi vai dùng đúng
   * token của mình trong ROLE_COLORS (điều dưỡng xanh, hộ lý nâu #6B4200).
   *
   * Chỉ áp cho màu THƯƠNG HIỆU/ĐIỀU HƯỚNG. Màu mức độ và trạng thái sự cố vẫn
   * do getStatusEntry/StatusBadge quyết định vì chúng mang nghĩa ngữ nghĩa.
   */
  const { user } = useAuth();
  const { colors, roleColor, scheme } = useAppTheme(user?.role);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ incidentType: '', description: '', severity: 'medium', location: '' });

  const { getIncidentTypeLabel, getIncidentSeverityLabel, getIncidentStatusLabel } = useIncidentLabels();

  const SEV_FILTERS = [
    { value: '', label: t(`${NS}.filterAll`) },
    ...INCIDENT_SEVERITIES.map(s => ({ value: s, label: getIncidentSeverityLabel(s) })),
  ];
  const NEXT_LABEL: Record<string, string> = {
    investigating: t(`${NS}.actionInvestigate`), resolved: t(`${NS}.actionResolve`), closed: t(`${NS}.actionClose`),
  };

  const listQ = useQuery({ queryKey: ['incidents', filter], queryFn: async () => (await api.get(INCIDENTS.LIST, { params: { severity: filter || undefined } })).data });
  const items = listQ.data?.items ?? [];
  // Axios ném ra "Request failed with status code 500" — chuỗi tiếng Anh kỹ thuật.
  // Ưu tiên message tiếng Việt do backend trả về, cuối cùng mới dùng câu mặc định.
  const listError = listQ.error
    ? ((listQ.error as any)?.response?.data?.message ?? t(`${NS}.loadError`))
    : null;

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
      <View style={[styles.topBar, { backgroundColor: roleColor, paddingTop: insets.top + 8 }]}>
        {navigation?.canGoBack?.() ? <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation.goBack()} style={styles.backBtn} /> : null}
        <Text style={styles.topTitle}>{t(`${NS}.title`)}</Text>
      </View>
      <View style={styles.filterRow}>
        {SEV_FILTERS.map(f => <Chip key={f.value} selected={filter === f.value} onPress={() => setFilter(f.value)} style={filter === f.value ? { backgroundColor: roleColor } : undefined} textStyle={filter === f.value ? { color: '#fff' } : undefined} compact>{f.label}</Chip>)}
      </View>
      <ScreenLayout loading={listQ.isLoading} error={listError} onRetry={listQ.refetch} isEmpty={items.length === 0} emptyMessage={t(`${NS}.empty`)}>
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={listQ.isFetching} onRefresh={listQ.refetch} tintColor={roleColor} />}
          renderItem={({ item }) => {
            const next = NEXT_STATUS[item.status];
            const sevEntry = getStatusEntry(item.severity, scheme);
            return (
              <Card style={styles.card} mode="outlined">
                <Card.Content>
                  <View style={styles.row}>
                    <MaterialCommunityIcons name="alert-circle" size={24} color={sevEntry.textColor} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.name}>{getIncidentTypeLabel(item.incidentType, t(`${NS}.typeUnknown`))}</Text>
                      <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
                      <Text style={styles.sub}>{item.incidentAt ? new Date(item.incidentAt).toLocaleString('vi-VN') : ''}{item.location ? ` · ${item.location}` : ''}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <StatusBadge status={item.severity} size="sm" label={getIncidentSeverityLabel(item.severity)} />
                      <StatusBadge status={item.status} size="sm" label={getIncidentStatusLabel(item.status)} />
                    </View>
                  </View>
                </Card.Content>
                {next ? (
                  <Card.Actions><Button compact textColor={roleColor} onPress={() => statusMut.mutate({ id: item._id, status: next })}>{NEXT_LABEL[next]}</Button></Card.Actions>
                ) : null}
              </Card>
            );
          }} />
      </ScreenLayout>
      <FAB icon="plus" style={[styles.fab, { backgroundColor: roleColor }]} color="#fff" onPress={() => setShowCreate(true)} />

      <Portal>
        <Dialog visible={showCreate} onDismiss={() => setShowCreate(false)} style={{ borderRadius: 16 }}>
          <Dialog.Title>{t(`${NS}.createTitle`)}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 380 }}>
            <TextInput label={t(`${NS}.typeLabel`)} mode="outlined" value={form.incidentType} onChangeText={v => setForm(f => ({ ...f, incidentType: v }))} dense style={styles.input} placeholder={t(`${NS}.typePlaceholder`)} maxLength={200} />
            <TextInput label={t(`${NS}.descriptionLabel`)} mode="outlined" value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} dense multiline numberOfLines={3} style={styles.input} maxLength={500} />
            <Text style={styles.charCount}>{form.description.length}/500</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}>{t(`${NS}.severityLabel`)}</Text>
            <View style={styles.sevRow}>
              {INCIDENT_SEVERITIES.map(s => {
                const sEntry = getStatusEntry(s, scheme);
                return (
                  <Chip key={s} selected={form.severity === s} onPress={() => setForm(f => ({ ...f, severity: s }))} compact style={form.severity === s ? { backgroundColor: sEntry.textColor } : undefined} textStyle={form.severity === s ? { color: '#fff' } : undefined}>
                    {getIncidentSeverityLabel(s)}
                  </Chip>
                );
              })}
            </View>
            <TextInput label={t(`${NS}.locationLabel`)} mode="outlined" value={form.location} onChangeText={v => setForm(f => ({ ...f, location: v }))} dense style={styles.input} placeholder={t(`${NS}.locationPlaceholder`)} maxLength={200} />
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowCreate(false)}>{t('common.cancel')}</Button>
            <Button mode="contained" buttonColor={roleColor} onPress={() => createMut.mutate()} loading={createMut.isPending} disabled={!form.incidentType || !form.description}>{t(`${NS}.report`)}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const createStyles = (c: AppColors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.background }, topBar: { paddingHorizontal: 8, paddingBottom: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center' }, backBtn: { margin: 0 }, topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' }, filterRow: { flexDirection: 'row', gap: 6, padding: 12, flexWrap: 'wrap' }, list: { padding: 16, paddingBottom: 80 }, card: { borderRadius: 12, marginBottom: 8, backgroundColor: c.surface }, row: { flexDirection: 'row', alignItems: 'flex-start' }, name: { fontSize: 14, fontWeight: '600', color: c.text }, desc: { fontSize: 12, color: c.text, marginTop: 2 }, sub: { fontSize: 11, color: c.textMuted, marginTop: 4 }, fab: { position: 'absolute', bottom: 16, right: 16 }, input: { marginBottom: 8 }, sevRow: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' }, charCount: { fontSize: 10, color: c.textMuted, textAlign: 'right', marginTop: -6, marginBottom: 8 },
});
