import React, { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text, Card, Chip, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useServicePackages } from '../../hooks/useServicePackages';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { useAppTheme } from '../../theme/useAppTheme';
import type { AppColors } from '../../constants/theme';

const NS = 'nurse.servicePackages';
const TIERS = ['basic', 'standard', 'premium', 'vip'];

const formatVnd = (value: any) => {
  const n = typeof value === 'number' ? value : Number(value) || 0;
  return `${n.toLocaleString('vi-VN')}đ`;
};

// Read-only port of `src/pages/admin/ServicePackagesPage.jsx` for the Nurse role (nurse only
// reads the catalog — create/edit/deactivate are admin-only on web).
export const ServicePackagesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colors, roleColor } = useAppTheme('nurse');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState<string | null>(null);

  const packagesQ = useServicePackages({ tier: tier ?? undefined, search: search || undefined });
  const items = packagesQ.data?.data ?? packagesQ.data ?? [];

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8, backgroundColor: roleColor }]}>
        <Text style={styles.topTitle}>{t(`${NS}.title`)}</Text>
      </View>

      <View style={styles.filters}>
        <TextInput mode="outlined" dense placeholder={t(`${NS}.searchPlaceholder`)}
          value={search} onChangeText={setSearch} left={<TextInput.Icon icon="magnify" />} />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 8 }}
          data={[null, ...TIERS]}
          keyExtractor={(item) => item ?? 'all'}
          renderItem={({ item }) => (
            <Chip
              selected={tier === item}
              onPress={() => setTier(item)}
              style={[styles.chip, tier === item ? { backgroundColor: roleColor } : undefined]}
              textStyle={tier === item ? { color: '#fff' } : undefined}
              compact
            >
              {item ? item : t(`${NS}.filterAllTiers`)}
            </Chip>
          )}
        />
      </View>

      <ScreenLayout loading={packagesQ.isLoading}
        error={packagesQ.error ? (packagesQ.error as Error).message : null}
        onRetry={() => packagesQ.refetch()} isEmpty={items.length === 0} emptyMessage={t(`${NS}.empty`)}>
        <FlatList data={items} keyExtractor={(item: any) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const services: string[] = item.services ?? [];
            return (
              <Card style={styles.card} mode="outlined"
                onPress={() => navigation.navigate('ServicePackageDetail', { packageId: item._id })}>
                <Card.Content>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>
                    {t(`${NS}.tier`)}: {item.tier} · {t(`${NS}.price`)}: {formatVnd(item.monthlyPrice)}
                  </Text>
                  {services.length > 0 && (
                    <Text style={styles.services} numberOfLines={1}>{services.slice(0, 3).join(', ')}</Text>
                  )}
                </Card.Content>
              </Card>
            );
          }}
        />
      </ScreenLayout>
    </View>
  );
};

const createStyles = (c: AppColors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.background },
  topBar: { paddingHorizontal: 16, paddingBottom: 12 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  filters: { padding: 12 },
  chip: { marginRight: 6 },
  list: { padding: 12, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: c.surface },
  name: { fontSize: 15, fontWeight: '600', color: c.text },
  meta: { fontSize: 12, color: c.text, marginTop: 4 },
  services: { fontSize: 11, color: c.textMuted, marginTop: 4 },
});
