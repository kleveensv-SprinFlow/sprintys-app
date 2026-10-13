import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { theme } from '../../src/core/theme';
import { glassSurface } from '../../src/core/glass';
import { buildSystemPrompt } from '../../src/services/aiContextBuilder';
import { streamAIResponse, AIError } from '../../src/services/aiService';
import AILoadingIndicator from '../../src/components/AILoadingIndicator';
import { RichChatMessage } from '../../src/components/RichChatMessage';
import { WorkoutProposalCard, AIWorkoutProposal } from '../../src/components/WorkoutProposalCard';
import { useAuthStore } from '../../src/store/authStore';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useSprintyChatStore, ChatMessage } from '../../src/store/sprintyChatStore';
import SprintyHistoryModal from '../../src/components/SprintyHistoryModal';
import { useKeyboardOffset } from '../../src/shared/hooks/useKeyboardOffset';
import { GlowBackground } from '../../src/shared/components/GlowBackground';
import { PressableScale } from '../../src/shared/components/PressableScale';

const BLUE = theme.colors.sprintyBlue;
const BLUE_TINT = 'rgba(0, 105, 232, 0.1)';
const MAX_CHARS = 2000;
/** A conversation older than this is not reopened: Sprinty starts fresh. */
const RESUME_WINDOW_MS = 6 * 3600 * 1000;
const PROPOSAL_REGEX = /```workout_proposal([\s\S]*?)```/i;

const haptic = (kind: 'light' | 'success') => {
  if (Platform.OS === 'web') return;
  try {
    if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // ignore
  }
};

