import React, { useState } from 'react';
import { View, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, IconButton, TextInput, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { useAuth } from '../../auth/useAuth';
import { getRoleColor } from '../../theme/theme';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { useToast } from '../../utils/toast';

const NS = 'shared.supportThread';

export const SupportThreadScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const requestId = route.params?.requestId;
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { user } = useAuth();
  const COLOR = getRoleColor(user?.role);
  const [text, setText] = useState('');

  const detailQ = useQuery({
    queryKey: ['supportRequestDetail', requestId],
    queryFn: async () => (await api.get(FAMILY.SUPPORT_DETAIL(requestId))).data,
    enabled: !!requestId,
    refetchInterval: 4000,
  });
  const request = detailQ.data;
  const messages = request?.messages ?? [];

  const sendMut = useMutation({
    mutationFn: async () => (await api.post(FAMILY.SUPPORT_MESSAGES(requestId), { text })).data,
    onSuccess: () => { setText(''); qc.invalidateQueries({ queryKey: ['supportRequestDetail', requestId] }); },
    onError: () => toast(t(`${NS}.toastSendError`), 'error'),
  });

  const closeMut = useMutation({
    mutationFn: async () => (await api.patch(FAMILY.SUPPORT_CLOSE(requestId), { action: 'close' })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supportRequestDetail', requestId] });
      qc.invalidateQueries({ queryKey: ['supportRequests'] });
      qc.invalidateQueries({ queryKey: ['staffSupportRequests'] });
      toast(t(`${NS}.toastClosed`), 'success');
    },
    onError: () => toast(t(`${NS}.toastCloseError`), 'error'),
  });

  const canClose = request?.status === 'open' || request?.status === 'in_progress';

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top}>
      <View style={[styles.topBar, { backgroundColor: COLOR, paddingTop: insets.top }]}>
        <View style={styles.topRow}>
          <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation.goBack()} />
          <View style={{ flex: 1 }}>
            <Text style={styles.topTitle} numberOfLines={1}>{request?.subject ?? request?.fullName ?? t(`${NS}.title`)}</Text>
          </View>
          {request ? <StatusBadge status={request.status} size="sm" /> : null}
          {canClose ? <IconButton icon="check-circle-outline" iconColor="#fff" size={22} onPress={() => closeMut.mutate()} /> : <View style={{ width: 40 }} />}
        </View>
      </View>

      <ScreenLayout loading={detailQ.isLoading} error={detailQ.error ? (detailQ.error as Error).message : null} onRetry={detailQ.refetch}>
        <FlatList
          data={messages}
          keyExtractor={(m: any, i: number) => m._id ?? String(i)}
          contentContainerStyle={styles.list}
          inverted={messages.length > 0}
          renderItem={({ item }) => {
            const isMine = String(item.senderId) === String(user?._id);
            return (
              <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                <View style={[styles.bubble, isMine ? { backgroundColor: COLOR } : styles.bubbleTheirs]}>
                  <Text style={[styles.bubbleText, isMine && { color: '#fff' }]}>{item.text}</Text>
                  <Text style={[styles.bubbleTime, isMine && { color: 'rgba(255,255,255,0.7)' }]}>
                    {item.sentAt ? new Date(item.sentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.emptyText}>{t(`${NS}.empty`)}</Text>}
        />
      </ScreenLayout>

      <View style={[styles.inputRow, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          mode="outlined"
          placeholder={t(`${NS}.messagePlaceholder`)}
          value={text}
          onChangeText={(v) => setText(v.slice(0, 2000))}
          dense
          multiline
          maxLength={2000}
          style={styles.input}
        />
        <Button mode="contained" buttonColor={COLOR} onPress={() => sendMut.mutate()} loading={sendMut.isPending} disabled={!text.trim()}>
          {t(`${NS}.send`)}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { paddingHorizontal: 4, paddingBottom: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  topTitle: { color: '#fff', fontSize: 15, fontWeight: '500' },
  list: { padding: 16, flexGrow: 1 },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 24 },
  bubbleRow: { flexDirection: 'row', marginBottom: 8 },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleTheirs: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  bubbleText: { fontSize: 13, color: '#111827' },
  bubbleTime: { fontSize: 9, color: '#9CA3AF', marginTop: 4, textAlign: 'right' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  input: { flex: 1, backgroundColor: '#fff', maxHeight: 100 },
});
