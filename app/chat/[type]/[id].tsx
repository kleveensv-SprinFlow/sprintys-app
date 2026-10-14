import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform,} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../src/core/theme';
import { glassSurface } from '../../../src/core/glass';
import { useAuthStore } from '../../../src/store/authStore';
import { chatService } from '../../../src/services/chatService';
import { supabase } from '../../../src/services/supabase';
import { PollMessage } from '../../../src/features/chat/PollMessage';
import { useKeyboardOffset } from '../../../src/shared/hooks/useKeyboardOffset';
import { GlowBackground } from '../../../src/shared/components/GlowBackground';
import { PressableScale } from '../../../src/shared/components/PressableScale';
import { formatDayLabel, isSameDay } from '../../../src/shared/utils/chatTime';
import { moderationService, REPORT_REASONS, ReportReason } from '../../../src/services/moderationService';
import { useSprintyStore } from '../../../src/store/sprintyStore';

import { appAlert } from '../../../src/shared/feedback/appAlert';

const BLUE = theme.colors.sprintyBlue;
const BLUE_TINT = 'rgba(0, 105, 232, 0.1)';

type ChatItem = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  type?: 'text' | 'poll';
  metadata?: any;
  /** Local only: shown right away while the insert is in flight. */
  pending?: boolean;
  failed?: boolean;
};