export default function AthleteMessageScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const upcomingWorkouts = useWorkoutStore((s) => s.upcomingWorkouts);

  const conversations = useSprintyChatStore((s) => s.conversations);
  const currentConversationId = useSprintyChatStore((s) => s.currentConversationId);
  const { startNewConversation, addMessage, getCurrentMessages, loadConversation, ensureOwner, pruneEmpty, removeLastAssistantMessage } =
    useSprintyChatStore.getState();

  const messages = useMemo(
    () => conversations.find((c) => c.id === currentConversationId)?.messages ?? [],
    [conversations, currentConversationId]
  );
  const hasExchange = messages.some((m) => m.role === 'user');

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [error, setError] = useState<{ message: string; canRetry: boolean } | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { bottomOffset } = useKeyboardOffset({
    extraMargin: 20,
    onKeyboardShow: () => scrollViewRef.current?.scrollToEnd({ animated: true }),
  });

  // History belongs to the signed-in account; reopen the recent conversation, if any
  useEffect(() => {
    if (user?.id) ensureOwner(user.id);
    pruneEmpty();
    const { conversations: all } = useSprintyChatStore.getState();
    const latest = [...all].filter((c) => !c.athleteContext).sort((a, b) => b.updatedAt - a.updatedAt)[0];
    loadConversation(latest && Date.now() - latest.updatedAt < RESUME_WINDOW_MS ? latest.id : null);
    return () => abortRef.current?.abort();
  }, [user?.id]);

  const scrollToEnd = () => setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 80);

  /** Contextual first questions, built from the athlete's own week. */
  const suggestions = useMemo(() => {
    const now = Date.now();
    const lastDone = [...upcomingWorkouts]
      .filter((w) => w?.status === 'completed' && new Date(w.date_prevue).getTime() <= now)
      .sort((a, b) => new Date(b.date_prevue).getTime() - new Date(a.date_prevue).getTime())[0];
    const next = [...upcomingWorkouts]
      .filter((w) => w?.status !== 'completed' && new Date(w.date_prevue).getTime() >= now - 3600000)
      .sort((a, b) => new Date(a.date_prevue).getTime() - new Date(b.date_prevue).getTime())[0];
    const name = (w: any) => (w?.name || w?.type_seance || 'ma séance').toLowerCase();
    return [
      { icon: 'activity', label: 'Analyse ma semaine', prompt: "Analyse ma semaine d'entraînement et ma forme." },
      {
        icon: 'coffee',
        label: next ? `Manger avant ${name(next)}` : 'Que manger avant ma séance ?',
        prompt: next
          ? `Que devrais-je manger avant ${name(next)} ?`
          : 'Que devrais-je manger avant ma prochaine séance ?',
      },
      {
        icon: 'moon',
        label: lastDone ? `Récupérer de ${name(lastDone)}` : 'Bien récupérer',
        prompt: lastDone
          ? `Comment bien récupérer de ${name(lastDone)} ?`
          : 'Comment bien récupérer après une grosse séance ?',
      },
    ] as const;
  }, [upcomingWorkouts]);

  const generate = async () => {
    const history = getCurrentMessages()
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }));
    setError(null);
    setStreamText('');
    setIsTyping(true);
    scrollToEnd();

    const controller = new AbortController();
    abortRef.current = controller;
    let partial = '';
    try {
      const reply = await streamAIResponse({
        messages: history,
        systemPrompt: buildSystemPrompt(),
        purpose: 'chat',
        signal: controller.signal,
        onDelta: (text) => {
          partial = text;
          setStreamText(text);
        },
      });
      const final = (reply || partial).trim();
      if (final) addMessage({ role: 'assistant', content: final });
      haptic('success');
    } catch (err) {
      if (controller.signal.aborted) {
        // Stopped by the user: keep what was already written
        if (partial.trim()) addMessage({ role: 'assistant', content: partial.trim() });
      } else {
        console.error(err);
        // Shown locally only: an error is never stored as Sprinty's answer
        setError(
          err instanceof AIError
            ? { message: err.message, canRetry: err.status !== 429 && err.status !== 413 }
            : { message: 'Connexion impossible. Vérifie ton réseau et réessaie.', canRetry: true }
        );
      }
    } finally {
      abortRef.current = null;
      setIsTyping(false);
      setStreamText('');
      scrollToEnd();
    }
  };

  const sendMessage = (text?: string) => {
    const content = (text ?? inputText).trim().slice(0, MAX_CHARS);
    if (!content || isTyping) return;
    haptic('light');
    setInputText('');
    if (!useSprintyChatStore.getState().currentConversationId) startNewConversation();
    addMessage({ role: 'user', content });
    generate();
  };

  const stop = () => abortRef.current?.abort();

  const regenerate = () => {
    if (isTyping) return;
    removeLastAssistantMessage();
    generate();
  };

  const openActions = (msg: ChatMessage, isLastAssistant: boolean) => {
    const text = msg.content.replace(PROPOSAL_REGEX, '').trim();
    Alert.alert('Message', undefined, [
      {
        text: 'Copier',
        onPress: () => {
          Clipboard.setStringAsync(text);
          haptic('light');
        },
      },
      ...(isLastAssistant && !isTyping ? [{ text: 'Réessayer', onPress: regenerate }] : []),
      { text: 'Annuler', style: 'cancel' as const },
    ]);
  };

  const renderAssistant = (content: string) => {
    let textOnly = content;
    let proposal: AIWorkoutProposal | null = null;
    const match = content.match(PROPOSAL_REGEX);
    if (match && match[1]) {
      textOnly = content.replace(PROPOSAL_REGEX, '').trim();
      try {
        proposal = JSON.parse(match[1].trim());
      } catch (e) {
        console.error('Failed to parse AI workout proposal', e);
      }
    }
    return (
      <View style={{ width: '100%' }}>
        {textOnly ? <RichChatMessage content={textOnly} /> : null}
        {proposal && (
          <View style={styles.proposal}>
            <WorkoutProposalCard
              proposal={proposal}
              onValidate={() => addMessage({ role: 'assistant', content: '💪 Séance ajoutée au calendrier !' })}
              onReject={() => setInputText("Je n'ai pas validé cette séance, voici ce qu'il faut changer : ")}
            />
          </View>
        )}
      </View>
    );
  };

  const lastAssistantIndex = messages.map((m) => m.role).lastIndexOf('assistant');
  const firstName = user?.firstName || '';

  return (
    <View style={styles.container}>
      <GlowBackground />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <PressableScale style={styles.headerBtn} onPress={() => router.back()} haptic="selection">
            <Feather name="chevron-left" size={22} color={theme.colors.text} />
          </PressableScale>
          <View style={styles.headerCenter}>
            <View style={styles.avatarWrapper}>
              <LottieView
                source={
                  isTyping ? require('../../src/assets/animations/active.json') : require('../../src/assets/animations/idle.json')
                }
                autoPlay
                loop
                style={styles.lottieAvatar}
              />
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.title}>Sprinty</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {isTyping ? 'Sprinty écrit…' : 'Entraînement · nutrition · récup'}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <PressableScale
              style={styles.headerBtn}
              haptic="selection"
              onPress={() => {
                if (isTyping) return;
                setError(null);
                loadConversation(null);
              }}
            >
              <Feather name="edit" size={17} color={theme.colors.text} />
            </PressableScale>
            <PressableScale style={styles.headerBtn} haptic="selection" onPress={() => setHistoryVisible(true)}>
              <Feather name="clock" size={18} color={theme.colors.text} />
            </PressableScale>
          </View>
        </View>

        <KeyboardAvoidingView style={styles.keyboardAvoid} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={styles.chatArea}
            contentContainerStyle={styles.chatContent}
            ref={scrollViewRef}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
          >
            {/* Fresh conversation: contextual starters */}
            {!hasExchange && !isTyping && (
              <View style={styles.heroContainer}>
                <Text style={styles.heroTitle}>{firstName ? `Salut ${firstName} !` : 'Salut !'}</Text>
                <Text style={styles.heroSub}>
                  Pose-moi tes questions sur l'entraînement, la nutrition ou la récupération. Je connais ton planning et tes repas du
                  jour.
                </Text>
                <View style={styles.suggestions}>
                  {suggestions.map((s) => (
                    <PressableScale key={s.label} style={styles.suggestion} onPress={() => sendMessage(s.prompt)}>
                      <View style={styles.suggestionIcon}>
                        <Feather name={s.icon as any} size={16} color={BLUE} />
                      </View>
                      <Text style={styles.suggestionText} numberOfLines={1}>
                        {s.label}
                      </Text>
                      <Feather name="arrow-up-right" size={16} color={theme.colors.textMuted} />
                    </PressableScale>
                  ))}
                </View>
              </View>
            )}

            {/* Chat messages (the stored intro line is replaced by the starters above) */}
            {messages.map((msg, index) => {
              if (msg.role !== 'user' && msg.role !== 'assistant') return null;
              if (index === 0 && msg.role === 'assistant') return null;
              const isAssistant = msg.role === 'assistant';
              return (
                <View key={index} style={isAssistant ? styles.messageRowLeft : styles.messageRowRight}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    delayLongPress={300}
                    onLongPress={() => openActions(msg, index === lastAssistantIndex)}
                    style={isAssistant ? styles.messageBubbleLeft : styles.messageBubbleRight}
                  >
                    {isAssistant ? renderAssistant(msg.content) : <Text style={styles.messageTextUser}>{msg.content}</Text>}
                  </TouchableOpacity>
                </View>
              );
            })}

            {/* Answer being written */}
            {isTyping && (
              <View style={styles.messageRowLeft}>
                <View style={styles.messageBubbleLeft}>
                  {streamText ? <RichChatMessage content={streamText.replace(PROPOSAL_REGEX, '')} /> : <AILoadingIndicator />}
                </View>
              </View>
            )}

            {/* Local error, never saved in the conversation */}
            {error && !isTyping && (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={16} color={theme.colors.error} />
                <Text style={styles.errorText}>{error.message}</Text>
                {error.canRetry && (
                  <TouchableOpacity onPress={generate} hitSlop={8}>
                    <Text style={styles.errorRetry}>Réessayer</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>

          {/* Input bar */}
          <View style={[styles.bottomInputBar, { paddingBottom: bottomOffset }]}>
            {inputText.length > MAX_CHARS - 200 && (
              <Text style={[styles.counter, inputText.length >= MAX_CHARS && { color: theme.colors.error }]}>
                {inputText.length.toLocaleString('fr-FR')} / {MAX_CHARS.toLocaleString('fr-FR')}
              </Text>
            )}
            <View style={[styles.inputBox, glassSurface]}>
              <TextInput
                style={styles.input}
                placeholder="Écris à Sprinty…"
                placeholderTextColor={theme.colors.textMuted}
                multiline
                maxLength={MAX_CHARS}
                value={inputText}
                onChangeText={setInputText}
              />
              {isTyping ? (
                <PressableScale style={[styles.sendBtn, styles.stopBtn]} onPress={stop} haptic="medium">
                  <View style={styles.stopSquare} />
                </PressableScale>
              ) : (
                <PressableScale
                  style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
                  onPress={() => sendMessage()}
                  disabled={!inputText.trim()}
                  haptic="none"
                >
                  <Feather name="arrow-up" size={18} color="#FFFFFF" />
                </PressableScale>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <SprintyHistoryModal visible={historyVisible} onClose={() => setHistoryVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backdrop },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 10,
    zIndex: 10,
  },
  headerBtn: {
    ...glassSurface,
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatarWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  lottieAvatar: { width: 38, height: 38 },
  title: { fontSize: 16, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.2 },
  subtitle: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, marginTop: 1 },
  keyboardAvoid: { flex: 1 },
  chatArea: { flex: 1 },
  chatContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },

  heroContainer: { marginTop: 24, marginBottom: 24, paddingHorizontal: 4 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.6, marginBottom: 8 },
  heroSub: { fontSize: 15, color: theme.colors.textSecondary, marginBottom: 20, lineHeight: 21 },
  suggestions: { gap: 10 },
  suggestion: {
    ...glassSurface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: BLUE_TINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionText: { flex: 1, fontSize: 15, fontWeight: '600', color: theme.colors.text },

  messageRowLeft: { flexDirection: 'row', marginBottom: 12, justifyContent: 'flex-start' },
  messageRowRight: { flexDirection: 'row', marginBottom: 12, justifyContent: 'flex-end' },
  messageBubbleLeft: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderCurve: 'continuous',
    borderBottomLeftRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '88%',
  },
  messageBubbleRight: {
    backgroundColor: BLUE,
    borderRadius: 20,
    borderCurve: 'continuous',
    borderBottomRightRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '82%',
  },
  messageTextUser: { fontSize: 15, lineHeight: 21, color: '#FFFFFF' },
  proposal: { marginTop: 12, minWidth: 280 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    maxWidth: '92%',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  errorText: { flexShrink: 1, fontSize: 14, color: theme.colors.text },
  errorRetry: { fontSize: 14, fontWeight: '800', color: BLUE },

  bottomInputBar: {
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  counter: { alignSelf: 'flex-end', fontSize: 11, fontWeight: '600', color: theme.colors.textMuted, marginBottom: 4, marginRight: 8 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    paddingLeft: 6,
    paddingRight: 4,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 120,
    color: theme.colors.text,
    paddingHorizontal: 10,
    paddingTop: 9,
    paddingBottom: 9,
    fontSize: 15,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BLUE,
    marginBottom: 1,
  },
  sendBtnDisabled: {
    backgroundColor: theme.colors.textMuted,
    opacity: 0.5,
  },
  stopBtn: { backgroundColor: theme.colors.text },
  stopSquare: { width: 12, height: 12, borderRadius: 3, backgroundColor: '#FFFFFF' },
});
