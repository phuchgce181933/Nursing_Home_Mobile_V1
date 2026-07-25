import React, { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Searchbar, Chip } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useResidents } from '../../hooks/useResidents';
import { ResidentCard } from '../../components/cards/ResidentCard';
import { ScreenLayout } from '../../components/layout/ScreenLayout';

const COLOR = '#1B3A6B';
const NS = 'nurse.residents';

export const ResidentListScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('admitted');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const STATUS_OPTIONS = [
    { value: '', label: t(`${NS}.filterAll`) },
    { value: 'admitted', label: t(`${NS}.filterAdmitted`) },
    { value: 'pending', label: t(`${NS}.filterPending`) },
    { value: 'discharged', label: t(`${NS}.filterDischarged`) },
  ];

  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearch = (text: string) => {
    setSearch(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(text), 300);
  };

  const params = useMemo(() => ({
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
  }), [debouncedSearch, statusFilter]);

  const { data, isLoading, error, refetch } = useResidents(params);
  const residents = Array.isArray(data) ? data : (data?.data ?? []);

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Searchbar
          placeholder={t(`${NS}.searchPlaceholder`)}
          value={search}
          onChangeText={onSearch}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
        />
        <View style={styles.chips}>
          {STATUS_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              selected={statusFilter === opt.value}
              onPress={() => setStatusFilter(opt.value)}
              style={[styles.chip, statusFilter === opt.value && { backgroundColor: COLOR }]}
              textStyle={statusFilter === opt.value ? { color: '#fff' } : undefined}
              compact
            >
              {opt.label}
            </Chip>
          ))}
        </View>
      </View>

      <ScreenLayout
        loading={isLoading}
        error={error ? (error as Error).message : null}
        onRetry={refetch}
        isEmpty={residents.length === 0}
        emptyMessage={t(`${NS}.empty`)}
      >
        <FlatList
          data={residents}
          keyExtractor={(item: any) => item._id}
          renderItem={({ item }) => (
            <ResidentCard resident={item} onPress={() => {}} />
          )}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={COLOR} />}
        />
      </ScreenLayout>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 8 },
  searchBar: { marginBottom: 8, elevation: 0, backgroundColor: '#F0F0F0' },
  searchInput: { fontSize: 14 },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { borderRadius: 20 },
});
