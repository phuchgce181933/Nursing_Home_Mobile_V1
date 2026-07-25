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
const NS = 'nurse.drugAllergies';
const MAX_ITEMS = 30;
const MIN_ITEM_LEN = 2;
const MAX_ITEM_LEN = 200;

export const DrugAllergiesScreen: React.FC<{ route?: any; navigation?: any }> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const { t } = useTranslation();

  const [selectedId, setSelectedId] = useState<string | undefined>(route?.params?.residentId);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [formError, setFormError] = useState('');

  const residentsQ = useResidents({ status: 'admitted', search: search || undefined });
  const allResidents = Array.isArray(residentsQ.data) ? residentsQ.data : (residentsQ.data?.data ?? []);

  const residentQ = useResidentDetail(selectedId);
  const resident = residentQ.data?.data ?? residentQ.data;
  const currentAllergies: string[] = resident?.drugAllergies ?? [];

  const openForm = () => {
    setItems([...currentAllergies]);
    setDraft('');
    setFormError('');
    setShowForm(true);
  };

  const addItem = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (trimmed.length < MIN_ITEM_LEN) { setFormError(t(`${NS}.itemTooShort`)); return; }
    if (trimmed.length > MAX_ITEM_LEN) { setFormError(t(`${NS}.itemTooLong`)); return; }
    if (items.length >= MAX_ITEMS) { setFormError(t(`${NS}.maxItemsReached`)); return; }
    if (items.some((i) => i.toLowerCase() === trimmed.toLowerCase())) { setFormError(t(`${NS}.duplicateItem`)); return; }
    setItems((prev) => [...prev, trimmed]);
    setDraft('');
    setFormError('');
  };

  const removeItem = (value: string) => setItems((prev) => prev.filter((i) => i !== value));

  const saveMutation = useMutation({
    mutationFn: async () => (await api.put(RESIDENTS.DRUG_ALLERGIES(selectedId!), { drugAllergies: items })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resident', selectedId] });
      setShowForm(false);
      toast(t(`${NS}.toastSaved`), 'success');
    },
    onError: (e: any) => toast(e.response?.data?.message ?? t(`${NS}.toastSaveError`), 'error'),
  });

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
              {currentAllergies.length > 0 ? (
                <View style={styles.chipRow}>
                  {currentAllergies.map((a) => (
                    <Chip key={a} style={styles.allergyChip} textStyle={{ color: '#991B1B' }}>{a}</Chip>
                  ))}
                </View>
              ) : (
                <Text style={styles.infoValue}>{t(`${NS}.noneRecorded`)}</Text>
              )}
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
            <View style={styles.chipRow}>
              {items.map((it) => (
                <Chip key={it} onClose={() => removeItem(it)} style={styles.allergyChip} textStyle={{ color: '#991B1B' }}>
                  {it}
                </Chip>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <TextInput
                placeholder={t(`${NS}.addPlaceholder`)}
                mode="outlined" value={draft}
                onChangeText={(v) => { setDraft(v); setFormError(''); }}
                onSubmitEditing={addItem}
                dense style={[styles.input, { flex: 1 }]}
                maxLength={MAX_ITEM_LEN}
              />
              <Button mode="contained" buttonColor={COLOR} onPress={addItem} compact>{t(`${NS}.addButton`)}</Button>
            </View>
            {formError ? <Text style={styles.errText}>{formError}</Text> : null}
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button mode="contained" buttonColor={COLOR} onPress={() => saveMutation.mutate()} loading={saveMutation.isPending}>{t(`${NS}.save`)}</Button>
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
  infoValue: { fontSize: 14, color: '#111827' },
  updateBtn: { marginTop: 16, borderRadius: 8 },
  input: { marginBottom: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  allergyChip: { backgroundColor: '#FEE2E2' },
  errText: { color: '#DC2626', fontSize: 11, marginTop: 8 },
});
