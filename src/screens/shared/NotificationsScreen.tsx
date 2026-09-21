import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/useAuth';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, useDeleteNotification } from '../../hooks/useNotifications';
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
const NS = 'shared.notifications';

export const NotificationsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const { user } = useAuth();
  const COLOR = ROLE_COLORS[user?.role ?? ''] ?? '#0F5040';
  const [filter, setFilter] = useState<'' | 'unread'>('');

  const params = filter === 'unread' ? { isRead: false, limit: 50 } : { limit: 50 };
  const notifQ = useNotifications(params);
  const items = notifQ.data?.items ?? notifQ.data?.data ?? [];
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotif = useDeleteNotification();

  const unreadIds = items.filter((i: any) => !i.isRead).map((i: any) => i._id);

  const handleMarkAllRead = () => {
    if (!unreadIds.length) return;
    markAllRead.mutate(unreadIds, {
      onError: () => toast(t(`${NS}.toastActionError`), 'error'),
    });
  };

  const handleDelete = (id: string) => {
    deleteNotif.mutate(id, {
      onError: () => toast(t(`${NS}.toastActionError`), 'error'),
    });
  };

  return (
    <View style={styles.flex}>
      <BackHeader
        title={t(`${NS}.title`)}
        color={COLOR}
        onBack={() => navigation.goBack()}
        right={
          <View style={styles.topActions}>
            <IconButton icon="check-all" iconColor="#fff" size={20} disabled={!unreadIds.length} onPress={handleMarkAllRead} />
            <IconButton icon="cog-outline" iconColor="#fff" size={20} onPress={() => navigation.navigate('NotificationSettings')} />
          </View>
        }
      />

      <View style={styles.filterRow}>
        <Chip selected={filter === ''} onPress={() => setFilter('')}
          style={filter === '' ? { backgroundColor: COLOR } : undefined}
          textStyle={filter === '' ? { color: '#fff' } : undefined} compact>{t(`${NS}.filterAll`)}</Chip>
        <Chip selected={filter === 'unread'} onPress={() => setFilter('unread')}
          style={filter === 'unread' ? { backgroundColor: COLOR } : undefined}
          textStyle={filter === 'unread' ? { color: '#fff' } : undefined} compact>{t(`${NS}.filterUnread`)}</Chip>
      </View>

      <ScreenLayout loading={notifQ.isLoading} error={notifQ.error ? (notifQ.error as Error).message : null}
        onRetry={notifQ.refetch} isEmpty={items.length === 0} emptyMessage={t(`${NS}.empty`)}>
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={notifQ.isFetching} onRefresh={notifQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card
              style={[styles.card, { borderLeftWidth: 4, borderLeftColor: item.isRead ? '#E5E7EB' : COLOR }]}
              mode="outlined"
              onPress={() => !item.isRead && markRead.mutate(item._id)}
            >
              <Card.Content>
                <View style={styles.row}>
                  <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                  {!item.isRead ? <View style={[styles.dot, { backgroundColor: COLOR }]} /> : null}
                  <IconButton icon="trash-can-outline" size={16} onPress={() => handleDelete(item._id)} style={styles.deleteBtn} />
                </View>
                <Text style={styles.content}>{item.content}</Text>
                <Text style={styles.time}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : ''}
                </Text>
              </Card.Content>
            </Card>
          )} />
      </ScreenLayout>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topActions: { flexDirection: 'row', alignItems: 'center' },
  filterRow: { flexDirection: 'row', gap: 6, padding: 12 },
  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  deleteBtn: { margin: 0, marginLeft: 4 },
  content: { fontSize: 13, color: '#374151', marginTop: 4 },
  time: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },
});
