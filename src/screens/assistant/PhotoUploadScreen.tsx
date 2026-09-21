import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Image, Pressable } from 'react-native';
import { Text, Button, TextInput, IconButton, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import api from '../../api/axiosInstance';
import { CAREGIVER } from '../../api/endpoints';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { useToast } from '../../utils/toast';

const COLOR = '#6B4200';
const NS = 'assistant.photoUpload';

export const PhotoUploadScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [residentId, setResidentId] = useState('');
  const [caption, setCaption] = useState('');
  const [pickedUris, setPickedUris] = useState<string[]>([]);

  const residentsQ = useQuery({
    queryKey: ['caregiverResidents'],
    queryFn: async () => (await api.get(CAREGIVER.RESIDENTS)).data,
  });
  const residents = residentsQ.data?.data ?? residentsQ.data ?? [];

  const photosQ = useQuery({
    queryKey: ['residentPhotos', residentId],
    queryFn: async () => (await api.get(CAREGIVER.RESIDENT_PHOTOS(residentId))).data,
    enabled: !!residentId,
  });
  const photos = photosQ.data?.data ?? [];

  const pickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast(t(`${NS}.toastGalleryPermission`), 'warning');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) {
      setPickedUris(result.assets.map(a => a.uri));
    }
  };

  const uploadMut = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      pickedUris.forEach((uri, i) => {
        const filename = uri.split('/').pop() ?? `photo_${i}.jpg`;
        const ext = filename.split('.').pop()?.toLowerCase();
        const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        formData.append('photos', { uri, name: filename, type } as any);
      });
      if (caption.trim()) formData.append('caption', caption.trim());
      const res = await api.post(CAREGIVER.RESIDENT_PHOTOS(residentId), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60_000,
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['residentPhotos', residentId] });
      setPickedUris([]);
      setCaption('');
      toast(t(`${NS}.toastUploaded`), 'success');
    },
    onError: () => toast(t(`${NS}.toastUploadError`), 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: async (photoId: string) => (await api.delete(CAREGIVER.RESIDENT_PHOTO_DELETE(residentId, photoId))).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['residentPhotos', residentId] }); toast(t(`${NS}.toastDeleted`), 'success'); },
    onError: () => toast(t(`${NS}.toastDeleteError`), 'error'),
  });

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.topTitle}>{t(`${NS}.title`)}</Text>
      </View>

      <ScreenLayout loading={residentsQ.isLoading} error={null} onRetry={residentsQ.refetch}>
        <FlatList
          data={photos}
          keyExtractor={(p: any) => p._id}
          numColumns={3}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={photosQ.isFetching} onRefresh={() => photosQ.refetch()} tintColor={COLOR} />}
          ListHeaderComponent={
            <View style={{ marginBottom: 12 }}>
              <SectionHeader title={t(`${NS}.residentLabel`)} roleColor={COLOR} />
              <View style={styles.chipRow}>
                {residents.slice(0, 20).map((r: any) => (
                  <Pressable key={r._id} onPress={() => setResidentId(r._id)}
                    style={[styles.residentChip, residentId === r._id && { backgroundColor: COLOR }]}>
                    <Text style={[styles.residentChipText, residentId === r._id && { color: '#fff' }]}>{r.fullName}</Text>
                  </Pressable>
                ))}
              </View>

              {residentId ? (
                <>
                  {pickedUris.length ? (
                    <View style={styles.previewRow}>
                      {pickedUris.map((uri, i) => (
                        <Image key={i} source={{ uri }} style={styles.previewImage} />
                      ))}
                    </View>
                  ) : null}
                  <Button mode="outlined" icon="image-multiple-outline" textColor={COLOR} style={styles.pickBtn} onPress={pickImages}>
                    {t(`${NS}.pickPhotos`)}
                  </Button>
                  {pickedUris.length ? (
                    <>
                      <TextInput label={t(`${NS}.captionLabel`)} mode="outlined" value={caption} onChangeText={setCaption} dense style={{ marginBottom: 8 }} />
                      <Button mode="contained" buttonColor={COLOR} icon="upload" loading={uploadMut.isPending} onPress={() => uploadMut.mutate()} style={styles.uploadBtn}>
                        {t(`${NS}.upload`)}
                      </Button>
                    </>
                  ) : null}
                  <SectionHeader title={t(`${NS}.uploadedTitle`)} roleColor={COLOR} />
                  {photosQ.isLoading ? <ActivityIndicator color={COLOR} style={{ marginTop: 12 }} /> : null}
                </>
              ) : (
                <Text style={styles.hint}>{t(`${NS}.selectResidentHint`)}</Text>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.photoCell}>
              <Image source={{ uri: item.url }} style={styles.photoImage} />
              <IconButton icon="delete" size={16} iconColor="#fff" style={styles.deleteBtn}
                onPress={() => deleteMut.mutate(item._id)} />
              {item.caption ? <Text style={styles.caption} numberOfLines={1}>{item.caption}</Text> : null}
            </View>
          )}
        />
      </ScreenLayout>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  list: { padding: 16, paddingBottom: 32 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  residentChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FEF3C7' },
  residentChipText: { fontSize: 13, fontWeight: '500', color: COLOR },
  hint: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 24 },
  previewRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  previewImage: { width: 64, height: 64, borderRadius: 8 },
  pickBtn: { borderRadius: 8, borderColor: COLOR, marginBottom: 8 },
  uploadBtn: { borderRadius: 8, marginBottom: 12 },
  photoCell: { width: '33%', padding: 4 },
  photoImage: { width: '100%', aspectRatio: 1, borderRadius: 8, backgroundColor: '#E5E7EB' },
  deleteBtn: { position: 'absolute', top: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', margin: 0 },
  caption: { fontSize: 10, color: '#6B7280', marginTop: 2 },
});
