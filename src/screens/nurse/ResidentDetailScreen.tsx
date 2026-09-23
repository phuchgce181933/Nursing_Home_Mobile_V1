import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Divider } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useResidentDetail, useResidentInitialHealth } from '../../hooks/useResidents';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { BackHeader } from '../../components/layout/BackHeader';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { AvatarCircle } from '../../components/shared/AvatarCircle';
import { useAppTheme } from '../../theme/useAppTheme';
import type { AppColors } from '../../constants/theme';
import {
  useResidentLabels,
  getAge,
  formatDate,
  cleanList,
  splitAllergies,
} from '../../utils/residentLabels';

const NS = 'nurse.residents';

/** Một dòng "nhãn — giá trị"; bỏ hẳn dòng khi không có giá trị để màn hình gọn. */
const Row: React.FC<{ label: string; value?: string | null; styles: any }> = ({ label, value, styles }) =>
  value ? (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  ) : null;

/** Khối văn bản nhiều dòng (dị ứng, bệnh mãn tính) — luôn hiện, rỗng thì ghi "Chưa ghi nhận". */
const Block: React.FC<{ label: string; value: string; styles: any }> = ({ label, value, styles }) => (
  <View style={styles.block}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.blockValue}>{value}</Text>
  </View>
);

export const ResidentDetailScreen: React.FC<{ navigation?: any; route?: any }> = ({ navigation, route }) => {
  const residentId: string | undefined = route?.params?.residentId;
  const { t } = useTranslation();
  const { colors, roleColor } = useAppTheme('nurse');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { getGenderLabel, getResidencyLabel, getBloodTypeLabel, getArea, hasArea } = useResidentLabels();

  const detailQ = useResidentDetail(residentId);
  const resident = detailQ.data?.resident ?? detailQ.data ?? null;

  // Cùng điều kiện với `enrichResidentDetail` của Web: chỉ gọi thêm khi bản ghi
  // chính thiếu cả hai trường, nếu không Mobile sẽ hiện thứ Web đang ẩn.
  const needsInitialHealth =
    !!resident && resident.initialHealthCondition === undefined && resident.bloodType === undefined;
  const initialHealthQ = useResidentInitialHealth(residentId, { enabled: needsInitialHealth });

  const bloodType = getBloodTypeLabel(
    resident?.bloodType ?? initialHealthQ.data?.initialHealth?.bloodType
  );
  const initialHealth = String(
    resident?.initialHealthCondition ?? initialHealthQ.data?.initialHealth?.initialHealthCondition ?? ''
  ).trim();

  const age = resident?.age ?? getAge(resident?.dateOfBirth);
  const identity = [
    resident?.residentCode ? `${t(`${NS}.residentCode`)} ${resident.residentCode}` : null,
    age != null ? t(`${NS}.ageValue`, { age }) : null,
    getGenderLabel(resident?.gender) || null,
  ].filter(Boolean).join(' · ');

  const area = getArea(resident);
  const { drug, other } = splitAllergies(resident);
  const conditions = cleanList(resident?.chronicConditions);
  const none = t(`${NS}.noneRecorded`);

  const headerTitle = route?.params?.fullName ?? t(`${NS}.detailTitle`);

  return (
    <View style={styles.flex}>
      <BackHeader title={headerTitle} color={roleColor} onBack={() => navigation?.goBack()} />
      <ScreenLayout
        loading={detailQ.isLoading}
        error={detailQ.error ? t(`${NS}.detailLoadError`) : null}
        onRetry={detailQ.refetch}
        isEmpty={!detailQ.isLoading && !resident}
        emptyMessage={t(`${NS}.detailLoadError`)}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={detailQ.isFetching} onRefresh={detailQ.refetch} tintColor={roleColor} />
          }
        >
          <Card style={styles.card} mode="outlined">
            <Card.Content style={styles.summary}>
              <AvatarCircle name={resident?.fullName ?? ''} size={48} />
              <View style={styles.summaryText}>
                <Text style={styles.name} numberOfLines={2}>{resident?.fullName ?? ''}</Text>
                {identity ? <Text style={styles.identity}>{identity}</Text> : null}
              </View>
              {resident?.residencyStatus ? (
                <StatusBadge
                  status={resident.residencyStatus}
                  size="sm"
                  label={getResidencyLabel(resident.residencyStatus)}
                />
              ) : null}
            </Card.Content>
          </Card>

          <Card style={styles.card} mode="outlined">
            <Card.Content>
              <Text style={styles.section}>{t(`${NS}.sectionAccommodation`)}</Text>
              {hasArea(resident) ? (
                <>
                  <Row label={t(`${NS}.building`)} value={area.building} styles={styles} />
                  <Row label={t(`${NS}.floor`)} value={area.floor} styles={styles} />
                  <Row label={t(`${NS}.room`)} value={area.room} styles={styles} />
                  <Row label={t(`${NS}.bed`)} value={area.bed} styles={styles} />
                </>
              ) : (
                <Text style={styles.blockValue}>{t(`${NS}.unassignedArea`)}</Text>
              )}
              <Row label={t(`${NS}.admittedAt`)} value={formatDate(resident?.admittedAt)} styles={styles} />
            </Card.Content>
          </Card>

          <Card style={styles.card} mode="outlined">
            <Card.Content>
              <Text style={styles.section}>{t(`${NS}.sectionHealth`)}</Text>
              {/* `bloodType: 'unknown'` bị Web ẩn — getBloodTypeLabel trả '' nên Row tự bỏ dòng. */}
              <Row label={t(`${NS}.bloodType`)} value={bloodType} styles={styles} />
              <Divider style={styles.divider} />
              <Block label={t(`${NS}.drugAllergies`)} value={drug.length ? drug.join(', ') : none} styles={styles} />
              <Block label={t(`${NS}.otherAllergies`)} value={other.length ? other.join(', ') : none} styles={styles} />
              <Block
                label={t(`${NS}.chronicConditions`)}
                value={conditions.length ? conditions.join(', ') : none}
                styles={styles}
              />
              {initialHealth ? (
                <Block label={t(`${NS}.initialHealth`)} value={initialHealth} styles={styles} />
              ) : null}
              <Text style={styles.hint}>{t(`${NS}.readOnlyHint`)}</Text>
            </Card.Content>
          </Card>
        </ScrollView>
      </ScreenLayout>
    </View>
  );
};

const createStyles = (c: AppColors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.background },
  content: { padding: 12, paddingBottom: 24 },
  card: { borderRadius: 12, marginBottom: 10, backgroundColor: c.surface },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryText: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: c.text },
  identity: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
  section: { fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, gap: 12 },
  rowLabel: { fontSize: 12, color: c.textSecondary },
  rowValue: { flex: 1, fontSize: 13, color: c.text, fontWeight: '500', textAlign: 'right' },
  block: { paddingVertical: 5 },
  blockValue: { fontSize: 13, color: c.text, marginTop: 2 },
  divider: { marginVertical: 6, backgroundColor: c.divider },
  hint: { fontSize: 11, color: c.textSecondary, marginTop: 10, fontStyle: 'italic' },
});
