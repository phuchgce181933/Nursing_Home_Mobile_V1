import React, { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { BackHeader } from '../../components/layout/BackHeader';
import { useAppTheme } from '../../theme/useAppTheme';
import type { AppColors } from '../../constants/theme';

const NS = 'nurse.supportRequests';

export const SupportRequestsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const { colors, roleColor } = useAppTheme('nurse');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [filter, setFilter] = useState('');

  const STATUS_FILTERS = [
    { value: '', label: t(`${NS}.filterAll`) },
    { value: 'open', label: t(`${NS}.filterOpen`) },
    { value: 'in_progress', label: t(`${NS}.filterInProgress`) },
    { value: 'resolved', label: t(`${NS}.filterResolved`) },
    { value: 'closed', label: t(`${NS}.filterClosed`) },
  ];

  const listQ = useQuery({
    queryKey: ['staffSupportRequests', filter],
    queryFn: async () => (await api.get(FAMILY.SUPPORT_REQUESTS, { params: { status: filter || undefined } })).data,
  });
  const items = listQ.data?.items ?? [];

  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.title`)} color={roleColor} onBack={() => navigation.goBack()} />

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(f => (
          <Chip key={f.value} selected={filter === f.value} onPress={() => setFilter(f.value)}
            style={filter === f.value ? { backgroundColor: roleColor } : undefined}
            textStyle={filter === f.value ? { color: '#fff' } : undefined} compact>{f.label}</Chip>
        ))}
      </View>

      <ScreenLayout loading={listQ.isLoading} error={listQ.error ? (listQ.error as Error).message : null}
        onRetry={listQ.refetch} isEmpty={items.length === 0} emptyMessage={t(`${NS}.empty`)}>
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={listQ.isFetching} onRefresh={listQ.refetch} tintColor={roleColor} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined" onPress={() => navigation.navigate('SupportThread', { requestId: item._id })}>
              <Card.Content>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.fullName}</Text>
                    <Text style={styles.sub}>{item.phone} · {item.subject}</Text>
                    {item.familyAccountId?.fullName ? <Text style={styles.sub}>{t(`${NS}.familyAccount`, { name: item.familyAccountId.fullName })}</Text> : null}
                  </View>
                  <StatusBadge status={item.status} size="sm" />
                </View>
              </Card.Content>
            </Card>
          )} />
      </ScreenLayout>
    </View>
  );
};

const createStyles = (c: AppColors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.background },
  filterRow: { flexDirection: 'row', gap: 6, padding: 12, flexWrap: 'wrap' },
  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: c.surface },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '600', color: c.text },
  sub: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
});
