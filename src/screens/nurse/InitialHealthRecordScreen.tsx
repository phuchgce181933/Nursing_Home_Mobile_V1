import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Text, Card, Button, TextInput, Portal, Dialog, IconButton, Chip } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useResidents, useResidentDetail } from '../../hooks/useResidents';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { AvatarCircle } from '../../components/shared/AvatarCircle';
import { useToast } from '../../utils/toast';
import api from '../../api/axiosInstance';
import { RESIDENTS } from '../../api/endpoints';

const COLOR = '#0F5040';
const NS = 'nurse.initialHealth';
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'];
const MIN_LEN = 10;
const MAX_LEN = 500;

export const InitialHealthRecordScreen: React.FC<{ route?: any; navigation?: any }> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const { t } = useTranslation();

  const [selectedId, setSelectedId] = useState<string | undefined>(route?.params?.residentId);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [bloodType, setBloodType] = useState('unknown');
  const [condition, setCondition] = useState('');
  const [formError, setFormError] = useState('');

  const residentsQ = useResidents({ status: 'admitted', search: search || undefined });
  const allResidents = Array.isArray(residentsQ.data) ? residentsQ.data : (residentsQ.data?.data ?? []);

  const residentQ = useResidentDetail(selectedId);
  const resident = residentQ.data?.data ?? residentQ.data;

  const openForm = () => {
    setBloodType(resident?.bloodType || 'unknown');
    setCondition(resident?.initialHealthCondition || '');
    setFormError('');
    setShowForm(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => (await api.put(RESIDENTS.INITIAL_HEALTH(selectedId!), {
      bloodType,
      initialHealthCondition: condition.trim(),
    })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resident', selectedId] });
      setShowForm(false);
      toast(t(`${NS}.toastSaved`), 'success');
    },
    onError: (e: any) => toast(e.response?.data?.message ?? t(`${NS}.toastSaveError`), 'error'),
  });

  const handleSubmit = () => {
    const trimmed = condition.trim();
    if (!trimmed) { setFormError(t(`${NS}.conditionRequired`)); return; }
    if (trimmed.length < MIN_LEN) { setFormError(t(`${NS}.conditionTooShort`)); return; }
    if (trimmed.length > MAX_LEN) { setFormError(t(`${NS}.conditionTooLong`)); return; }
    setFormError('');
    saveMutation.mutate();
  };

  if (!selectedId) {
    return (
      <View style={styles.flex}>
        <View style={[styles.topBar, { paddingTop: insets.top }]}>
          <View style={styles.topRow}>
            <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation?.goBack()} />
            <Text style={styles.topTitle}>{t(`${NS}.title`)}</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>
        <View style={{ padding: 12 }}>
          <TextInput placeholder={t(`${NS}.searchPlaceholder`)} mode="outlined" value={search}
            onChangeText={setSearch} dense style={{ backgroundColor: '#fff', marginBottom: 8 }}
            left={<TextInput.Icon icon="magnify" />} />
        </View>
        <ScreenLayout loading={residentsQ.isLoading} error={residentsQ.error ? (residentsQ.error as Error).message : null}
          onRetry={residentsQ.refetch} isEmpty={allResidents.length === 0} emptyMessage={t(`${NS}.empty`)}>
          <FlatList data={allResidents} keyExtractor={(i: any) => i._id} contentContainerStyle={{ padding: 16 }}
            refreshControl={<RefreshControl refreshing={false} onRefresh={residentsQ.refetch} tintColor={COLOR} />}
            renderItem={({ item }) => (
              <Pressable onPress={() => setSelectedId(item._id)} style={styles.residentItem}>
                <AvatarCircle name={item.fullName} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.residentName}>{item.fullName}</Text>
                  <Text style={styles.residentCode}>{item.residentCode}</Text>
                </View>
              </Pressable>
            )} />
        </ScreenLayout>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <View style={styles.topRow}>
          <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => setSelectedId(undefined)} />
          <View style={{ flex: 1 }}>
            <Text style={styles.topTitle}>{resident?.fullName ?? t(`${NS}.title`)}</Text>
            <Text style={styles.topSub}>{resident?.residentCode ?? ''}</Text>
          </View>
        </View>
      </View>

      <ScreenLayout loading={residentQ.isLoading} error={residentQ.error ? (residentQ.error as Error).message : null} onRetry={residentQ.refetch}>
        <View style={styles.body}>
          <SectionHeader title={t(`${NS}.detailTitle`)} roleColor={COLOR} />
          <Card style={styles.card} mode="outlined">
            <Card.Content>
              <Text style={styles.infoLabel}>{t(`${NS}.bloodTypeLabel`)}</Text>
              <Text style={styles.infoValue}>{resident?.bloodType && resident.bloodType !== 'unknown' ? resident.bloodType : t(`${NS}.noneRecorded`)}</Text>
              <Text style={[styles.infoLabel, { marginTop: 12 }]}>{t(`${NS}.conditionLabel`)}</Text>
              <Text style={styles.infoValue}>{resident?.initialHealthCondition || t(`${NS}.noneRecorded`)}</Text>
            </Card.Content>
          </Card>
          <Button mode="contained" buttonColor={COLOR} style={styles.updateBtn} onPress={openForm}>
            {t(`${NS}.editButton`)}
          </Button>
        </View>
      </ScreenLayout>

      <Portal>
        <Dialog visible={showForm} onDismiss={() => setShowForm(false)} style={{ borderRadius: 16 }}>
          <Dialog.Title>{t(`${NS}.editButton`)}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 420 }}>
            <Text style={styles.chipLabel}>{t(`${NS}.bloodTypeLabel`)}</Text>
            <View style={styles.chipRow}>
              {BLOOD_TYPES.map((bt) => (
                <Chip key={bt} selected={bloodType === bt} onPress={() => setBloodType(bt)}
                  style={bloodType === bt ? { backgroundColor: COLOR } : undefined}
                  textStyle={bloodType === bt ? { color: '#fff' } : undefined}>
                  {bt}
                </Chip>
              ))}
            </View>
            <TextInput label={t(`${NS}.conditionLabel`)} mode="outlined" value={condition}
              onChangeText={(v) => { setCondition(v); setFormError(''); }} dense multiline
              style={styles.input} error={!!formError} maxLength={MAX_LEN} />
            <Text style={styles.charCount}>{condition.length}/{MAX_LEN}</Text>
            {formError ? <Text style={styles.errText}>{formError}</Text> : null}
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button mode="contained" buttonColor={COLOR} onPress={handleSubmit} loading={saveMutation.isPending}>{t(`${NS}.save`)}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 4, paddingBottom: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  topSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 1 },
  body: { padding: 16, paddingBottom: 32 },
  residentItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8 },
  residentName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  residentCode: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  card: { borderRadius: 12, backgroundColor: '#fff' },
  infoLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#111827' },
  updateBtn: { marginTop: 16, borderRadius: 8 },
  input: { marginBottom: 4 },
  chipLabel: { fontSize: 11, color: '#6B7280', marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  charCount: { color: '#9CA3AF', fontSize: 10, textAlign: 'right', marginBottom: 4 },
  errText: { color: '#DC2626', fontSize: 11, marginBottom: 8 },
});
