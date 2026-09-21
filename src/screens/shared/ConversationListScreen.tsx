import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Button, FAB, Dialog, Portal, TextInput, Searchbar } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { CONVERSATIONS } from '../../api/endpoints';
import { useAuth } from '../../auth/useAuth';
import { getRoleColor } from '../../theme/theme';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { useToast } from '../../utils/toast';

const NS = 'shared.chat';

export const ConversationListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();
  const isFamily = user?.role === 'family';
  const COLOR = getRoleColor(user?.role);

  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showNewChat, setShowNewChat] = useState(false);
  const [subject, setSubject] = useState('');
  const [staffDirectory, setStaffDirectory] = useState<any[]>([]);
  const [staffQuery, setStaffQuery] = useState('');
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get(CONVERSATIONS.LIST);
      setConversations(res.data?.data ?? []);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, [loadConversations]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load on mount
    loadConversations();
  }, [loadConversations]);

  const openNewChat = async () => {
    setShowNewChat(true);
    if (!isFamily && staffDirectory.length === 0) {
      try {
        const res = await api.get(CONVERSATIONS.STAFF_DIRECTORY);
        setStaffDirectory(res.data?.data ?? []);
      } catch {
        toast(t(`${NS}.toastLoadStaffError`), 'error');
      }
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const body = isFamily ? { subject: subject.trim() || undefined } : { targetUserId: selectedTargetId, subject: subject.trim() || undefined };
      const res = await api.post(CONVERSATIONS.CREATE, body);
      const conv = res.data?.data;
      setShowNewChat(false);
      setSubject('');
      setSelectedTargetId(null);
      setStaffQuery('');
      await loadConversations();
      if (conv?._id) openThread(conv);
    } catch {
      toast(t(`${NS}.toastCreateError`), 'error');
    } finally {
      setCreating(false);
    }
  };

  const displayName = (c: any) => {
    if (c.guestName) return c.guestName;
    const other = (c.participantUserIds ?? []).find((p: any) => String(p._id) !== String(user?._id));
    if (other?.fullName) return other.fullName;
    if (isFamily) return t(`${NS}.adminConversation`);
    return c.subject || t(`${NS}.title`);
  };

  const openThread = (c: any) => {
    navigation.navigate('ChatThread', { conversationId: c._id, title: displayName(c) });
  };

  const filteredStaff = staffQuery
    ? staffDirectory.filter((u) => (u.fullName || u.email || '').toLowerCase().includes(staffQuery.toLowerCase()))
    : staffDirectory;

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { backgroundColor: COLOR, paddingTop: insets.top + 8 }]}>
        <Text style={styles.topTitle}>{t(`${NS}.title`)}</Text>
      </View>

      <ScreenLayout loading={loading} error={error} onRetry={loadConversations} isEmpty={conversations.length === 0} emptyMessage={t(`${NS}.empty`)}>
        <FlatList
          data={conversations}
          keyExtractor={(c: any) => c._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLOR} />}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 40).duration(280)}>
              <Card style={styles.card} mode="outlined" onPress={() => openThread(item)}>
                <Card.Content>
                  <View style={styles.row}>
                    {item.unreadCount > 0 ? <View style={[styles.unreadDot, { backgroundColor: COLOR }]} /> : null}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.name, item.unreadCount > 0 && styles.nameUnread]}>{displayName(item)}</Text>
                      {item.subject ? <Text style={styles.sub} numberOfLines={1}>{item.subject}</Text> : null}
                    </View>
                    <Text style={styles.time}>
                      {item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : ''}
                    </Text>
                  </View>
                </Card.Content>
              </Card>
            </Animated.View>
          )}
        />
      </ScreenLayout>

      <FAB icon="plus" style={[styles.fab, { backgroundColor: COLOR }]} color="#fff" onPress={openNewChat} />

      <Portal>
        <Dialog visible={showNewChat} onDismiss={() => setShowNewChat(false)} style={{ borderRadius: 16 }}>
          <Dialog.Title>{t(`${NS}.newChatTitle`)}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 420 }}>
            {isFamily ? (
              <TextInput label={t(`${NS}.title`)} mode="outlined" value={subject} onChangeText={setSubject} dense style={styles.input} />
            ) : (
              <>
                <Searchbar
                  placeholder={t(`${NS}.searchStaffPlaceholder`)}
                  value={staffQuery}
                  onChangeText={setStaffQuery}
                  style={styles.searchbar}
                />
                {filteredStaff.length === 0 ? (
                  <Text style={styles.hint}>{t(`${NS}.noStaffFound`)}</Text>
                ) : (
                  filteredStaff.map((u) => (
                    <Card
                      key={u._id}
                      mode={selectedTargetId === u._id ? 'contained' : 'outlined'}
                      style={[styles.staffCard, selectedTargetId === u._id && { backgroundColor: `${COLOR}22` }]}
                      onPress={() => setSelectedTargetId(u._id)}
                    >
                      <Card.Content style={styles.staffRow}>
                        <Text style={styles.staffName}>{u.fullName || u.email}</Text>
                        <Text style={styles.staffRole}>{u.role}</Text>
                      </Card.Content>
                    </Card>
                  ))
                )}
              </>
            )}
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowNewChat(false)}>{t(`${NS}.cancel`)}</Button>
            <Button
              mode="contained"
              buttonColor={COLOR}
              onPress={handleCreate}
              loading={creating}
              disabled={!isFamily && !selectedTargetId}
            >
              {t(`${NS}.startChat`)}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { paddingHorizontal: 16, paddingBottom: 16 },
  topTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  list: { padding: 16, paddingBottom: 80 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '600', color: '#111827' },
  nameUnread: { fontWeight: '700' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  sub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  time: { fontSize: 11, color: '#9CA3AF', marginLeft: 8 },
  fab: { position: 'absolute', bottom: 16, right: 16 },
  input: { marginBottom: 8 },
  searchbar: { marginBottom: 10, elevation: 0, backgroundColor: '#F0F0F0' },
  hint: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 16 },
  staffCard: { marginBottom: 6 },
  staffRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  staffName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  staffRole: { fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase' },
});