export default function ChatScreen() {
  const { type, id, title } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { bottomOffset } = useKeyboardOffset({ extraMargin: 20 });
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [conversation, setConversation] = useState<any>(null);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const showFeedback = useSprintyStore((s) => s.showFeedback);

  useEffect(() => {
    moderationService.blockedIds().then(setBlocked);
  }, [user?.id]);

  // Messages of blocked people are hidden everywhere
  const visibleMessages = messages.filter((m) => !blocked.has(m.sender_id));
  const profilesRef = useRef(profiles);
  profilesRef.current = profiles;

  // For Poll creation
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  useEffect(() => {
    let cancelled = false;
    if (user && id && type) initChat(() => cancelled);
    return () => {
      cancelled = true;
      // The realtime channel used to leak: unsubscribe when leaving the chat
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, id, type]);

  const loadProfiles = async (ids: string[]) => {
    const missing = ids.filter((pid) => pid && !profilesRef.current[pid]);
    if (!missing.length) return;
    const { data } = await supabase.from('profiles').select('id, first_name, last_name, full_name').in('id', missing);
    if (data) {
      setProfiles((prev) => {
        const next = { ...prev };
        data.forEach((p: any) => (next[p.id] = p));
        return next;
      });
    }
  };

  const initChat = async (isCancelled: () => boolean) => {
    if (!user) return;
    const convo =
      type === 'team'
        ? await chatService.getOrCreateTeamConversation(id as string)
        : await chatService.getOrCreateDirectConversation(user.id, id as string);
    if (!convo || isCancelled()) return;

    setConversation(convo);
    await chatService.ensureParticipant(convo.id, user.id);
    fetchMessages(convo.id);

    channelRef.current = supabase
      .channel(`chat_${convo.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convo.id}` },
        (payload: any) => {
          const incoming = payload.new as ChatItem;
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            // Our own optimistic copy: swap it for the stored message
            const tmp = prev.findIndex((m) => m.pending && m.sender_id === incoming.sender_id && m.content === incoming.content);
            if (tmp !== -1) {
              const next = [...prev];
              next[tmp] = incoming;
              return next;
            }
            return [incoming, ...prev];
          });
          if (incoming.sender_id !== user.id) {
            chatService.markAsRead(convo.id, user.id, incoming.id);
            loadProfiles([incoming.sender_id]);
          }
        }
      )
      .subscribe();
  };

  const fetchMessages = async (convoId: string) => {
    const msgs = (await chatService.getMessages(convoId)) as ChatItem[];
    setMessages(msgs);
    if (msgs.length > 0 && user?.id) {
      chatService.markAsRead(convoId, user.id, msgs[0].id);
    }
    loadProfiles([...new Set(msgs.map((m) => m.sender_id).filter(Boolean))]);
  };

  const deliver = async (tempId: string, text: string) => {
    if (!conversation || !user) return;
    try {
      const saved = (await chatService.sendMessage(conversation.id, user.id, text)) as ChatItem;
      setMessages((prev) => {
        // Realtime may already have delivered it
        if (prev.some((m) => m.id === saved.id)) return prev.filter((m) => m.id !== tempId);
        return prev.map((m) => (m.id === tempId ? saved : m));
      });
    } catch (err) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)));
    }
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || !conversation || !user) return;
    setInputText('');
    const tempId = `tmp-${Date.now()}`;
    setMessages((prev) => [
      { id: tempId, sender_id: user.id, content: text, created_at: new Date().toISOString(), pending: true },
      ...prev,
    ]);
    deliver(tempId, text);
  };

  const retry = (item: ChatItem) => {
    setMessages((prev) => prev.map((m) => (m.id === item.id ? { ...m, pending: true, failed: false } : m)));
    deliver(item.id, item.content);
  };

  const handleSendPoll = async () => {
    if (!pollQuestion.trim() || !conversation || !user) return;
    const validOptions = pollOptions.filter((o) => o.trim() !== '').map((text, i) => ({ id: `opt_${i}`, text }));
    if (validOptions.length < 2) return;

    await chatService.sendMessage(conversation.id, user.id, 'Sondage', 'poll', {
      question: pollQuestion,
      options: validOptions,
      multipleChoice: false,
    });
    setIsCreatingPoll(false);
    setPollQuestion('');
    setPollOptions(['', '']);
  };

  const chooseReason = (onPick: (reason: ReportReason) => void) =>
    appAlert('Signaler', 'Pourquoi signales-tu ce contenu ?', [
      ...REPORT_REASONS.map((r) => ({ text: r, onPress: () => onPick(r) })),
      { text: 'Annuler', style: 'cancel' as const },
    ]);

  const sendReport = async (params: { reportedUserId?: string; messageId?: string; excerpt?: string }, reason: ReportReason) => {
    const ok = await moderationService.report({ conversationId: conversation?.id, reason, ...params });
    showFeedback(ok ? 'success' : 'error', ok ? 'Signalement envoyé, merci. Nous allons l’examiner.' : 'Impossible d’envoyer le signalement.');
  };

  const blockUser = (userId: string, name: string) =>
    appAlert(`Bloquer ${name} ?`, 'Tu ne verras plus ses messages. Tu pourras le débloquer depuis cette conversation.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Bloquer',
        style: 'destructive',
        onPress: async () => {
          if (await moderationService.block(userId)) {
            setBlocked((prev) => new Set(prev).add(userId));
            showFeedback('success', `${name} est bloqué.`);
          } else {
            showFeedback('error', 'Impossible de bloquer pour le moment.');
          }
        },
      },
    ]);

  const unblockUser = async (userId: string, name: string) => {
    if (await moderationService.unblock(userId)) {
      setBlocked((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      showFeedback('success', `${name} est débloqué.`);
    }
  };

  /** Long press on someone else's message. */
  const messageActions = (item: ChatItem) => {
    const name = nameOf(item.sender_id);
    appAlert(name, undefined, [
      {
        text: 'Signaler le message',
        onPress: () => chooseReason((r) => sendReport({ reportedUserId: item.sender_id, messageId: item.id, excerpt: item.content }, r)),
      },
      { text: `Bloquer ${name}`, style: 'destructive', onPress: () => blockUser(item.sender_id, name) },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  /** Header menu: report the conversation; in a direct chat, block / unblock the other person. */
  const report = () => {
    const otherId = type === 'direct' ? (id as string) : null;
    const otherName = (title as string) || 'cette personne';
    appAlert('Options', undefined, [
      { text: 'Signaler la conversation', onPress: () => chooseReason((r) => sendReport({ reportedUserId: otherId ?? undefined }, r)) },
      ...(otherId
        ? blocked.has(otherId)
          ? [{ text: `Débloquer ${otherName}`, onPress: () => unblockUser(otherId, otherName) }]
          : [{ text: `Bloquer ${otherName}`, style: 'destructive' as const, onPress: () => blockUser(otherId, otherName) }]
        : []),
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const nameOf = (senderId: string) => {
    const p = profiles[senderId];
    return p?.full_name || [p?.first_name, p?.last_name].filter(Boolean).join(' ') || '…';
  };

  const renderMessage = ({ item, index }: { item: ChatItem; index: number }) => {
    const isMe = item.sender_id === user?.id;
    // The list is inverted: the older neighbour is the next item
    const older = visibleMessages[index + 1];
    const newDay = !older || !isSameDay(older.created_at, item.created_at);
    const firstOfGroup = newDay || older.sender_id !== item.sender_id;
    const senderName = nameOf(item.sender_id);
    const time = new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    return (
      <View>
        {newDay && (
          <View style={styles.daySeparator}>
            <Text style={styles.daySeparatorText}>{formatDayLabel(item.created_at)}</Text>
          </View>
        )}
        <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther, firstOfGroup && styles.groupStart]}>
          {!isMe && type === 'team' && (
            <View style={[styles.avatar, !firstOfGroup && { opacity: 0 }]}>
              <Text style={styles.avatarText}>{senderName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.bubbleColumn}>
            {!isMe && type === 'team' && firstOfGroup && <Text style={styles.senderName}>{senderName}</Text>}

            <TouchableOpacity
              activeOpacity={item.failed ? 0.6 : 0.85}
              disabled={!item.failed && isMe}
              onPress={() => item.failed && retry(item)}
              onLongPress={() => !isMe && !item.pending && messageActions(item)}
              delayLongPress={300}
              style={[
                styles.messageBubble,
                isMe ? styles.messageBubbleMe : styles.messageBubbleOther,
                item.pending && { opacity: 0.6 },
                item.failed && styles.messageBubbleFailed,
              ]}
            >
              {item.type === 'poll' ? (
                <PollMessage
                  messageId={item.id}
                  question={item.metadata.question}
                  options={item.metadata.options}
                  multipleChoice={item.metadata.multipleChoice}
                  currentUserId={user?.id || ''}
                  isCoach={user?.role === 'coach'}
                />
              ) : (
                <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>{item.content}</Text>
              )}
            </TouchableOpacity>
            <Text style={[styles.meta, isMe && { textAlign: 'right' }, item.failed && { color: theme.colors.error }]}>
              {item.failed ? 'Non envoyé · toucher pour réessayer' : item.pending ? 'Envoi…' : time}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const headerTitle = title ? (title as string) : type === 'team' ? "Chat d'équipe" : 'Message privé';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <GlowBackground />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <PressableScale onPress={() => router.back()} haptic="selection" style={[styles.headerBtn, glassSurface]}>
            <Feather name="chevron-left" size={22} color={theme.colors.text} />
          </PressableScale>
          <View style={[styles.headerAvatar, { backgroundColor: type === 'team' ? theme.colors.glassFill : BLUE_TINT }]}>
            {type === 'team' ? (
              <Feather name="users" size={16} color={theme.colors.text} />
            ) : (
              <Text style={styles.headerAvatarText}>{headerTitle.replace(/^Coach\s+/i, '').charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {headerTitle}
            </Text>
            <Text style={styles.headerSubtitle}>{type === 'team' ? 'Discussion de groupe' : 'Message direct'}</Text>
          </View>
          <PressableScale onPress={report} haptic="selection" style={[styles.headerBtn, glassSurface]}>
            <Feather name="more-horizontal" size={20} color={theme.colors.text} />
          </PressableScale>
        </View>

        {/* Messages or Empty State */}
        {visibleMessages.length === 0 ? (
          <View style={styles.emptyChatContainer}>
            <View style={styles.emptyIconCircle}>
              <Feather name={type === 'team' ? 'users' : 'message-circle'} size={30} color={BLUE} />
            </View>
            <Text style={styles.emptyChatTitle}>{type === 'team' ? "Salon d'équipe" : 'Discussion directe'}</Text>
            <Text style={styles.emptyChatSubtitle}>
              {type === 'team'
                ? user?.role === 'coach'
                  ? 'Échange avec tous tes athlètes, partage les annonces de séances et organise des sondages d’équipe.'
                  : 'Échange avec ton coach et les autres athlètes du groupe.'
                : 'Envoie un premier message.'}
            </Text>
            {user?.role === 'coach' && type === 'team' && (
              <PressableScale style={styles.emptyQuickActionBtn} onPress={() => setIsCreatingPoll(true)} haptic="medium">
                <Feather name="bar-chart-2" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyQuickActionText}>Lancer un sondage d'équipe</Text>
              </PressableScale>
            )}
          </View>
        ) : (
          <FlatList
            data={visibleMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            inverted
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
          />
        )}

        {/* Input Bar or Poll Sheet */}
        {isCreatingPoll ? (
          <View style={[styles.pollContainer, { paddingBottom: bottomOffset }]}>
            <View style={styles.pollHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.pollIconWrap}>
                  <Feather name="bar-chart-2" size={18} color={BLUE} />
                </View>
                <Text style={styles.pollTitle}>Nouveau sondage d'équipe</Text>
              </View>
              <TouchableOpacity onPress={() => setIsCreatingPoll(false)} style={styles.pollCloseBtn}>
                <Feather name="x" size={18} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.pollInput}
              placeholder="Poser une question à l'équipe…"
              placeholderTextColor={theme.colors.textMuted}
              value={pollQuestion}
              onChangeText={setPollQuestion}
            />
            {pollOptions.map((opt, idx) => (
              <TextInput
                key={idx}
                style={styles.pollInput}
                placeholder={`Option ${idx + 1}`}
                placeholderTextColor={theme.colors.textMuted}
                value={opt}
                onChangeText={(val) => {
                  const newOpts = [...pollOptions];
                  newOpts[idx] = val;
                  if (idx === pollOptions.length - 1 && val.trim() !== '') {
                    newOpts.push(''); // add another slot
                  }
                  setPollOptions(newOpts);
                }}
              />
            ))}
            <PressableScale style={styles.sendPollBtn} onPress={handleSendPoll} haptic="medium">
              <Text style={styles.sendPollBtnText}>Envoyer le sondage</Text>
            </PressableScale>
          </View>
        ) : (
          <View style={[styles.inputContainer, { paddingBottom: bottomOffset }]}>
            {user?.role === 'coach' && (
              <TouchableOpacity style={styles.attachBtn} onPress={() => setIsCreatingPoll(true)} activeOpacity={0.7}>
                <Feather name="bar-chart-2" size={19} color={BLUE} />
              </TouchableOpacity>
            )}
            <View style={[styles.inputCapsule, glassSurface]}>
              <TextInput
                style={styles.input}
                placeholder="Message"
                placeholderTextColor={theme.colors.textMuted}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={2000}
              />
              <PressableScale
                style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!inputText.trim()}
                haptic="light"
              >
                <Feather name="arrow-up" size={18} color="#FFFFFF" />
              </PressableScale>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
  },
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: theme.colors.glassBar,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: BLUE,
  },
  headerTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: theme.colors.text,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  daySeparator: {
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.glassFill,
    marginTop: 14,
    marginBottom: 6,
  },
  daySeparatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 2,
  },
  groupStart: {
    marginTop: 10,
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  bubbleColumn: {
    flexShrink: 1,
    maxWidth: '80%',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.glassFill,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 18,
  },
  avatarText: {
    fontWeight: '700',
    color: theme.colors.text,
    fontSize: 12,
  },
  senderName: {
    fontWeight: '600',
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 3,
    marginLeft: 4,
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderCurve: 'continuous',
  },
  messageBubbleMe: {
    backgroundColor: BLUE,
    borderBottomRightRadius: 6,
  },
  messageBubbleOther: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 6,
  },
  messageBubbleFailed: {
    backgroundColor: theme.colors.error,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextMe: {
    color: '#FFFFFF',
  },
  messageTextOther: {
    color: theme.colors.text,
  },
  meta: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 3,
    marginHorizontal: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  inputCapsule: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 22,
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
    paddingTop: 8,
    paddingBottom: 8,
    maxHeight: 110,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  sendBtnDisabled: {
    backgroundColor: theme.colors.textMuted,
    opacity: 0.5,
  },

  // Empty State Chat
  emptyChatContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: BLUE_TINT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyChatTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptyChatSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyQuickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BLUE,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderCurve: 'continuous',
  },
  emptyQuickActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // Poll sheet (solid, like every sheet)
  pollContainer: {
    padding: 18,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.hairline,
  },
  pollHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  pollIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BLUE_TINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pollTitle: {
    fontWeight: '800',
    fontSize: 16,
    color: theme.colors.text,
    letterSpacing: -0.2,
  },
  pollCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.glassFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pollInput: {
    backgroundColor: theme.colors.glassFill,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.text,
    fontWeight: '500',
    fontSize: 14,
    marginBottom: 8,
  },
  sendPollBtn: {
    backgroundColor: BLUE,
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  sendPollBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
