import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, IconButton, Chip } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { AvatarCircle } from '../../components/shared/AvatarCircle';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { SectionHeader } from '../../components/layout/SectionHeader';

const COLOR = '#2E7D32';
const NS = 'family.residentProfile';

const calcAge = (dateOfBirth?: string): number | null => {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age;
};

const InfoRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || '--'}</Text>
  </View>
);

const TagList: React.FC<{ items: string[] }> = ({ items }) => (
  <View style={styles.tagRow}>
    {items.map((item, i) => (
      <Chip key={i} compact style={styles.tag}>{item}</Chip>
    ))}
  </View>
);

export const FamilyResidentProfileScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const residentId = route.params?.residentId;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const residentQ = useQuery({
    queryKey: ['familyResidentProfile', residentId],
    queryFn: async () => (await api.get(FAMILY.RESIDENT_DETAIL(residentId))).data,
    enabled: !!residentId,
  });
  const resident = residentQ.data?.data ?? residentQ.data;
  const age = calcAge(resident?.dateOfBirth);

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <View style={styles.topRow}>
          <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation.goBack()} />
          <Text style={styles.topTitle}>{t(`${NS}.title`)}</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.body}>
        <ScreenLayout loading={residentQ.isLoading} error={residentQ.error ? (residentQ.error as Error).message : null} onRetry={residentQ.refetch}>
          <View style={styles.headerSection}>
            <AvatarCircle name={resident?.fullName ?? '?'} size={88} uri={resident?.avatarUrl} />
            <Text style={styles.name}>{resident?.fullName}</Text>
            <Text style={styles.code}>{resident?.residentCode}</Text>
            <StatusBadge status={resident?.residencyStatus} size="sm" />
          </View>

          <SectionHeader title={t(`${NS}.basicInfoTitle`)} roleColor={COLOR} />
          <Card style={styles.card} mode="outlined">
            <Card.Content>
              <InfoRow label={t(`${NS}.gender`)} value={resident?.gender === 'male' ? t(`${NS}.male`) : resident?.gender === 'female' ? t(`${NS}.female`) : t(`${NS}.otherGender`)} />
              <InfoRow label={t(`${NS}.age`)} value={age != null ? t(`${NS}.ageValue`, { age }) : undefined} />
              <InfoRow label={t(`${NS}.bloodType`)} value={resident?.bloodType && resident.bloodType !== 'unknown' ? resident.bloodType : undefined} />
              <InfoRow label={t(`${NS}.room`)} value={resident?.roomId?.roomNumber} />
            </Card.Content>
          </Card>

          <SectionHeader title={t(`${NS}.medicalTitle`)} roleColor={COLOR} />
          <Card style={styles.card} mode="outlined">
            <Card.Content>
              {resident?.initialHealthCondition ? (
                <>
                  <Text style={styles.subLabel}>{t(`${NS}.initialHealth`)}</Text>
                  <Text style={styles.paragraph}>{resident.initialHealthCondition}</Text>
                </>
              ) : null}

              <Text style={styles.subLabel}>{t(`${NS}.chronicConditions`)}</Text>
              {resident?.chronicConditions?.length ? <TagList items={resident.chronicConditions} /> : <Text style={styles.emptyText}>{t(`${NS}.noneRecorded`)}</Text>}

              <Text style={styles.subLabel}>{t(`${NS}.allergies`)}</Text>
              {resident?.allergies?.length ? <TagList items={resident.allergies} /> : <Text style={styles.emptyText}>{t(`${NS}.noneRecorded`)}</Text>}

              <Text style={styles.subLabel}>{t(`${NS}.drugAllergies`)}</Text>
              {resident?.drugAllergies?.length ? <TagList items={resident.drugAllergies} /> : <Text style={styles.emptyText}>{t(`${NS}.noneRecorded`)}</Text>}

              <Text style={styles.subLabel}>{t(`${NS}.medicalHistory`)}</Text>
              {resident?.medicalHistory?.length ? <TagList items={resident.medicalHistory} /> : <Text style={styles.emptyText}>{t(`${NS}.noneRecorded`)}</Text>}
            </Card.Content>
          </Card>
        </ScreenLayout>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 4, paddingBottom: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  body: { padding: 16, paddingBottom: 32 },
  headerSection: { alignItems: 'center', marginBottom: 16, gap: 4 },
  name: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 8 },
  code: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  card: { borderRadius: 12, marginBottom: 12, backgroundColor: '#fff' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  infoLabel: { fontSize: 13, color: '#6B7280' },
  infoValue: { fontSize: 13, fontWeight: '500', color: '#111827' },
  subLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginTop: 10, marginBottom: 6 },
  paragraph: { fontSize: 13, color: '#374151', marginBottom: 4 },
  emptyText: { fontSize: 12, color: '#9CA3AF' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: '#FEE2E2' },
});
