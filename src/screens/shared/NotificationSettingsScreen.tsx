import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Switch, Button } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/useAuth';
import { useNotificationCategories, useNotificationSettings, useUpdateNotificationSettings } from '../../hooks/useNotifications';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { BackHeader } from '../../components/layout/BackHeader';
import { useToast } from '../../utils/toast';

const ROLE_COLORS: Record<string, string> = {
  nurse: '#0F5040',
  doctor: '#0F5040',
  manager: '#0F5040',
  admin: '#0F5040',
  caregiver: '#6B4200',
};
const NS = 'shared.notificationSettings';

export const NotificationSettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const { user } = useAuth();
  const COLOR = ROLE_COLORS[user?.role ?? ''] ?? '#0F5040';

  const categoriesQ = useNotificationCategories();
  const settingsQ = useNotificationSettings();
  const updateMut = useUpdateNotificationSettings();

  const categories: string[] = categoriesQ.data?.categories ?? [];
  const [enabledCategories, setEnabledCategories] = useState<string[]>([]);
  const [doNotDisturb, setDoNotDisturb] = useState(false);

  useEffect(() => {
    if (!settingsQ.data) return;
    setEnabledCategories(settingsQ.data.enabledCategories ?? categories);
    setDoNotDisturb(!!settingsQ.data.doNotDisturb);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only sync from server data once it arrives
  }, [settingsQ.data]);

  const toggleCategory = (category: string) => {
    setEnabledCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const handleSave = () => {
    updateMut.mutate(
      { enabledCategories, doNotDisturb },
      {
        onSuccess: () => toast(t(`${NS}.toastSaved`), 'success'),
        onError: () => toast(t(`${NS}.toastError`), 'error'),
      }
    );
  };

  const loading = categoriesQ.isLoading || settingsQ.isLoading;
  const error = categoriesQ.error || settingsQ.error ? t(`${NS}.loadError`) : null;

  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.title`)} color={COLOR} onBack={() => navigation.goBack()} />

      <ScreenLayout loading={loading} error={error} onRetry={() => { categoriesQ.refetch(); settingsQ.refetch(); }}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>{t(`${NS}.categoriesTitle`)}</Text>
          <Card style={styles.card} mode="outlined">
            {categories.map((category, idx) => (
              <View key={category} style={[styles.row, idx > 0 && styles.rowBorder]}>
                <Text style={styles.rowLabel}>{t(`${NS}.category_${category}`, category)}</Text>
                <Switch
                  value={enabledCategories.includes(category)}
                  onValueChange={() => toggleCategory(category)}
                  color={COLOR}
                />
              </View>
            ))}
          </Card>

          <Text style={styles.sectionTitle}>{t(`${NS}.generalTitle`)}</Text>
          <Card style={styles.card} mode="outlined">
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t(`${NS}.doNotDisturb`)}</Text>
              <Switch value={doNotDisturb} onValueChange={setDoNotDisturb} color={COLOR} />
            </View>
          </Card>

          <Button mode="contained" buttonColor={COLOR} style={styles.saveBtn} onPress={handleSave} loading={updateMut.isPending}>
            {t(`${NS}.save`)}
          </Button>
        </ScrollView>
      </ScreenLayout>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 8, marginTop: 8, textTransform: 'uppercase' },
  card: { borderRadius: 12, marginBottom: 16, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  rowLabel: { fontSize: 14, color: '#111827', flex: 1 },
  saveBtn: { marginTop: 8 },
});
