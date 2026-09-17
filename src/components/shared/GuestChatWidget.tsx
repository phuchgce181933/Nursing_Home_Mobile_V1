import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Text, FAB, Portal, Modal, TextInput, Button, IconButton, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useCreateGuestConversation, useGuestMessages, useSendGuestMessage } from '../../hooks/useGuestChat';

const COLOR = '#000666';
// Matches the web guest-chat widget's bot-avatar/bubble colors exactly
// (--color-sage-healing / --color-surface-container-low in Nursing_Home_Fe_V1/src/styles.css)
// so bot messages read the same way on both platforms.
const BOT_ACCENT = '#4F7942';
const BOT_ACCENT_SOFT = 'rgba(79, 121, 66, 0.15)';
const SURFACE_LOW = '#EFF4FF';
const NS = 'guestChat';
const STORAGE_KEY = 'guestChatConversation';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

type Suggestion = { label: string; screen: string; reply: string };

const SUGGESTIONS: Suggestion[] = [
  { label: 'Dịch vụ chăm sóc', screen: 'Services', reply: 'Bạn có thể xem chi tiết các gói dịch vụ chăm sóc tại mục "Dịch vụ".' },
  { label: 'Bảng giá dịch vụ', screen: 'Pricing', reply: 'Bảng giá chi tiết các gói dịch vụ đang có tại mục "Bảng giá".' },
  { label: 'Đặt lịch tham quan cơ sở', screen: 'Contact', reply: 'Bạn có thể để lại thông tin ở mục "Liên hệ", đội ngũ tư vấn sẽ sắp xếp lịch tham quan cho bạn.' },
  { label: 'Thủ tục nhập viện', screen: 'GuestAdmissionRequest', reply: 'Bạn có thể gửi yêu cầu nhập viện ngay trong mục "Đăng ký nhập viện".' },
  { label: 'Không gian sống & cơ sở vật chất', screen: 'Living', reply: 'Xem chi tiết không gian sống tại mục "Không gian sống".' },
];

type BotMsg = { _id: string; isBot: true; content: string; screen?: string; sentAt: string };

