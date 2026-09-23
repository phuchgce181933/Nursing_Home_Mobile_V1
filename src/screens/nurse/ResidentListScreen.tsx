import React, { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Searchbar, Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useResidents } from '../../hooks/useResidents';
import { ResidentCard } from '../../components/cards/ResidentCard';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { BackHeader } from '../../components/layout/BackHeader';
import { useAppTheme } from '../../theme/useAppTheme';
import type { AppColors } from '../../constants/theme';

const NS = 'nurse.residents';

export const ResidentListScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const { colors, roleColor } = useAppTheme('nurse');
  const styles = useMemo(() => createStyles(colors), [colors]);
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

  const { data, isLoading, isFetching, error, refetch } = useResidents(params);
  const residents = Array.isArray(data) ? data : (data?.data ?? []);

  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.listTitle`)} color={roleColor} onBack={() => navigation?.goBack()} />
      <View style={styles.header}>
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
              style={[styles.chip, statusFilter === opt.value && { backgroundColor: roleColor }]}
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
        error={error ? t(`${NS}.loadError`) : null}
        onRetry={refetch}
        isEmpty={residents.length === 0}
        emptyMessage={t(`${NS}.empty`)}
      >
        <FlatList
          data={residents}
          keyExtractor={(item: any) => item._id}
          renderItem={({ item }) => (
            <ResidentCard
              resident={item}
              onPress={() => navigation?.navigate('ResidentDetail', { residentId: item._id, fullName: item.fullName })}
            />
          )}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={roleColor} />}
        />
      </ScreenLayout>
    </View>
  );
};

const createStyles = (c: AppColors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.background },
  header: { backgroundColor: c.surface, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  searchBar: { marginBottom: 8, elevation: 0, backgroundColor: c.surfaceAlt },
  searchInput: { fontSize: 14 },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { borderRadius: 20 },
});
