import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Image } from 'react-native';
import { Text, Chip, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { ScreenLayout } from '../../components/layout/ScreenLayout';

const COLOR = '#2E7D32';
const NS = 'family.photos';

export const FamilyPhotosScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const residentsQ = useQuery({
    queryKey: ['familyResidents'],
    queryFn: async () => { const r = await api.get(FAMILY.RESIDENTS); return r.data; },
  });
  const residents = residentsQ.data?.data ?? residentsQ.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId = selectedId ?? residents[0]?._id;

  const photosQ = useQuery({
    queryKey: ['familyResidentPhotos', activeId],
    queryFn: async () => (await api.get(FAMILY.RESIDENT_PHOTOS(activeId!))).data,
    enabled: !!activeId,
  });
  const photos = photosQ.data?.data ?? [];

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation?.goBack()} style={styles.backBtn} />
        <Text style={styles.topTitle}>{t(`${NS}.title`)}</Text>
      </View>

      {residents.length > 1 ? (
        <View style={styles.chipRow}>
          {residents.map((r: any) => (
            <Chip key={r._id} selected={activeId === r._id} onPress={() => setSelectedId(r._id)}
              style={activeId === r._id ? { backgroundColor: COLOR } : undefined}
              textStyle={activeId === r._id ? { color: '#fff' } : undefined} compact>{r.fullName}</Chip>
          ))}
        </View>
      ) : null}

      <ScreenLayout
        loading={residentsQ.isLoading || photosQ.isLoading}
        error={photosQ.error ? (photosQ.error as Error).message : null}
        onRetry={photosQ.refetch}
        isEmpty={photos.length === 0}
        emptyMessage={t(`${NS}.empty`)}
      >
        <FlatList
          data={photos}
          keyExtractor={(p: any) => p._id}
          numColumns={3}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => photosQ.refetch()} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <View style={styles.photoCell}>
              <Image source={{ uri: item.url }} style={styles.photoImage} />
              {item.caption ? <Text style={styles.caption} numberOfLines={2}>{item.caption}</Text> : null}
              {item.uploadedAt ? <Text style={styles.date}>{new Date(item.uploadedAt).toLocaleDateString('vi-VN')}</Text> : null}
            </View>
          )}
        />
      </ScreenLayout>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 8, paddingBottom: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center' },
  backBtn: { margin: 0 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  chipRow: { flexDirection: 'row', gap: 6, padding: 12, flexWrap: 'wrap' },
  list: { padding: 12, paddingBottom: 32 },
  photoCell: { width: '33.33%', padding: 4 },
  photoImage: { width: '100%', aspectRatio: 1, borderRadius: 8, backgroundColor: '#E5E7EB' },
  caption: { fontSize: 10, color: '#374151', marginTop: 2 },
  date: { fontSize: 9, color: '#9CA3AF' },
});
