import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip, IconButton, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { useFamilyActivities, useRegisterActivity, useUnregisterActivity } from '../../hooks/useFamilyHealth';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ResidentSwitcher } from '../../components/shared/ResidentSwitcher';
import { useToast } from '../../utils/toast';

const COLOR = '#2E7D32';
const NS = 'family.activities';

export const FamilyActivitiesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const showToast = useToast();
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const STATUS_FILTERS = [
    { value: '', label: t(`${NS}.filterAll`) },
    { value: 'scheduled', label: t(`${NS}.filterScheduled`) },
    { value: 'ongoing', label: t(`${NS}.filterOngoing`) },
    { value: 'completed', label: t(`${NS}.filterCompleted`) },
  ];

  const residentsQ = useQuery({
    queryKey: ['familyResidents'],
    queryFn: async () => { const r = await api.get(FAMILY.RESIDENTS); return r.data; },
  });
  const residents = residentsQ.data?.data ?? residentsQ.data ?? [];
  const activeId = selectedId ?? residents[0]?._id;

  const activitiesQ = useFamilyActivities({ status: filter || undefined });
  const activities = activitiesQ.data?.data ?? activitiesQ.data ?? [];
  const registerMut = useRegisterActivity();
  const unregisterMut = useUnregisterActivity();

  const loading = residentsQ.isLoading || activitiesQ.isLoading;

  const handleRegister = (activityId: string) => {
    if (!activeId) return;
    registerMut.mutate({ activityId, residentId: activeId }, {
      onSuccess: () => showToast(t(`${NS}.toastRegistered`), 'success'),
      onError: (err: any) => showToast(err?.response?.data?.message || t(`${NS}.toastRegisterError`), 'error'),
    });
  };

  const handleUnregister = (activityId: string) => {
    if (!activeId) return;
    unregisterMut.mutate({ activityId, residentId: activeId }, {
      onSuccess: () => showToast(t(`${NS}.toastUnregistered`, 'Đã hủy đăng ký'), 'success'),
      onError: (err: any) => showToast(err?.response?.data?.message || t(`${NS}.toastUnregisterError`, 'Không thể hủy đăng ký'), 'error'),
    });
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <View style={styles.topRow}>
          <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation.goBack()} />
          <Text style={styles.topTitle}>{t(`${NS}.title`)}</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ResidentSwitcher residents={residents} activeId={activeId} onChange={setSelectedId} color={COLOR} />

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <Chip key={f.value} selected={filter === f.value} onPress={() => setFilter(f.value)}
            style={filter === f.value ? { backgroundColor: COLOR } : undefined}
            textStyle={filter === f.value ? { color: '#fff' } : undefined} compact>{f.label}</Chip>
        ))}
      </View>

      <ScreenLayout loading={loading} error={activitiesQ.error ? (activitiesQ.error as Error).message : null}
        onRetry={activitiesQ.refetch} isEmpty={activities.length === 0} emptyMessage={t(`${NS}.empty`)}>
        <FlatList data={activities} keyExtractor={(item: any) => item._id} contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={activitiesQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => {
            const isRegistered = activeId ? (item.participantResidentIds ?? []).some((id: any) =>
              (typeof id === 'string' ? id : id?._id) === activeId) : false;
            const isDisabled = !activeId || (!isRegistered && ['cancelled', 'completed'].includes(item.status)) || (isRegistered && item.status === 'completed');

            return (
              <Card style={styles.card} mode="outlined">
                <Card.Content>
                  <View style={styles.rowBetween}>
                    <Text style={styles.title}>{item.title}</Text>
                    <StatusBadge status={item.status} size="sm" />
                  </View>
                  {item.category ? <Text style={styles.category}>{item.category}</Text> : null}
                  {item.description ? <Text style={styles.desc} numberOfLines={2}>{item.description}</Text> : null}
                  <Text style={styles.meta}>
                    {item.scheduledAt ? new Date(item.scheduledAt).toLocaleString('vi-VN') : ''}
                    {item.location ? ` · ${item.location}` : ''}
                  </Text>
                  <Text style={styles.meta}>{t(`${NS}.participantCount`, { count: item.participantResidentIds?.length ?? 0 })}</Text>
                  <Button
                    mode={isRegistered ? 'outlined' : 'contained'}
                    disabled={isDisabled}
                    loading={isRegistered ? unregisterMut.isPending : registerMut.isPending}
                    onPress={() => (isRegistered ? handleUnregister(item._id) : handleRegister(item._id))}
                    style={styles.registerBtn}
                    buttonColor={isRegistered ? undefined : COLOR}
                    textColor={isRegistered ? '#991B1B' : undefined}
                  >
                    {isRegistered ? t(`${NS}.cancelRegistration`, 'Hủy đăng ký') : t(`${NS}.register`)}
                  </Button>
                </Card.Content>
              </Card>
            );
          }}
        />
      </ScreenLayout>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 4, paddingBottom: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingBottom: 8, flexWrap: 'wrap' },
  list: { padding: 16, paddingTop: 0, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 },
  category: { fontSize: 12, color: '#2E7D32', marginTop: 2 },
  desc: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  meta: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  registerBtn: { marginTop: 10 },
});
