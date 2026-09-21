import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Image, Pressable, Linking } from 'react-native';
import { Text, IconButton, TextInput, Button, Portal, Modal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import api from '../../api/axiosInstance';
import { CONVERSATIONS } from '../../api/endpoints';
import { useAuth } from '../../auth/useAuth';
import { getRoleColor } from '../../theme/theme';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { BackHeader } from '../../components/layout/BackHeader';
import { useToast } from '../../utils/toast';
import useSocket from '../../hooks/useSocket';

const NS = 'shared.chat';

type PickedFile = { uri: string; name: string; mimeType: string };

export const ChatThreadScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { conversationId, title } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();
  const COLOR = getRoleColor(user?.role);

  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [pickedFiles, setPickedFiles] = useState<PickedFile[]>([]);
  const [attachSheetVisible, setAttachSheetVisible] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const loadMessages = useCallback(async (pageToLoad = 1) => {
    try {
      if (pageToLoad === 1) setLoading(true);
      setError(null);
      const res = await api.get(CONVERSATIONS.MESSAGES(conversationId), { params: { page: pageToLoad, limit: 30 } });
      const body = res.data?.data ?? {};
      const items = body.items ?? [];
      setMessages((prev) => (pageToLoad === 1 ? items : [...prev, ...items]));
      setHasMore(items.length >= 30);
      setPage(pageToLoad);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const markRead = useCallback(() => {
    if (!conversationId) return;
    api.patch(CONVERSATIONS.MARK_READ(conversationId)).catch(() => {});
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial page load on mount/conversation change
    loadMessages(1);
    markRead();
    useSocket.joinRoom(`conversation:${conversationId}`);
    const handler = (payload: any) => {
      if (String(payload.conversationId) === String(conversationId)) {
        setMessages((prev) => [payload.message, ...prev]);
        markRead();
      }
    };
    useSocket.on('message:new', handler);
    return () => {
      useSocket.leaveRoom(`conversation:${conversationId}`);
      useSocket.off('message:new', handler);
    };
  }, [conversationId, loadMessages, markRead]);

  // Library photos are frequently several MB at full camera resolution, which made
  // sending feel very slow over mobile data. Downscaling to a max width before upload
  // (chat bubbles only ever render these at thumbnail size) cuts that down drastically
  // without a visible quality loss.
  const MAX_ATTACHMENT_IMAGE_WIDTH = 1600;

  const resizeForUpload = async (uri: string, width?: number): Promise<string> => {
    if (width && width <= MAX_ATTACHMENT_IMAGE_WIDTH) return uri;
    try {
      /* eslint-disable @typescript-eslint/no-require-imports -- loaded lazily: not supported on web, and not needed unless the user actually attaches an oversized image */
      const { ImageManipulator, SaveFormat } = require('expo-image-manipulator');
      /* eslint-enable @typescript-eslint/no-require-imports */
      const rendered = await ImageManipulator.manipulate(uri).resize({ width: MAX_ATTACHMENT_IMAGE_WIDTH }).renderAsync();
      const saved = await rendered.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
      return saved.uri;
    } catch {
      return uri;
    }
  };

  const pickImages = async () => {
    setAttachSheetVisible(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast(t(`${NS}.toastGalleryPermission`), 'warning');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.8 });
    if (!result.canceled && result.assets?.length) {
      const incoming = await Promise.all(result.assets.map(async (a, i) => {
        const name = a.fileName || a.uri.split('/').pop() || `photo_${Date.now()}_${i}.jpg`;
        const ext = name.split('.').pop()?.toLowerCase();
        const mimeType = a.mimeType || (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');
        const resizedUri = await resizeForUpload(a.uri, a.width);
        const resizedName = resizedUri === a.uri ? name : name.replace(/\.\w+$/, '.jpg');
        const resizedMimeType = resizedUri === a.uri ? mimeType : 'image/jpeg';
        return { uri: resizedUri, name: resizedName, mimeType: resizedMimeType };
      }));
      setPickedFiles((prev) => {
        const combined = [...prev, ...incoming];
        if (combined.length > 6) toast(t(`${NS}.toastTooManyAttachments`), 'warning');
        return combined.slice(0, 6);
      });
    }
  };

  const pickDocument = async () => {
    setAttachSheetVisible(false);
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: true, copyToCacheDirectory: true });
    if (!result.canceled && result.assets?.length) {
      setPickedFiles((prev) => {
        const incoming = result.assets.map((a) => ({ uri: a.uri, name: a.name, mimeType: a.mimeType || 'application/octet-stream' }));
        const combined = [...prev, ...incoming];
        if (combined.length > 6) toast(t(`${NS}.toastTooManyAttachments`), 'warning');
        return combined.slice(0, 6);
      });
    }
  };

  const removePickedFile = (index: number) => setPickedFiles((prev) => prev.filter((_, i) => i !== index));

  const handleSend = async () => {
    if (!text.trim() && pickedFiles.length === 0) return;
    setSending(true);
    try {
      if (pickedFiles.length > 0) {
        const form = new FormData();
        form.append('content', text.trim());
        pickedFiles.forEach((f) => {
          form.append('attachments', { uri: f.uri, name: f.name, type: f.mimeType } as any);
        });
        await api.post(CONVERSATIONS.MESSAGES(conversationId), form, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60_000,
        });
      } else {
        await api.post(CONVERSATIONS.MESSAGES(conversationId), { content: text.trim() });
      }
      // Our own message arrives back through the 'message:new' socket listener
      // (we're a member of the room too) — no local append needed here.
      setText('');
      setPickedFiles([]);
    } catch {
      toast(t(`${NS}.toastSendError`), 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={insets.top}>
      <BackHeader title={title ?? t(`${NS}.title`)} color={COLOR} onBack={() => navigation.goBack()} />

      <ScreenLayout loading={loading} error={error} onRetry={() => loadMessages(1)} isEmpty={messages.length === 0} emptyMessage={t(`${NS}.threadEmpty`)}>
        <FlatList
          data={messages}
          keyExtractor={(m: any, i: number) => m._id ?? String(i)}
          contentContainerStyle={styles.list}
          inverted
          onEndReached={() => { if (hasMore) loadMessages(page + 1); }}
          onEndReachedThreshold={0.3}
          renderItem={({ item, index }) => {
            const isMine = item.senderUserId && String(item.senderUserId._id ?? item.senderUserId) === String(user?._id);
            const senderLabel = item.senderUserId?.fullName ?? item.guestName ?? '';
            return (
              <Animated.View entering={index === 0 ? FadeInUp.duration(280) : FadeIn.duration(1)} style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                <View style={{ maxWidth: '78%' }}>
                  {!isMine && senderLabel ? <Text style={styles.senderLabel}>{senderLabel}</Text> : null}
                  <View style={[styles.bubble, isMine ? { backgroundColor: COLOR } : styles.bubbleTheirs]}>
                    {item.content ? <Text style={[styles.bubbleText, isMine && { color: '#fff' }]}>{item.content}</Text> : null}
                    {item.attachments?.length ? (
                      <View style={{ marginTop: item.content ? 6 : 0, gap: 6 }}>
                        {item.attachments.map((a: any, idx: number) => {
                          const isImage = a.mimeType?.startsWith('image/');
                          if (isImage) {
                            return (
                              <Pressable key={idx} onPress={() => setPreviewUri(a.fileUrl)}>
                                <Image source={{ uri: a.fileUrl }} style={styles.attachmentImage} />
                              </Pressable>
                            );
                          }
                          return (
                            <Pressable key={idx} onPress={() => Linking.openURL(a.fileUrl)} style={styles.fileRow}>
                              <MaterialCommunityIcons name="paperclip" size={13} color={isMine ? '#fff' : COLOR} />
                              <Text numberOfLines={1} style={[styles.fileName, isMine && { color: '#fff' }]}>{a.fileName}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}
                    <Text style={[styles.bubbleTime, isMine && { color: 'rgba(255,255,255,0.7)' }]}>
                      {item.sentAt ? new Date(item.sentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            );
          }}
        />
      </ScreenLayout>

      {pickedFiles.length > 0 && (
        <View style={styles.pickedRow}>
          {pickedFiles.map((f, i) => (
            <View key={i} style={styles.pickedChip}>
              {f.mimeType.startsWith('image/') ? (
                <Image source={{ uri: f.uri }} style={styles.pickedThumb} />
              ) : (
                <MaterialCommunityIcons name="file-outline" size={14} color={COLOR} style={{ marginRight: 4 }} />
              )}
              <Text numberOfLines={1} style={styles.pickedChipText}>{f.name}</Text>
              <IconButton icon="close" size={12} onPress={() => removePickedFile(i)} style={{ margin: 0 }} />
            </View>
          ))}
        </View>
      )}

      <View style={[styles.inputRow, { paddingBottom: insets.bottom + 8 }]}>
        <IconButton icon="paperclip" size={22} iconColor={COLOR} onPress={() => setAttachSheetVisible(true)} />
        <TextInput
          mode="outlined"
          placeholder={t(`${NS}.messagePlaceholder`)}
          value={text}
          onChangeText={(v) => setText(v.slice(0, 5000))}
          dense
          multiline
          maxLength={5000}
          style={styles.input}
        />
        <Button mode="contained" buttonColor={COLOR} onPress={handleSend} loading={sending} disabled={!text.trim() && pickedFiles.length === 0}>
          {t(`${NS}.send`)}
        </Button>
      </View>

      <Portal>
        <Modal visible={attachSheetVisible} onDismiss={() => setAttachSheetVisible(false)} contentContainerStyle={styles.sheet}>
          <Pressable style={styles.sheetOption} onPress={pickImages}>
            <MaterialCommunityIcons name="image-multiple-outline" size={20} color={COLOR} />
            <Text style={styles.sheetOptionText}>{t(`${NS}.attachImage`)}</Text>
          </Pressable>
          <Pressable style={styles.sheetOption} onPress={pickDocument}>
            <MaterialCommunityIcons name="file-document-outline" size={20} color={COLOR} />
            <Text style={styles.sheetOptionText}>{t(`${NS}.attachFile`)}</Text>
          </Pressable>
        </Modal>

        <Modal visible={!!previewUri} onDismiss={() => setPreviewUri(null)} contentContainerStyle={styles.lightbox}>
          <Pressable style={styles.lightboxBackdrop} onPress={() => setPreviewUri(null)}>
            {previewUri ? <Image source={{ uri: previewUri }} style={styles.lightboxImage} resizeMode="contain" /> : null}
          </Pressable>
          <IconButton
            icon="close"
            iconColor="#fff"
            size={26}
            onPress={() => setPreviewUri(null)}
            style={[styles.lightboxClose, { top: insets.top + 8 }]}
          />
        </Modal>
      </Portal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  list: { padding: 16, flexGrow: 1 },
  senderLabel: { fontSize: 11, color: '#6B7280', marginBottom: 2, marginLeft: 2 },
  bubbleRow: { flexDirection: 'row', marginBottom: 8 },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubble: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleTheirs: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  bubbleText: { fontSize: 13, color: '#111827' },
  bubbleTime: { fontSize: 9, color: '#9CA3AF', marginTop: 4, textAlign: 'right' },
  attachmentImage: { width: 180, height: 140, borderRadius: 8, backgroundColor: '#E5E7EB' },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 180 },
  fileName: { fontSize: 12, color: '#111827', textDecorationLine: 'underline', flexShrink: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  input: { flex: 1, backgroundColor: '#fff', maxHeight: 100 },
  pickedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, paddingTop: 8, backgroundColor: '#fff' },
  pickedChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 16, paddingLeft: 6, paddingRight: 2, paddingVertical: 2, maxWidth: 160 },
  pickedThumb: { width: 22, height: 22, borderRadius: 4, marginRight: 4 },
  pickedChipText: { fontSize: 11, color: '#374151', flexShrink: 1 },
  sheet: { backgroundColor: '#fff', margin: 20, padding: 12, borderRadius: 12 },
  sheetOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 8 },
  sheetOptionText: { fontSize: 14, color: '#111827' },
  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', margin: 0 },
  lightboxBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lightboxImage: { width: '100%', height: '100%' },
  lightboxClose: { position: 'absolute', right: 8, backgroundColor: 'rgba(0,0,0,0.4)' },
});
