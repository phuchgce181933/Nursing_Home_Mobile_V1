import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, ScrollView, Pressable } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { useFamilyActivities, useRegisterActivity, useUnregisterActivity } from '../../hooks/useFamilyHealth';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ResidentSwitcher } from '../../components/shared/ResidentSwitcher';
import { useToast } from '../../utils/toast';
import { useActivityCategoryLabel } from '../../utils/activityCategory';
import { BackHeader } from '../../components/layout/BackHeader';

const COLOR = '#2E7D32';
const NS = 'family.activities';

// `scheduledAt` là Date đầy đủ (models/activity.js). Hiển thị "giờ · ngày" cho gọn;
// dữ liệu thiếu/hỏng thì trả '' để không bao giờ lộ "Invalid Date".
const formatWhen = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${time} · ${date}`;
};

export const FamilyActivitiesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const showToast = useToast();
  const { t } = useTranslation();
  const categoryLabel = useActivityCategoryLabel();
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
      <BackHeader title={t(`${NS}.title`)} color={COLOR} onBack={() => navigation.goBack()} />

      <ResidentSwitcher residents={residents} activeId={activeId} onChange={setSelectedId} color={COLOR} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <Pressable
            key={f.value}
            onPress={() => setFilter(f.value)}
            style={[styles.filterChip, filter === f.value && { backgroundColor: COLOR, borderColor: COLOR }]}
          >
            <Text style={[styles.filterChipText, filter === f.value && { color: '#fff' }]}>{f.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScreenLayout loading={loading} error={activitiesQ.error ? (activitiesQ.error as Error).message : null}
        onRetry={activitiesQ.refetch} isEmpty={activities.length === 0} emptyMessage={t(`${NS}.empty`)}>
        <FlatList data={activities} keyExtractor={(item: any) => item._id} contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={activitiesQ.isFetching} onRefresh={activitiesQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => {
            const isRegistered = activeId ? (item.participantResidentIds ?? []).some((id: any) =>
              (typeof id === 'string' ? id : id?._id) === activeId) : false;
            const isDisabled = !activeId || (!isRegistered && ['cancelled', 'completed'].includes(item.status)) || (isRegistered && item.status === 'completed');

            const whenText = formatWhen(item.scheduledAt);

            return (
              <Card style={styles.card} mode="outlined">
                <Card.Content style={styles.cardContent}>
                  <View style={styles.headerRow}>
                    <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                    <View style={styles.badgeWrap}>
                      <StatusBadge status={item.status} size="sm" />
                    </View>
                  </View>
                  {item.category ? <Text style={styles.category}>{categoryLabel(item.category)}</Text> : null}
                  {item.description ? <Text style={styles.desc} numberOfLines={2}>{item.description}</Text> : null}

                  {whenText ? (
                    <View style={styles.metaRow}>
                      <MaterialCommunityIcons name="clock-outline" size={15} color="#6B7280" />
                      <Text style={styles.metaText}>{whenText}</Text>
                    </View>
                  ) : null}
                  {item.location ? (
                    <View style={styles.metaRow}>
                      <MaterialCommunityIcons name="map-marker-outline" size={15} color="#6B7280" />
                      <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
                    </View>
                  ) : null}
                  <View style={styles.metaRow}>
                    <MaterialCommunityIcons name="account-group-outline" size={15} color="#6B7280" />
                    <Text style={styles.metaText}>{t(`${NS}.participantCount`, { count: item.participantResidentIds?.length ?? 0 })}</Text>
                  </View>

                  <Button
                    mode={isRegistered ? 'outlined' : 'contained'}
                    disabled={isDisabled}
                    loading={isRegistered ? unregisterMut.isPending : registerMut.isPending}
                    onPress={() => (isRegistered ? handleUnregister(item._id) : handleRegister(item._id))}
                    style={styles.registerBtn}
                    contentStyle={styles.registerBtnContent}
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
  // marginTop tách hàng lọc khỏi mép dưới header xanh — khi chỉ có 1 người thân,
  // ResidentSwitcher trả null nên hàng lọc nằm sát header nếu không có khoảng cách này.
  filterScroll: { flexGrow: 0, marginTop: 12, marginBottom: 8 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  filterChip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },
  card: { borderRadius: 12, marginBottom: 10, backgroundColor: '#fff' },
  cardContent: { padding: 14, gap: 6 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  title: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1, lineHeight: 21 },
  badgeWrap: { flexShrink: 0 },
  category: { fontSize: 12, fontWeight: '600', color: '#2E7D32' },
  desc: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: '#6B7280', flex: 1 },
  registerBtn: { marginTop: 10, borderRadius: 20, width: '100%' },
  registerBtnContent: { height: 42 },
});
