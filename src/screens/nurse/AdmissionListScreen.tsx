import React, { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { ADMIN_ADMISSIONS } from '../../api/endpoints';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { BackHeader } from '../../components/layout/BackHeader';
import { useAppTheme } from '../../theme/useAppTheme';
import type { AppColors } from '../../constants/theme';

const NS = 'nurse.admissions';

export const AdmissionListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const { colors, roleColor } = useAppTheme('nurse');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [filter, setFilter] = useState('');

  const STATUS_FILTERS = [
    { value: '', label: t(`${NS}.filterAll`) },
    { value: 'new_request', label: t(`${NS}.filterNew`) },
    { value: 'consulting', label: t(`${NS}.filterConsulting`) },
    { value: 'assessing', label: t(`${NS}.filterAssessing`) },
    { value: 'contracting', label: t(`${NS}.filterContracting`) },
    { value: 'checked_in', label: t(`${NS}.filterCheckedIn`) },
    { value: 'cancelled', label: t(`${NS}.filterCancelled`) },
  ];

  const listQ = useQuery({
    queryKey: ['adminAdmissions', filter],
    queryFn: async () => {
      const res = await api.get(ADMIN_ADMISSIONS.LIST, { params: { status: filter || undefined } });
      return res.data;
    },
  });
  const items = listQ.data?.data ?? listQ.data ?? [];

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
            <Card style={styles.card} mode="outlined" onPress={() => navigation.navigate('AdmissionDetail', { admissionId: item._id })}>
              <Card.Content>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.applicant?.fullName ?? '--'}</Text>
                    <Text style={[styles.code, { color: roleColor }]}>{item.requestCode ?? ''}</Text>
                    <Text style={styles.sub}>
                      {item.applicant?.relationshipToRequester ?? ''} · {item.preferredAdmissionDate ? new Date(item.preferredAdmissionDate).toLocaleDateString('vi-VN') : ''}
                    </Text>
                    {item.reasonForAdmission ? <Text style={styles.reason} numberOfLines={2}>{item.reasonForAdmission}</Text> : null}
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
  code: { fontSize: 11, marginTop: 1 },
  sub: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
  reason: { fontSize: 12, color: c.text, marginTop: 4 },
});
