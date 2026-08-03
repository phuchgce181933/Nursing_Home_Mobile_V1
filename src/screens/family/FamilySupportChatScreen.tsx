import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { CONVERSATIONS } from '../../api/endpoints';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { ChatThreadScreen } from '../shared/ChatThreadScreen';

// Family only ever has one conversation, with admin — no target picker, no list.
// Resolves (or creates) that single thread, then renders it directly with ChatThreadScreen.
export const FamilySupportChatScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const listRes = await api.get(CONVERSATIONS.LIST);
        const existing = (listRes.data?.data ?? [])[0];
        if (existing?._id) {
          setConversationId(existing._id);
        } else {
          const createRes = await api.post(CONVERSATIONS.CREATE, {});
          setConversationId(createRes.data?.data?._id ?? null);
        }
      } catch (err: any) {
        setError(err?.message ?? String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || error || !conversationId) {
    return (
      <ScreenLayout loading={loading} error={error} onRetry={() => { setLoading(true); setError(null); }}>
        {null}
      </ScreenLayout>
    );
  }

  return (
    <ChatThreadScreen
      navigation={navigation}
      route={{ params: { conversationId, title: t('shared.chat.adminConversation') } }}
    />
  );
};
