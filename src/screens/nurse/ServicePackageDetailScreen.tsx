import React, { useMemo } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useServicePackageDetail } from '../../hooks/useServicePackages';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { BackHeader } from '../../components/layout/BackHeader';
import { useServicePackageLabels } from '../../utils/servicePackageLabels';
import { useAppTheme } from '../../theme/useAppTheme';
import type { AppColors } from '../../constants/theme';

const NS = 'nurse.servicePackages';

export const ServicePackageDetailScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { colors, roleColor } = useAppTheme('nurse');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { getTierLabel, getActiveLabel, formatVnd } = useServicePackageLabels();
  const packageId = route.params?.packageId;
  const detailQ = useServicePackageDetail(packageId);
  const p = detailQ.data;
  const detailError = detailQ.error ? t(`${NS}.detailError`) : null;

  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.detailTitle`)} color={roleColor} onBack={() => navigation.goBack()} />

      <ScreenLayout loading={detailQ.isLoading}
        error={detailError}
        onRetry={() => detailQ.refetch()}>
        {p ? (
          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.headerRow}>
              <Text style={styles.name}>{p.name}</Text>
              {/* `label` bắt buộc: khoá dùng chung `status.active` đang mang nghĩa
                  "Tích cực" (mức tham gia hoạt động), không phải trạng thái gói. */}
              <StatusBadge status={p.isActive ? 'active' : 'inactive'} size="sm"
                label={getActiveLabel(p.isActive)} />
            </View>
            <Text style={styles.tier}>{getTierLabel(p.tier)}</Text>

            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{t(`${NS}.priceMonthly`)}</Text>
                <Text style={styles.rowValue}>{formatVnd(p.monthlyPrice)}</Text>
              </View>
              {p.description ? (
                <>
                  <Text style={styles.sectionTitle}>{t(`${NS}.description`)}</Text>
                  <Text style={styles.description}>{p.description}</Text>
                </>
              ) : null}
            </View>

            {(p.services ?? []).length > 0 && (
              <>
                <Text style={styles.sectionTitle}>{t(`${NS}.servicesIncluded`)}</Text>
                {p.services.map((s: string, i: number) => (
                  <View key={i} style={styles.serviceRow}>
                    <MaterialCommunityIcons name="check-circle-outline" size={16} color="#2E7D32" />
                    <Text style={styles.serviceText}>{s}</Text>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        ) : null}
      </ScreenLayout>
    </View>
  );
};

const createStyles = (c: AppColors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.background },
  body: { padding: 16, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 20, fontWeight: '700', color: c.text, flex: 1 },
  tier: { fontSize: 12, color: c.textSecondary, marginTop: 4 },
  card: { backgroundColor: c.surface, borderRadius: 12, padding: 16, marginTop: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { color: c.textSecondary },
  rowValue: { fontWeight: '600', color: c.text },
  sectionTitle: { fontWeight: '600', marginTop: 12, marginBottom: 4, color: c.text },
  description: { color: c.text },
  serviceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 8 },
  serviceText: { flex: 1, color: c.text },
});
