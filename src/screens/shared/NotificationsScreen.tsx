import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/useAuth';
import { useNotifications, useMarkNotificationRead } from '../../hooks/useNotifications';
import { ScreenLayout } from '../../components/layout/ScreenLayout';

const ROLE_COLORS: Record<string, string> = {
  nurse: '#0F5040',
  doctor: '#0F5040',
  manager: '#0F5040',
  admin: '#0F5040',
  caregiver: '#6B4200',
};
const NS = 'shared.notifications';

export const NotificationsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user } = useAuth();
  const COLOR = ROLE_COLORS[user?.role ?? ''] ?? '#0F5040';
  const [filter, setFilter] = useState<'' | 'unread'>('');

  const params = filter === 'unread' ? { isRead: false, limit: 50 } : { limit: 50 };
  const notifQ = useNotifications(params);
  const items = notifQ.data?.items ?? notifQ.data?.data ?? [];
  const markRead = useMarkNotificationRead();

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { backgroundColor: COLOR, paddingTop: insets.top }]}>
        <View style={styles.topRow}>
          <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation.goBack()} />
          <Text style={styles.topTitle}>{t(`${NS}.title`)}</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

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
          refreshControl={<RefreshControl refreshing={false} onRefresh={notifQ.refetch} tintColor={COLOR} />}
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
  topBar: { paddingHorizontal: 4, paddingBottom: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  filterRow: { flexDirection: 'row', gap: 6, padding: 12 },
  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  content: { fontSize: 13, color: '#374151', marginTop: 4 },
  time: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },
});
