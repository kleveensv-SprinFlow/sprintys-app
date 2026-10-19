import { goBack } from '../../../src/core/navigation';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { TouchableOpacity } from '../../../src/shared/components/Tappable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { theme } from '../../../src/core/theme';
import { glassSurface } from '../../../src/core/glass';
import { useAuthStore } from '../../../src/store/authStore';
import { chatService, MESSAGES_PAGE } from '../../../src/services/chatService';
import { supabase } from '../../../src/services/supabase';
import { PollMessage } from '../../../src/features/chat/PollMessage';
import { useKeyboardOffset } from '../../../src/shared/hooks/useKeyboardOffset';
import { GlowBackground } from '../../../src/shared/components/GlowBackground';
import { PressableScale } from '../../../src/shared/components/PressableScale';
import { formatDayLabel, isSameDay } from '../../../src/shared/utils/chatTime';
import { moderationService, REPORT_REASONS, ReportReason } from '../../../src/services/moderationService';
import { useSprintyStore } from '../../../src/store/sprintyStore';
import { BottomSheet } from '../../../src/shared/components/BottomSheet';

import { appAlert, toast } from '../../../src/shared/feedback/appAlert';

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
  const [muted, setMuted] = useState(false);
  const showFeedback = useSprintyStore((s) => s.showFeedback);

  // Réactions, citations et annonce épinglée (Tâche T3)
  const [reactions, setReactions] = useState<Record<string, { reaction: string; count: number; userReacted: boolean }[]>>({});
  const [pinnedMessage, setPinnedMessage] = useState<ChatItem | null>(null);
  const [pinnedExpanded, setPinnedExpanded] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; sender_name: string; content: string } | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ChatItem | null>(null);
  const [showExtraEmojis, setShowExtraEmojis] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    moderationService.blockedIds().then(setBlocked);
  }, [user?.id]);

  // Messages of blocked people are hidden everywhere
  const visibleMessages = messages.filter((m) => !blocked.has(m.sender_id));
  const profilesRef = useRef(profiles);
  profilesRef.current = profiles;

  // For Poll creation
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sendingPoll, setSendingPoll] = useState(false);
  const [pollMultiple, setPollMultiple] = useState(false);
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
    const { data } = await supabase.from('profiles').select('id, first_name, last_name, full_name, avatar_url').in('id', missing);
    if (data) {
      setProfiles((prev) => {
        const next = { ...prev };
        data.forEach((p: any) => (next[p.id] = p));
        return next;
      });
    }
  };

  const loadReactions = async (msgIds: string[]) => {
    const valid = msgIds.filter((mid) => mid && !mid.startsWith('tmp-'));
    if (!valid.length) return;
    const res = await chatService.getMessageReactions(valid, user?.id);
    setReactions((prev) => ({ ...prev, ...res }));
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!user || messageId.startsWith('tmp-')) return;

    // Mise à jour optimiste immédiate
    setReactions((prev) => {
      const list = prev[messageId] ? [...prev[messageId]] : [];
      const existingIndex = list.findIndex((r) => r.reaction === emoji);
      const hadReaction = existingIndex !== -1 && list[existingIndex].userReacted;

      // Un seul vote à la fois : on retire un autre vote précédent éventuel
      const otherIndex = list.findIndex((r) => r.userReacted && r.reaction !== emoji);
      if (otherIndex !== -1) {
        const other = { ...list[otherIndex] };
        other.count = Math.max(0, other.count - 1);
        other.userReacted = false;
        if (other.count === 0) {
          list.splice(otherIndex, 1);
        } else {
          list[otherIndex] = other;
        }
      }

      if (hadReaction) {
        const item = { ...list[existingIndex] };
        item.count = Math.max(0, item.count - 1);
        item.userReacted = false;
        if (item.count === 0) {
          list.splice(existingIndex, 1);
        } else {
          list[existingIndex] = item;
        }
      } else {
        if (existingIndex !== -1) {
          list[existingIndex] = { ...list[existingIndex], count: list[existingIndex].count + 1, userReacted: true };
        } else {
          list.push({ reaction: emoji, count: 1, userReacted: true });
        }
      }
      return { ...prev, [messageId]: list };
    });

    try {
      await chatService.toggleReaction(messageId, user.id, emoji);
    } catch (err) {
      console.error('Erreur toggle reaction:', err);
      loadReactions([messageId]);
    }
  };

  const handlePin = async (messageId: string | null) => {
    if (!conversation) return;
    try {
      await chatService.pinMessage(conversation.id, messageId);
      if (!messageId) {
        setPinnedMessage(null);
        toast('info', 'Annonce retirée.');
      } else {
        const found = messages.find((m) => m.id === messageId);
        if (found) setPinnedMessage(found);
        toast('success', 'Message épinglé comme annonce.');
      }
    } catch {
      toast('error', 'Impossible de modifier l’annonce épinglée.');
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
    chatService.getMuted(convo.id, user.id).then((m) => { if (!isCancelled()) setMuted(m); }).catch(() => {});
    fetchMessages(convo.id);
    if (type !== 'team') loadProfiles([id as string]); // photo de l'interlocuteur dans l'en-tête

    // Récupérer l'annonce épinglée au démarrage
    chatService.getPinnedMessage(convo.id).then((pinData) => {
      if (!isCancelled() && pinData?.message) {
        setPinnedMessage(pinData.message as ChatItem);
        if (pinData.message.sender_id) loadProfiles([pinData.message.sender_id]);
      }
    });

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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_likes' },
        () => {
          setMessages((currentMsgs) => {
            loadReactions(currentMsgs.map((m) => m.id));
            return currentMsgs;
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `id=eq.${convo.id}` },
        async (payload: any) => {
          const pinId = payload.new?.pinned_message_id;
          if (!pinId) {
            setPinnedMessage(null);
          } else {
            const pinData = await chatService.getPinnedMessage(convo.id);
            if (pinData?.message) {
              setPinnedMessage(pinData.message as ChatItem);
              if (pinData.message.sender_id) loadProfiles([pinData.message.sender_id]);
            }
          }
        }
      )
      .subscribe();
  };

  const fetchMessages = async (convoId: string) => {
    const msgs = (await chatService.getMessages(convoId)) as ChatItem[];
    setMessages(msgs);
    setHasMore(msgs.length >= MESSAGES_PAGE);
    if (msgs.length > 0 && user?.id) {
      chatService.markAsRead(convoId, user.id, msgs[0].id);
    }
    loadProfiles([...new Set(msgs.map((m) => m.sender_id).filter(Boolean))]);
    loadReactions(msgs.map((m) => m.id));
  };

  /** Remonte dans l'historique : la page de messages plus anciens. */
  const loadOlder = async () => {
    if (!hasMore || loadingOlder || !conversation) return;
    const oldest = [...messages].reverse().find((m) => !m.pending && !m.failed);
    if (!oldest) return;
    setLoadingOlder(true);
    try {
      const older = (await chatService.getMessages(conversation.id, { before: oldest.created_at })) as ChatItem[];
      setMessages((prev) => [...prev, ...older.filter((o) => !prev.some((m) => m.id === o.id))]);
      setHasMore(older.length >= MESSAGES_PAGE);
      loadProfiles([...new Set(older.map((m) => m.sender_id).filter(Boolean))]);
      loadReactions(older.map((m) => m.id));
    } finally {
      setLoadingOlder(false);
    }
  };

  const deliver = async (tempId: string, text: string, meta: any = null) => {
    if (!conversation || !user) return;
    try {
      const saved = (await chatService.sendMessage(conversation.id, user.id, text, 'text', meta)) as ChatItem;
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
    const meta = replyingTo ? { reply_to: replyingTo } : null;
    setInputText('');
    setReplyingTo(null);
    const tempId = `tmp-${Date.now()}`;
    setMessages((prev) => [
      { id: tempId, sender_id: user.id, content: text, created_at: new Date().toISOString(), pending: true, metadata: meta },
      ...prev,
    ]);
    deliver(tempId, text, meta);
  };

  const retry = (item: ChatItem) => {
    setMessages((prev) => prev.map((m) => (m.id === item.id ? { ...m, pending: true, failed: false } : m)));
    deliver(item.id, item.content, item.metadata);
  };

  const pollValid = pollOptions.map((o) => o.trim()).filter(Boolean);
  const pollReady = pollQuestion.trim().length > 0 && pollValid.length >= 2 && new Set(pollValid.map((o) => o.toLowerCase())).size === pollValid.length;

  const handleSendPoll = async () => {
    if (!pollReady || sendingPoll || !conversation || !user) return;
    setSendingPoll(true);
    try {
      await chatService.sendMessage(conversation.id, user.id, 'Sondage', 'poll', {
        question: pollQuestion.trim(),
        options: pollValid.map((text, i) => ({ id: `opt_${i}`, text })),
        multipleChoice: pollMultiple,
      });
      setIsCreatingPoll(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      setPollMultiple(false);
    } catch {
      toast('error', 'Le sondage n’a pas pu être envoyé. Réessaie.');
    } finally {
      setSendingPoll(false);
    }
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

  const nameOf = (senderId: string) => {
    const p = profiles[senderId];
    return p?.full_name || [p?.first_name, p?.last_name].filter(Boolean).join(' ') || '…';
  };

  /** Ouvre la feuille d'actions et de réactions au toucher long sur un message */
  const messageActions = (item: ChatItem) => {
    setSelectedMessage(item);
    setShowExtraEmojis(false);
  };

  /** Header menu: report the conversation; in a direct chat, block / unblock the other person. */
  const report = () => {
    const otherId = type === 'direct' ? (id as string) : null;
    const otherName = (title as string) || 'cette personne';
    const toggleMute = async () => {
      if (!conversation || !user) return;
      const next = !muted;
      try {
        await chatService.setMuted(conversation.id, user.id, next);
        setMuted(next);
        toast('success', next ? 'Notifications coupées pour cette conversation.' : 'Notifications réactivées.');
      } catch {
        toast('error', 'Impossible de modifier la sourdine. Réessaie.');
      }
    };
    appAlert('Options', undefined, [
      { text: muted ? 'Réactiver les notifications' : 'Mettre en sourdine', onPress: toggleMute },
      { text: 'Signaler la conversation', onPress: () => chooseReason((r) => sendReport({ reportedUserId: otherId ?? undefined }, r)) },
      ...(otherId
        ? blocked.has(otherId)
          ? [{ text: `Débloquer ${otherName}`, onPress: () => unblockUser(otherId, otherName) }]
          : [{ text: `Bloquer ${otherName}`, style: 'destructive' as const, onPress: () => blockUser(otherId, otherName) }]
        : []),
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const renderMessage = ({ item, index }: { item: ChatItem; index: number }) => {
    const isMe = item.sender_id === user?.id;
    // The list is inverted: the older neighbour is the next item
    const older = visibleMessages[index + 1];
    const newDay = !older || !isSameDay(older.created_at, item.created_at);
    const firstOfGroup = newDay || older.sender_id !== item.sender_id;
    const senderName = nameOf(item.sender_id);
    const time = new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const msgReactions = reactions[item.id] || [];

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
              {profiles[item.sender_id]?.avatar_url ? (
                <Image source={{ uri: profiles[item.sender_id].avatar_url }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarText}>{senderName.charAt(0).toUpperCase()}</Text>
              )}
            </View>
          )}
          <View style={styles.bubbleColumn}>
            {!isMe && type === 'team' && firstOfGroup && <Text style={styles.senderName}>{senderName}</Text>}

            <TouchableOpacity
              activeOpacity={item.failed ? 0.6 : 0.85}
              disabled={false}
              onPress={() => item.failed && retry(item)}
              onLongPress={() => !item.pending && !item.failed && messageActions(item)}
              delayLongPress={300}
              style={[
                styles.messageBubble,
                isMe ? styles.messageBubbleMe : styles.messageBubbleOther,
                item.pending && { opacity: 0.6 },
                item.failed && styles.messageBubbleFailed,
              ]}
            >
              {/* Bloc de citation si le message est une réponse */}
              {item.metadata?.reply_to && (
                <View style={[styles.quoteBox, isMe ? styles.quoteBoxMe : styles.quoteBoxOther]}>
                  <View style={[styles.quoteBar, isMe ? styles.quoteBarMe : styles.quoteBarOther]} />
                  <View style={{ flex: 1, paddingVertical: 1 }}>
                    <Text style={[styles.quoteSender, isMe ? styles.quoteSenderMe : styles.quoteSenderOther]} numberOfLines={1}>
                      {item.metadata.reply_to.sender_name}
                    </Text>
                    <Text style={[styles.quoteContent, isMe ? styles.quoteContentMe : styles.quoteContentOther]} numberOfLines={2}>
                      {item.metadata.reply_to.content}
                    </Text>
                  </View>
                </View>
              )}

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

            {/* Badges de réactions sous la bulle */}
            {msgReactions.length > 0 && (
              <View style={[styles.reactionRow, isMe ? styles.reactionRowMe : styles.reactionRowOther]}>
                {msgReactions.map((r) => (
                  <TouchableOpacity
                    key={r.reaction}
                    onPress={() => handleToggleReaction(item.id, r.reaction)}
                    style={[styles.reactionBadge, r.userReacted && styles.reactionBadgeActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.reactionEmoji}>{r.reaction}</Text>
                    <Text style={[styles.reactionCount, r.userReacted && styles.reactionCountActive]}>{r.count}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

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
          <PressableScale onPress={() => goBack(router, '/')} haptic="selection" style={[styles.headerBtn, glassSurface]}>
            <Feather name="chevron-left" size={22} color={theme.colors.text} />
          </PressableScale>
          <View style={[styles.headerAvatar, { backgroundColor: type === 'team' ? theme.colors.glassFill : BLUE_TINT }]}>
            {type === 'team' ? (
              <Feather name="users" size={16} color={theme.colors.text} />
            ) : profiles[id as string]?.avatar_url ? (
              <Image source={{ uri: profiles[id as string].avatar_url }} style={styles.headerAvatarImg} />
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

        {/* Annonce épinglée par le coach */}
        {pinnedMessage && (
          <View style={styles.pinnedBanner}>
            <View style={styles.pinnedIconWrap}>
              <Ionicons name="pin" size={14} color={BLUE} />
            </View>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => setPinnedExpanded((v) => !v)}
              activeOpacity={0.8}
            >
              <View style={styles.pinnedTitleRow}>
                <Text style={styles.pinnedTitle}>Annonce de {nameOf(pinnedMessage.sender_id)}</Text>
                <Feather name={pinnedExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={theme.colors.textMuted} />
              </View>
              <Text style={styles.pinnedText} numberOfLines={pinnedExpanded ? undefined : 1}>
                {pinnedMessage.type === 'poll' ? pinnedMessage.metadata?.question || 'Sondage' : pinnedMessage.content}
              </Text>
            </TouchableOpacity>
            {user?.role === 'coach' && type === 'team' && (
              <TouchableOpacity
                onPress={() => handlePin(null)}
                style={styles.pinnedUnpinBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Désépingler l'annonce"
              >
                <Feather name="x" size={14} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

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
            onEndReached={loadOlder}
            onEndReachedThreshold={0.4}
            ListFooterComponent={loadingOlder ? <ActivityIndicator style={styles.olderSpinner} color={theme.colors.textMuted} /> : null}
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
            <PressableScale
              haptic="selection"
              onPress={() => setPollMultiple((v) => !v)}
              style={styles.pollToggle}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: pollMultiple }}
            >
              <View style={[styles.pollCheck, pollMultiple && { backgroundColor: BLUE, borderColor: BLUE }]}>
                {pollMultiple && <Feather name="check" size={13} color="#FFFFFF" />}
              </View>
              <Text style={styles.pollToggleText}>Plusieurs réponses possibles</Text>
            </PressableScale>
            {!pollReady && pollQuestion.trim().length > 0 && (
              <Text style={styles.pollHint}>
                {pollValid.length < 2 ? 'Il faut au moins 2 options.' : 'Deux options ne peuvent pas être identiques.'}
              </Text>
            )}
            <PressableScale
              style={[styles.sendPollBtn, !pollReady && styles.sendPollBtnDisabled]}
              onPress={handleSendPoll}
              disabled={!pollReady || sendingPoll}
              haptic="medium"
            >
              <Text style={styles.sendPollBtnText}>{sendingPoll ? 'Envoi…' : 'Envoyer le sondage'}</Text>
            </PressableScale>
          </View>
        ) : (
          <View style={[styles.bottomBarContainer, { paddingBottom: bottomOffset }]}>
            {/* Aperçu de la citation / réponse en cours */}
            {replyingTo && (
              <View style={styles.replyBar}>
                <View style={styles.replyBarIndicator} />
                <View style={{ flex: 1, paddingVertical: 2 }}>
                  <Text style={styles.replyBarTitle}>
                    Répondre à <Text style={{ fontWeight: '700' }}>{replyingTo.sender_name}</Text>
                  </Text>
                  <Text style={styles.replyBarText} numberOfLines={1}>
                    {replyingTo.content}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.replyBarClose} accessibilityLabel="Annuler la réponse">
                  <Feather name="x" size={16} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputContainer}>
              {user?.role === 'coach' && (
                <TouchableOpacity style={styles.attachBtn} onPress={() => setIsCreatingPoll(true)} activeOpacity={0.7}>
                  <Feather name="bar-chart-2" size={19} color={BLUE} />
                </TouchableOpacity>
              )}
              <View style={[styles.inputCapsule, glassSurface]}>
                <TextInput
                  ref={inputRef}
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
          </View>
        )}

        {/* Feuille d'actions et de réactions au toucher long */}
        <BottomSheet
          visible={!!selectedMessage}
          onClose={() => {
            setSelectedMessage(null);
            setShowExtraEmojis(false);
          }}
          title={selectedMessage ? (selectedMessage.sender_id === user?.id ? 'Mon message' : `Message de ${nameOf(selectedMessage.sender_id)}`) : undefined}
        >
          {selectedMessage && (
            <View style={styles.sheetContent}>
              {/* Barre de réactions rapides : ❤️, 👍, 🔥, 💪 + bouton personnalisable (+) */}
              <View style={styles.sheetReactionsBar}>
                {['❤️', '👍', '🔥', '💪'].map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.sheetReactionBtn}
                    onPress={() => {
                      handleToggleReaction(selectedMessage.id, emoji);
                      setSelectedMessage(null);
                      setShowExtraEmojis(false);
                    }}
                  >
                    <Text style={styles.sheetReactionEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.sheetReactionBtn}
                  onPress={() => setShowExtraEmojis((v) => !v)}
                  accessibilityLabel="Plus d'emojis"
                >
                  <Feather name={showExtraEmojis ? 'minus' : 'plus'} size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Ligne d'emojis personnalisés déroulable */}
              {showExtraEmojis && (
                <View style={styles.sheetExtraEmojisRow}>
                  {['👏', '🎯', '⚡', '🥇', '🤩', '🙌', '🚀', '👀'].map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={styles.sheetReactionBtn}
                      onPress={() => {
                        handleToggleReaction(selectedMessage.id, emoji);
                        setSelectedMessage(null);
                        setShowExtraEmojis(false);
                      }}
                    >
                      <Text style={styles.sheetReactionEmoji}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Actions disponibles sur le message */}
              <View style={styles.sheetActionsList}>
                <TouchableOpacity
                  style={styles.sheetActionItem}
                  onPress={() => {
                    const replyMeta = {
                      id: selectedMessage.id,
                      sender_name: nameOf(selectedMessage.sender_id),
                      content: selectedMessage.type === 'poll' ? selectedMessage.metadata?.question || 'Sondage' : selectedMessage.content,
                    };
                    setReplyingTo(replyMeta);
                    setSelectedMessage(null);
                    setShowExtraEmojis(false);
                    setTimeout(() => inputRef.current?.focus(), 150);
                  }}
                >
                  <Feather name="corner-up-left" size={18} color={BLUE} />
                  <Text style={styles.sheetActionText}>Répondre en citant</Text>
                </TouchableOpacity>

                {selectedMessage.type !== 'poll' && (
                  <TouchableOpacity
                    style={styles.sheetActionItem}
                    onPress={() => {
                      Clipboard.setStringAsync(selectedMessage.content);
                      toast('success', 'Texte copié.');
                      setSelectedMessage(null);
                      setShowExtraEmojis(false);
                    }}
                  >
                    <Feather name="copy" size={18} color={theme.colors.text} />
                    <Text style={styles.sheetActionText}>Copier le texte</Text>
                  </TouchableOpacity>
                )}

                {user?.role === 'coach' && type === 'team' && (
                  <TouchableOpacity
                    style={styles.sheetActionItem}
                    onPress={() => {
                      const msgId = selectedMessage.id;
                      setSelectedMessage(null);
                      setShowExtraEmojis(false);
                      handlePin(pinnedMessage?.id === msgId ? null : msgId);
                    }}
                  >
                    <Ionicons name="pin" size={18} color={BLUE} />
                    <Text style={styles.sheetActionText}>
                      {pinnedMessage?.id === selectedMessage.id ? 'Désépingler l’annonce' : 'Épingler comme annonce'}
                    </Text>
                  </TouchableOpacity>
                )}

                {selectedMessage.sender_id !== user?.id && (
                  <>
                    <TouchableOpacity
                      style={styles.sheetActionItem}
                      onPress={() => {
                        const msg = selectedMessage;
                        setSelectedMessage(null);
                        setShowExtraEmojis(false);
                        chooseReason((r) => sendReport({ reportedUserId: msg.sender_id, messageId: msg.id, excerpt: msg.content }, r));
                      }}
                    >
                      <Feather name="flag" size={18} color={theme.colors.text} />
                      <Text style={styles.sheetActionText}>Signaler le message</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.sheetActionItem}
                      onPress={() => {
                        const senderId = selectedMessage.sender_id;
                        const senderName = nameOf(senderId);
                        setSelectedMessage(null);
                        setShowExtraEmojis(false);
                        blockUser(senderId, senderName);
                      }}
                    >
                      <Feather name="slash" size={18} color={theme.colors.error} />
                      <Text style={[styles.sheetActionText, { color: theme.colors.error }]}>
                        Bloquer {nameOf(selectedMessage.sender_id)}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          )}
        </BottomSheet>
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
  avatarImg: { width: 28, height: 28, borderRadius: 14 },
  headerAvatarImg: { width: 36, height: 36, borderRadius: 18 },
  olderSpinner: { paddingVertical: 16 },
  pollToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  pollCheck: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  pollToggleText: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  pollHint: { fontSize: 12, color: theme.colors.warning, marginBottom: 4 },
  sendPollBtnDisabled: { opacity: 0.4 },
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

  // Citations / Réponses
  quoteBox: {
    flexDirection: 'row',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
    overflow: 'hidden',
  },
  quoteBoxMe: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  quoteBoxOther: {
    backgroundColor: theme.colors.surfaceLight,
  },
  quoteBar: {
    width: 3,
    borderRadius: 1.5,
    marginRight: 8,
  },
  quoteBarMe: {
    backgroundColor: '#FFFFFF',
  },
  quoteBarOther: {
    backgroundColor: BLUE,
  },
  quoteSender: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 1,
  },
  quoteSenderMe: {
    color: '#FFFFFF',
  },
  quoteSenderOther: {
    color: BLUE,
  },
  quoteContent: {
    fontSize: 12,
    lineHeight: 16,
  },
  quoteContentMe: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  quoteContentOther: {
    color: theme.colors.textSecondary,
  },

  // Badges de réactions sous la bulle
  reactionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  reactionRowMe: {
    justifyContent: 'flex-end',
  },
  reactionRowOther: {
    justifyContent: 'flex-start',
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  reactionBadgeActive: {
    backgroundColor: BLUE_TINT,
    borderColor: BLUE,
  },
  reactionEmoji: {
    fontSize: 12,
  },
  reactionCount: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  reactionCountActive: {
    color: BLUE,
    fontWeight: '700',
  },

  // Annonce épinglée
  pinnedBanner: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pinnedIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BLUE_TINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinnedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  pinnedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: BLUE,
  },
  pinnedText: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
  },
  pinnedUnpinBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.glassFill,
  },

  // Conteneur de saisie avec aperçu de citation
  bottomBarContainer: {
    backgroundColor: 'transparent',
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.hairline,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
    gap: 8,
  },
  replyBarIndicator: {
    width: 3,
    height: '80%',
    backgroundColor: BLUE,
    borderRadius: 1.5,
  },
  replyBarTitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  replyBarText: {
    fontSize: 13,
    color: theme.colors.text,
    marginTop: 1,
  },
  replyBarClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.glassFill,
  },

  // Feuille d'actions et de réactions
  sheetContent: {
    paddingBottom: 16,
  },
  sheetReactionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: 16,
    marginBottom: 12,
  },
  sheetExtraEmojisRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: 16,
    marginBottom: 12,
    gap: 8,
  },
  sheetReactionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetReactionEmoji: {
    fontSize: 22,
  },
  sheetActionsList: {
    gap: 4,
  },
  sheetActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  sheetActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
