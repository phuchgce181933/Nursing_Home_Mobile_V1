import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { ADMIN_ADMISSIONS } from '../../api/endpoints';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';

const COLOR = '#0F5040';
const NS = 'nurse.admissions';

export const AdmissionListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
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
            <Card style={styles.card} mode="outlined" onPress={() => navigation.navigate('AdmissionDetail', { admissionId: item._id })}>
              <Card.Content>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.applicant?.fullName ?? '--'}</Text>
                    <Text style={styles.code}>{item.requestCode ?? ''}</Text>
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

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 4, paddingBottom: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  filterRow: { flexDirection: 'row', gap: 6, padding: 12, flexWrap: 'wrap' },
  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '600', color: '#111827' },
  code: { fontSize: 11, color: COLOR, marginTop: 1 },
  sub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  reason: { fontSize: 12, color: '#374151', marginTop: 4 },
});
