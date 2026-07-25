import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Button, FAB, Dialog, Portal, TextInput, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { useToast } from '../../utils/toast';

const COLOR = '#2E7D32';
const NS = 'family.support';

export const FamilySupportScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const [closeId, setCloseId] = useState<string | null>(null);
  const [closeNote, setCloseNote] = useState('');
  const [form, setForm] = useState({ fullName: '', age: '', phone: '', address: '', notes: '' });

  const listQ = useQuery({ queryKey: ['supportRequests'], queryFn: async () => (await api.get(FAMILY.SUPPORT_REQUESTS)).data });
  const items = listQ.data?.items ?? [];

  const ageNum = Number(form.age);
  const ageInvalid = form.age.trim() !== '' && (Number.isNaN(ageNum) || ageNum < 0 || ageNum > 150);
  const ageMissing = form.age.trim() === '';
  const formInvalid = !form.fullName.trim() || !form.phone.trim() || !form.address.trim() || ageMissing || ageInvalid;

  const createMut = useMutation({
    mutationFn: async () => (await api.post(FAMILY.SUPPORT_REQUESTS, { ...form, age: Number(form.age) })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['supportRequests'] }); setShowCreate(false); setForm({ fullName: '', age: '', phone: '', address: '', notes: '' }); toast(t(`${NS}.toastSent`), 'success'); },
    onError: () => toast(t(`${NS}.toastSendError`), 'error'),
  });

  const closeMut = useMutation({
    mutationFn: async () => (await api.patch(FAMILY.SUPPORT_CLOSE(closeId!), { action: 'close', closingNote: closeNote })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['supportRequests'] }); setCloseId(null); setCloseNote(''); toast(t(`${NS}.toastClosed`), 'success'); },
    onError: () => toast(t(`${NS}.toastCloseError`), 'error'),
  });

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation?.goBack()} style={styles.backBtn} />
        <Text style={styles.topTitle}>{t(`${NS}.title`)}</Text>
      </View>
      <ScreenLayout loading={listQ.isLoading} error={listQ.error ? (listQ.error as Error).message : null} onRetry={listQ.refetch} isEmpty={items.length === 0} emptyMessage={t(`${NS}.empty`)}>
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={false} onRefresh={listQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined" onPress={() => navigation?.navigate('SupportThread', { requestId: item._id })}>
              <Card.Content>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}><Text style={styles.name}>{item.fullName}</Text><Text style={styles.sub}>{item.phone} · {item.age ? t(`${NS}.ageLabel`, { age: item.age }) : ''}</Text>{item.notes ? <Text style={styles.reason} numberOfLines={2}>{item.notes}</Text> : null}</View>
                  <StatusBadge status={item.status} size="sm" />
                </View>
              </Card.Content>
              {item.status === 'open' || item.status === 'in_progress' ? (
                <Card.Actions><Button compact textColor="#991B1B" onPress={() => setCloseId(item._id)}>{t(`${NS}.close`)}</Button></Card.Actions>
              ) : null}
            </Card>
          )} />
      </ScreenLayout>
      <FAB icon="plus" style={[styles.fab, { backgroundColor: COLOR }]} color="#fff" onPress={() => setShowCreate(true)} />

      <Portal>
        <Dialog visible={showCreate} onDismiss={() => setShowCreate(false)} style={{ borderRadius: 16 }}>
          <Dialog.Title>{t(`${NS}.createTitle`)}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 350 }}>
            <TextInput label={t(`${NS}.fullNameLabel`)} mode="outlined" value={form.fullName} onChangeText={v => setForm(f => ({ ...f, fullName: v }))} dense style={styles.input} />
            <TextInput label={t(`${NS}.ageInputLabel`)} mode="outlined" value={form.age} onChangeText={v => setForm(f => ({ ...f, age: v.replace(/[^0-9]/g, '') }))} dense keyboardType="numeric" style={styles.input} error={ageInvalid} />
            {ageInvalid ? <Text style={styles.errorText}>{t(`${NS}.ageInvalid`)}</Text> : null}
            <TextInput label={t(`${NS}.phoneLabel`)} mode="outlined" value={form.phone} onChangeText={v => setForm(f => ({ ...f, phone: v }))} dense keyboardType="phone-pad" style={styles.input} />
            <TextInput label={t(`${NS}.addressLabel`)} mode="outlined" value={form.address} onChangeText={v => setForm(f => ({ ...f, address: v }))} dense style={styles.input} />
            <TextInput label={t(`${NS}.notesLabel`)} mode="outlined" value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} dense multiline style={styles.input} />
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowCreate(false)}>{t('common.cancel')}</Button>
            <Button mode="contained" buttonColor={COLOR} onPress={() => createMut.mutate()} loading={createMut.isPending} disabled={formInvalid}>{t(`${NS}.send`)}</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={!!closeId} onDismiss={() => setCloseId(null)}>
          <Dialog.Title>{t(`${NS}.closeConfirmTitle`)}</Dialog.Title>
          <Dialog.Content><TextInput label={t(`${NS}.closeNoteLabel`)} mode="outlined" value={closeNote} onChangeText={setCloseNote} dense multiline /></Dialog.Content>
          <Dialog.Actions><Button onPress={() => setCloseId(null)}>{t('common.cancel')}</Button><Button mode="contained" buttonColor="#991B1B" onPress={() => closeMut.mutate()} loading={closeMut.isPending}>{t(`${NS}.close`)}</Button></Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' }, topBar: { backgroundColor: COLOR, paddingHorizontal: 8, paddingBottom: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center' }, backBtn: { margin: 0 }, topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' }, list: { padding: 16, paddingBottom: 80 }, card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' }, row: { flexDirection: 'row', alignItems: 'center' }, name: { fontSize: 14, fontWeight: '600', color: '#111827' }, sub: { fontSize: 12, color: '#6B7280', marginTop: 2 }, reason: { fontSize: 12, color: '#374151', marginTop: 4 }, fab: { position: 'absolute', bottom: 16, right: 16 }, input: { marginBottom: 8 }, errorText: { color: '#991B1B', fontSize: 11, marginTop: -6, marginBottom: 8, marginLeft: 4 },
});