export const GuestChatWidget: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [contact, setContact] = useState({ name: '', email: '', phone: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState('');
  const [botMsgs, setBotMsgs] = useState<BotMsg[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const listRef = useRef<FlatList>(null);
  const emailRef = useRef<any>(null);
  const phoneRef = useRef<any>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw);
        if (saved?.conversationId) {
          setConversationId(saved.conversationId);
          setContact({ name: saved.name || '', email: saved.email || '', phone: saved.phone || '' });
          setShowSuggestions(true);
        }
      } catch {}
    });
  }, []);

  const createMut = useCreateGuestConversation();
  const messagesQ = useGuestMessages(conversationId ?? undefined);
  const sendMut = useSendGuestMessage(conversationId ?? undefined);

  // Backend wraps paginated responses as { success, data: { items, ... } } — reading
  // `messagesQ.data?.items` directly always missed the nested `.data`, so real guest
  // and staff messages silently never rendered (only client-only bot replies did).
  const items = messagesQ.data?.data?.items ?? messagesQ.data?.items ?? [];
  const merged = [...items, ...botMsgs].sort((a: any, b: any) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());

  const validateContact = () => {
    const next: Record<string, string> = {};
    if (!contact.name.trim()) next.name = t(`${NS}.errNameRequired`);
    if (!contact.email.trim() && !contact.phone.trim()) {
      next.email = t(`${NS}.errContactRequired`);
      next.phone = t(`${NS}.errContactRequired`);
    }
    if (contact.email && !EMAIL_REGEX.test(contact.email.trim())) next.email = t(`${NS}.errEmailInvalid`);
    if (contact.phone && !PHONE_REGEX.test(contact.phone.trim())) next.phone = t(`${NS}.errPhoneInvalid`);
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleStart = () => {
    if (!validateContact()) return;
    createMut.mutate(
      { guestName: contact.name, guestEmail: contact.email || undefined, guestPhone: contact.phone || undefined },
      {
        onSuccess: (data) => {
          const id = data?.data?.conversation?._id;
          if (!id) return;
          setConversationId(id);
          setShowSuggestions(true);
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ conversationId: id, ...contact }));
        },
      }
    );
  };

  const handleSend = () => {
    if (!draft.trim() || !conversationId) return;
    // Guest typed their own message instead of picking a suggestion — dismiss the
    // canned prompt instead of leaving it stuck on screen (matches web).
    setShowSuggestions(false);
    sendMut.mutate({ content: draft.trim(), guestName: contact.name, guestEmail: contact.email || undefined, guestPhone: contact.phone || undefined });
    setDraft('');
  };

  const handleSuggestion = (s: Suggestion) => {
    if (!conversationId) return;
    // Matches web: picking a suggestion sends it as a real message and dismisses the
    // suggestion list (it stayed stuck on screen after every tap otherwise).
    setShowSuggestions(false);
    sendMut.mutate({ content: s.label, guestName: contact.name, guestEmail: contact.email || undefined, guestPhone: contact.phone || undefined });
    setTimeout(() => {
      setBotMsgs((prev) => [...prev, { _id: `bot-${Date.now()}`, isBot: true, content: s.reply, screen: s.screen, sentAt: new Date().toISOString() }]);
    }, 700);
  };

  return (
    <>
      <FAB icon="message-text-outline" style={[styles.fab, { bottom: 24 + insets.bottom }]} color="#fff" customSize={56} onPress={() => setVisible(true)} />
      <Portal>
        <Modal visible={visible} onDismiss={() => setVisible(false)} dismissable={false} dismissableBackButton contentContainerStyle={styles.modal}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{t(`${NS}.title`)}</Text>
              <IconButton icon="close" iconColor="#fff" size={20} onPress={() => setVisible(false)} />
            </View>

            {!conversationId ? (
              <View style={styles.formBody}>
                <Text style={styles.formIntro}>{t(`${NS}.formIntro`)}</Text>
                <TextInput
                  label={t(`${NS}.nameLabel`)} mode="outlined" value={contact.name}
                  onChangeText={v => setContact(c => ({ ...c, name: v }))} dense style={styles.input} error={!!errors.name}
                  returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => emailRef.current?.focus()}
                />
                {errors.name ? <Text style={styles.errText}>{errors.name}</Text> : null}
                <TextInput
                  ref={emailRef}
                  label={t(`${NS}.emailLabel`)} mode="outlined" value={contact.email}
                  onChangeText={v => setContact(c => ({ ...c, email: v }))} dense keyboardType="email-address" autoCapitalize="none" style={styles.input} error={!!errors.email}
                  returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => phoneRef.current?.focus()}
                />
                {errors.email ? <Text style={styles.errText}>{errors.email}</Text> : null}
                <TextInput
                  ref={phoneRef}
                  label={t(`${NS}.phoneLabel`)} mode="outlined" value={contact.phone}
                  onChangeText={v => setContact(c => ({ ...c, phone: v }))} dense keyboardType="phone-pad" style={styles.input} error={!!errors.phone}
                  returnKeyType="done" submitBehavior="blurAndSubmit" onSubmitEditing={handleStart}
                />
                {errors.phone ? <Text style={styles.errText}>{errors.phone}</Text> : null}
                <Button mode="contained" buttonColor={BOT_ACCENT} loading={createMut.isPending} onPress={handleStart} contentStyle={{ height: 46 }} style={{ borderRadius: 8, marginTop: 4 }}>
                  {t(`${NS}.startChat`)}
                </Button>
              </View>
            ) : (
              <>
                {messagesQ.isLoading ? (
                  <ActivityIndicator style={{ marginTop: 24 }} />
                ) : (
                  <FlatList
                    ref={listRef}
                    data={merged}
                    keyExtractor={(m: any) => m._id}
                    contentContainerStyle={styles.msgList}
                    renderItem={({ item }: any) => {
                      // Bot and staff replies are always "them" (left, light bubble); only
                      // the guest's own typed messages are "mine" (right, navy bubble) —
                      // matches the web widget's isGuestMessage/isBot split exactly.
                      if (item.isBot) {
                        return (
                          <View style={styles.botRow}>
                            <View style={styles.botAvatar}>
                              <MaterialCommunityIcons name="robot-happy-outline" size={15} color={BOT_ACCENT} />
                            </View>
                            <View style={styles.bubbleThem}>
                              <Text style={styles.bubbleTextThem}>{item.content}</Text>
                              {item.screen ? (
                                <Pressable onPress={() => { setVisible(false); navigation?.navigate(item.screen); }}>
                                  <Text style={styles.botLink}>{t(`${NS}.viewMore`)}</Text>
                                </Pressable>
                              ) : null}
                            </View>
                          </View>
                        );
                      }
                      const isMine = !item.senderUserId;
                      const senderLabel = isMine ? t(`${NS}.you`) : (item.senderUserId?.fullName ?? t(`${NS}.staffLabel`));
                      return (
                        <View style={[styles.bubbleCol, isMine ? styles.bubbleColRight : styles.bubbleColLeft]}>
                          <Text style={styles.senderLabel}>{senderLabel}</Text>
                          <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleThem]}>
                            <Text style={isMine ? styles.bubbleTextMine : styles.bubbleTextThem}>{item.content}</Text>
                          </View>
                        </View>
                      );
                    }}
                  />
                )}

                {showSuggestions ? (
                  <View style={styles.suggestWrap}>
                    <View style={styles.botRow}>
                      <View style={styles.botAvatar}>
                        <MaterialCommunityIcons name="robot-happy-outline" size={15} color={BOT_ACCENT} />
                      </View>
                      <View style={styles.bubbleThem}>
                        <Text style={styles.bubbleTextThem}>{t(`${NS}.suggestTitle`)}</Text>
                      </View>
                    </View>
                    <View style={styles.suggestListIndent}>
                      {SUGGESTIONS.map((s) => (
                        <Pressable key={s.label} style={({ pressed }) => [styles.suggestRow, pressed && styles.suggestRowPressed]} onPress={() => handleSuggestion(s)}>
                          <Text style={styles.suggestRowText}>{s.label}</Text>
                          <MaterialCommunityIcons name="chevron-right" size={16} color="#9CA3AF" />
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}

                <View style={styles.inputRow}>
                  <TextInput
                    mode="outlined"
                    value={draft}
                    onChangeText={setDraft}
                    placeholder={t(`${NS}.messagePlaceholder`)}
                    dense
                    style={styles.msgInput}
                    onSubmitEditing={handleSend}
                  />
                  <IconButton icon="send" iconColor={COLOR} disabled={!draft.trim()} onPress={handleSend} />
                </View>
              </>
            )}
          </KeyboardAvoidingView>
        </Modal>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  fab: { position: 'absolute', right: 16, bottom: 24, backgroundColor: COLOR },
  // `height` (not just maxHeight) is required here: the KeyboardAvoidingView inside uses
  // flex:1 to size the message list, and on native (unlike web) a flex:1 child inside a
  // container with no resolved height collapses to zero — which made the whole panel
  // render invisible even though `visible` was correctly true.
  modal: { backgroundColor: '#fff', margin: 16, borderRadius: 16, height: '80%', maxHeight: 560, overflow: 'hidden' },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLOR, paddingLeft: 16 },
  headerTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  formBody: { padding: 16 },
  formIntro: { fontSize: 12, color: '#6B7280', marginBottom: 12, lineHeight: 17 },
  input: { marginBottom: 8 },
  errText: { color: '#DC2626', fontSize: 11, marginTop: -4, marginBottom: 8 },
  msgList: { padding: 12, gap: 8 },

  // Bot messages: always left-aligned, with a small round avatar — matches the web
  // widget's Bot-icon-in-a-soft-green-circle treatment exactly.
  botRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  botAvatar: {
    width: 28, height: 28, borderRadius: 14, flexShrink: 0,
    backgroundColor: BOT_ACCENT_SOFT, alignItems: 'center', justifyContent: 'center',
  },
  botLink: { color: COLOR, fontWeight: '700', fontSize: 12.5, marginTop: 6, textDecorationLine: 'underline' },

  // Guest / staff messages: right-aligned (navy, "mine") vs left-aligned (light, "them"),
  // each with a small sender-name label above the bubble.
  bubbleCol: { marginBottom: 6, maxWidth: '85%' },
  bubbleColRight: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubbleColLeft: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  senderLabel: { fontSize: 11, fontWeight: '500', color: '#9CA3AF', marginBottom: 2, paddingHorizontal: 2 },

  bubble: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { backgroundColor: COLOR, borderTopRightRadius: 4 },
  bubbleThem: { backgroundColor: SURFACE_LOW, borderRadius: 14, borderTopLeftRadius: 4, paddingHorizontal: 12, paddingVertical: 8, maxWidth: '82%' },
  bubbleTextMine: { fontSize: 13, color: '#FFFFFF' },
  bubbleTextThem: { fontSize: 13, color: '#334155' },

  suggestWrap: { paddingHorizontal: 12, paddingBottom: 8 },
  suggestListIndent: { marginLeft: 36, gap: 6 },
  suggestRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  suggestRowPressed: { backgroundColor: '#F9FAFB' },
  suggestRowText: { fontSize: 12.5, fontWeight: '600', color: COLOR, flex: 1, marginRight: 6 },

  inputRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingHorizontal: 8, paddingVertical: 4 },
  msgInput: { flex: 1, backgroundColor: '#fff' },
});
