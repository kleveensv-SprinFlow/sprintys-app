import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { theme } from '../../core/theme';
import { glassSurface } from '../../core/glass';
import { supabase } from '../../services/supabase';
import { AIError } from '../../services/aiService';
import { useAuthStore } from '../../store/authStore';
import { useSprintyChatStore, ChatMessage } from '../../store/sprintyChatStore';
import { useConsentStore } from '../../store/consentStore';
import SprintyHistoryModal from '../../components/SprintyHistoryModal';
import AILoadingIndicator from '../../components/AILoadingIndicator';
import { useKeyboardOffset } from '../../shared/hooks/useKeyboardOffset';
import { GlowBackground } from '../../shared/components/GlowBackground';
import { PressableScale } from '../../shared/components/PressableScale';
import { appAlert } from '../../shared/feedback/appAlert';
import { ALL_DOMAINS, DOMAIN_LABELS, AnalysisDomain } from '../../services/athleteAnalysisContext';
import { streamSprinty } from './agentClient';
import { getActivePlan, removePlan } from './proposalWriter';
import { exportPartsToPdf, pdfTitleFor } from './pdf';
import { confirmAsync, toast } from '../../shared/feedback/appAlert';
import { SprintyMessageView } from './SprintyMessageView';
import { partsToText, type MessagePart } from './types';

const BLUE = theme.colors.sprintyBlue;
const MAX_CHARS = 2000;
/** A conversation older than this is not reopened: Sprinty starts fresh. */
const RESUME_WINDOW_MS = 6 * 3600 * 1000;

const haptic = (kind: 'light' | 'success') => {
  if (Platform.OS === 'web') return;
  try {
    if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // ignore
  }
};

interface Starter {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  hint: string;
  prompt?: string;
  route?: string;
}

const COACH_STARTERS: Starter[] = [
  { icon: 'battery-charging', label: 'Qui est fatigué ?', hint: 'Forme de l’équipe', prompt: 'Qui est fatigué dans mon équipe en ce moment ?' },
  { icon: 'calendar', label: 'Programmer la semaine', hint: 'Séances par groupe', prompt: 'Aide-moi à programmer la semaine prochaine.' },
  { icon: 'activity', label: 'Analyser un athlète', hint: 'Forme et progression', route: '/(coach)/analyze' },
  { icon: 'bar-chart-2', label: 'Comparer des athlètes', hint: 'Chronos, forme, charges', prompt: 'Je veux comparer des athlètes.' },
  { icon: 'award', label: 'Trouver une compétition', hint: 'Recherche sur le web', prompt: 'Je cherche une compétition pour mon groupe.' },
  { icon: 'volume-2', label: 'Écrire une annonce', hint: 'Pour l’équipe ou un groupe', prompt: 'Aide-moi à écrire une annonce pour mon équipe.' },
];

const SOLO_STARTERS: Starter[] = [
  { icon: 'flag', label: 'Fixer un objectif et un plan', hint: 'Sprinty construit ton programme', prompt: 'Je veux fixer un objectif et avoir un plan d’entraînement.' },
  { icon: 'zap', label: 'Une séance pour demain', hint: 'Adaptée à ta forme', prompt: 'Propose-moi une séance pour demain.' },
  { icon: 'trending-up', label: 'Analyse ma forme', hint: 'Sommeil, fatigue, tendance', prompt: 'Comment évolue ma forme ces dernières semaines ?' },
  { icon: 'coffee', label: 'Que manger avant ma séance ?', hint: 'Nutrition autour de l’effort', prompt: 'Que devrais-je manger avant ma prochaine séance ?' },
];

const COACHED_STARTERS: Starter[] = [
  { icon: 'activity', label: 'Analyse ma semaine', hint: 'Séances, forme, sommeil', prompt: "Analyse ma semaine d'entraînement et ma forme." },
  { icon: 'trending-up', label: 'Mes chronos progressent ?', hint: 'Résultats et records', prompt: 'Est-ce que mes chronos progressent ? Montre-moi.' },
  { icon: 'coffee', label: 'Que manger avant ma séance ?', hint: 'Nutrition autour de l’effort', prompt: 'Que devrais-je manger avant ma prochaine séance ?' },
  { icon: 'moon', label: 'Bien récupérer', hint: 'Sommeil et récupération', prompt: 'Comment bien récupérer après une grosse séance ?' },
];

export default function SprintyChatScreen({ role }: { role: 'athlete' | 'coach' }) {
  const router = useRouter();
  const params = useLocalSearchParams<{
    athleteId?: string;
    athleteName?: string;
    avatarUrl?: string;
    domains?: string;
    ts?: string;
    initialPrompt?: string;
  }>();
  const { user } = useAuthStore();
  const isCoach = role === 'coach';

  const conversations = useSprintyChatStore((s) => s.conversations);
  const currentConversationId = useSprintyChatStore((s) => s.currentConversationId);
  const store = useSprintyChatStore.getState;
  const conversation = conversations.find((c) => c.id === currentConversationId) ?? null;
  const messages = useMemo(() => conversation?.messages ?? [], [conversation]);
  const athleteCtx = isCoach ? conversation?.athleteContext ?? null : null;
  const hasExchange = messages.some((m) => m.role === 'user');

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [liveParts, setLiveParts] = useState<MessagePart[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; canRetry: boolean } | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [hasCoach, setHasCoach] = useState<boolean | null>(null);
  /** A Sprinty plan still running although a coach now plans the sessions. */
  const [leftoverPlan, setLeftoverPlan] = useState<{ id: string; title: string } | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const abortRef = useRef<AbortController | null>(null);
  const handledKeyRef = useRef<string | null>(null);
  const { bottomOffset } = useKeyboardOffset({
    extraMargin: 20,
    onKeyboardShow: () => scrollRef.current?.scrollToEnd({ animated: true }),
  });
  const scrollToEnd = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

  // Athletes: does a coach plan the sessions? (decides what Sprinty offers)
  useEffect(() => {
    if (isCoach) return;
    supabase.rpc('i_have_coach' as any).then(({ data, error: e }) => {
      setHasCoach(e ? null : data === true);
      if (data === true) getActivePlan().then(setLeftoverPlan).catch(() => undefined);
    });
  }, [isCoach]);

  // History belongs to the signed-in account. Coach: an athlete passed in the route opens an analysis.
  useEffect(() => {
    if (user?.id) store().ensureOwner(user.id);
    const key = params.athleteId ? `${params.athleteId}-${params.ts ?? ''}` : `general-${params.ts ?? ''}-${params.initialPrompt ?? ''}`;
    if (handledKeyRef.current === key) return;
    const first = handledKeyRef.current === null;
    handledKeyRef.current = key;

    if (isCoach && params.athleteId) {
      startAthleteAnalysis(params.athleteId, params.athleteName || 'Athlète', params.avatarUrl || null, parseDomains(params.domains));
    } else if (first || params.initialPrompt) {
      store().pruneEmpty();
      const latest = [...store().conversations]
        .filter((c) => !c.athleteContext)
        .sort((a, b) => b.updatedAt - a.updatedAt)[0];
      store().loadConversation(!params.initialPrompt && latest && Date.now() - latest.updatedAt < RESUME_WINDOW_MS ? latest.id : null);
    }
    if (params.initialPrompt) setInputText(params.initialPrompt);
    return undefined;
  }, [user?.id, params.athleteId, params.ts, params.initialPrompt]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const parseDomains = (raw?: string): AnalysisDomain[] => {
    const list = (raw || '').split(',').filter((d): d is AnalysisDomain => (ALL_DOMAINS as string[]).includes(d));
    return list.length ? list : ALL_DOMAINS;
  };

  const generate = async () => {
    const conv = store().getCurrentConversation();
    if (!conv) return;
    const convId = conv.id;
    const history = conv.messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      // The stored greeting is not part of the conversation
      .filter((m, i) => !(i === 0 && m.role === 'assistant'))
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      .filter((m) => m.content.trim());

    setError(null);
    setLiveParts([]);
    setStatus(null);
    setIsTyping(true);
    scrollToEnd();

    const controller = new AbortController();
    abortRef.current = controller;
    let partial: MessagePart[] = [];
    const save = (parts: MessagePart[]) => {
      if (!parts.length || store().currentConversationId !== convId) return;
      store().addMessage({ role: 'assistant', content: partsToText(parts), parts });
    };
    try {
      const parts = await streamSprinty({
        messages: history,
        focusAthleteId: conv.athleteContext?.athleteId ?? null,
        signal: controller.signal,
        onParts: (p) => {
          partial = p;
          setLiveParts(p);
        },
        onStatus: setStatus,
      });
      save(parts.length ? parts : partial);
      haptic('success');
    } catch (err) {
      if (controller.signal.aborted) {
        // Stopped by the user: keep what was already written
        save(partial);
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
      setLiveParts([]);
      setStatus(null);
      scrollToEnd();
    }
  };

  const sendMessage = async (text?: string, opts?: { auto?: boolean }) => {
    const content = (text ?? inputText).trim().slice(0, MAX_CHARS);
    if (!content || isTyping) return;
    if (!(await useConsentStore.getState().ensureAIConsent())) return;
    haptic('light');
    if (!opts?.auto && text === undefined) setInputText('');
    if (!store().currentConversationId) store().startNewConversation();
    store().addMessage({ role: 'user', content, auto: opts?.auto });
    generate();
  };

  const startAthleteAnalysis = (athleteId: string, name: string, avatarUrl: string | null, domains: AnalysisDomain[]) => {
    store().startNewConversation({ athleteId, name, avatarUrl, domains });
    const firstName = name.split(' ')[0];
    const full = domains.length === ALL_DOMAINS.length;
    const scope = full ? 'complète (entraînements, chronos, forme, poids et nutrition)' : `de ${domains.map((d) => DOMAIN_LABELS[d].toLowerCase()).join(', ')}`;
    sendMessage(`Fais-moi une analyse ${scope} de ${firstName} : progression, points forts, points de vigilance, avec les graphiques utiles.`, {
      auto: true,
    });
  };

  const stop = () => abortRef.current?.abort();

  const regenerate = () => {
    if (isTyping) return;
    store().removeLastAssistantMessage();
    generate();
  };

  const openActions = (msg: ChatMessage, isLastAssistant: boolean) => {
    const text = (msg.parts ? msg.parts.filter((p) => p.kind === 'text').map((p: any) => p.text).join('\n') : msg.content).trim();
    appAlert('Message', undefined, [
      ...(text ? [{ text: 'Copier', onPress: () => Clipboard.setStringAsync(text) }] : []),
      ...(msg.role === 'assistant' && msg.parts?.length ? [{ text: 'Exporter en PDF', onPress: () => exportPdf(msg) }] : []),
      ...(isLastAssistant && !isTyping ? [{ text: 'Réessayer', onPress: regenerate }] : []),
      { text: 'Annuler', style: 'cancel' as const },
    ]);
  };

  const exportPdf = async (msg: ChatMessage) => {
    if (!msg.parts?.length) return;
    const subtitle = athleteCtx ? `Analyse de ${athleteCtx.name}` : firstName ? `Pour ${firstName}` : undefined;
    try {
      await exportPartsToPdf(msg.parts, pdfTitleFor(msg.parts, conversation?.title || 'Sprinty'), subtitle);
    } catch (e) {
      console.error('pdf export failed', e);
      appAlert('Export impossible', 'Le PDF n’a pas pu être créé. Réessaie.');
    }
  };

  const askChange = (text: string) => {
    setInputText(text);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const clearLeftoverPlan = async () => {
    if (!leftoverPlan) return;
    const ok = await confirmAsync({
      title: 'Retirer ton plan Sprinty ?',
      message: `Ton coach programme maintenant tes séances. Les séances à venir de « ${leftoverPlan.title} » seront retirées ; celles déjà faites restent.`,
      confirmText: 'Retirer',
      destructive: true,
    });
    if (!ok) return;
    try {
      await removePlan(leftoverPlan.id);
      setLeftoverPlan(null);
      toast('success', 'Les séances à venir ont été retirées.', 'Plan retiré');
    } catch {
      toast('error', 'Le retrait n’a pas abouti. Réessaie.', 'Oups');
    }
  };

  const starters = isCoach ? COACH_STARTERS : hasCoach ? COACHED_STARTERS : SOLO_STARTERS;
  const lastAssistantIndex = messages.map((m) => m.role).lastIndexOf('assistant');
  const firstName = user?.firstName || '';
  const intro = isCoach
    ? 'Ton assistant de préparation : forme de l’équipe, analyses, programmation, compétitions, annonces. Je pose des questions avant d’agir et tu valides toujours.'
    : hasCoach
      ? 'Je connais tes séances, ta forme, tes résultats et tes repas. Ton coach programme tes séances ; moi, je t’aide à les comprendre et à progresser.'
      : 'Je peux être ton coach : on fixe un objectif ensemble, je construis ton plan et tu l’ajoutes à ton calendrier. Je connais aussi ta forme, tes résultats et tes repas.';

  return (
    <View style={styles.container}>
      <GlowBackground />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <PressableScale
            style={styles.headerBtn}
            haptic="selection"
            onPress={() => (isCoach ? router.replace('/(coach)') : router.back())}
            accessibilityLabel="Retour"
          >
            <Feather name="chevron-left" size={22} color={theme.colors.text} />
          </PressableScale>
          <View style={styles.headerCenter}>
            <View style={styles.avatarWrapper}>
              <LottieView
                source={isTyping ? require('../../assets/animations/active.json') : require('../../assets/animations/idle.json')}
                autoPlay
                loop
                style={styles.lottieAvatar}
              />
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.title}>Sprinty</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {isTyping ? status || 'Sprinty écrit…' : 'IA · pas un avis médical'}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <PressableScale
              style={styles.headerBtn}
              haptic="selection"
              accessibilityLabel="Nouvelle conversation"
              onPress={() => {
                if (isTyping) return;
                setError(null);
                store().loadConversation(null);
              }}
            >
              <Feather name="edit" size={17} color={theme.colors.text} />
            </PressableScale>
            <PressableScale style={styles.headerBtn} haptic="selection" accessibilityLabel="Historique" onPress={() => setHistoryVisible(true)}>
              <Feather name="clock" size={18} color={theme.colors.text} />
            </PressableScale>
          </View>
        </View>

        {athleteCtx && (
          <View style={styles.banner}>
            {athleteCtx.avatarUrl ? (
              <Image source={{ uri: athleteCtx.avatarUrl }} style={styles.bannerAvatar} />
            ) : (
              <View style={[styles.bannerAvatar, styles.bannerAvatarFallback]}>
                <Ionicons name="person" size={18} color={theme.colors.textMuted} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerKicker}>ANALYSE ATHLÈTE</Text>
              <Text style={styles.bannerName} numberOfLines={1}>
                {athleteCtx.name}
              </Text>
            </View>
            <Pressable
              hitSlop={10}
              accessibilityLabel="Quitter l’analyse"
              style={styles.bannerClose}
              onPress={() => {
                if (isTyping) return;
                store().loadConversation(null);
              }}
            >
              <Feather name="x" size={16} color={theme.colors.text} />
            </Pressable>
          </View>
        )}

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={styles.chatContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
          >
            {!hasExchange && !isTyping && !athleteCtx && (
              <View style={styles.hero}>
                <Text style={styles.heroTitle}>{firstName ? `Salut ${firstName} !` : 'Salut !'}</Text>
                <Text style={styles.heroSub}>{intro}</Text>
                {leftoverPlan && (
                  <PressableScale haptic="selection" onPress={clearLeftoverPlan} style={styles.leftover}>
                    <Feather name="info" size={16} color={theme.colors.warning} />
                    <Text style={styles.leftoverText}>
                      Ton plan Sprinty « {leftoverPlan.title} » est encore dans ton calendrier. Touche ici pour retirer ses séances à venir.
                    </Text>
                  </PressableScale>
                )}
                <View style={styles.starters}>
                  {starters.map((s) => (
                    <PressableScale
                      key={s.label}
                      style={styles.starter}
                      onPress={() => (s.route ? router.navigate(s.route as any) : sendMessage(s.prompt))}
                    >
                      <View style={styles.starterIcon}>
                        <Feather name={s.icon} size={16} color={BLUE} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.starterText} numberOfLines={1}>
                          {s.label}
                        </Text>
                        <Text style={styles.starterHint} numberOfLines={1}>
                          {s.hint}
                        </Text>
                      </View>
                      <Feather name="arrow-up-right" size={16} color={theme.colors.textMuted} />
                    </PressableScale>
                  ))}
                </View>
              </View>
            )}

            {messages.map((msg, index) => {
              if (msg.role !== 'user' && msg.role !== 'assistant') return null;
              if (index === 0 && msg.role === 'assistant') return null;
              const isAssistant = msg.role === 'assistant';
              if (!isAssistant) {
                return (
                  <View key={index} style={styles.rowRight}>
                    <Pressable delayLongPress={300} onLongPress={() => openActions(msg, false)} style={[styles.bubbleUser, msg.auto && styles.bubbleAuto]}>
                      <Text style={[styles.userText, msg.auto && styles.autoText]}>{msg.content}</Text>
                    </Pressable>
                  </View>
                );
              }
              const rich = !!msg.parts?.some((p) => p.kind === 'ui');
              return (
                <View key={index} style={styles.rowLeft}>
                  <Pressable
                    delayLongPress={300}
                    onLongPress={() => openActions(msg, index === lastAssistantIndex)}
                    style={[styles.bubbleAssistant, rich && styles.bubbleWide]}
                  >
                    <SprintyMessageView
                      parts={msg.parts}
                      content={msg.content}
                      interactive={index === lastAssistantIndex && !isTyping}
                      onAnswer={(text) => sendMessage(text)}
                      onAskChange={askChange}
                      onPatch={(partIndex, patch) => conversation && store().patchPart(conversation.id, index, partIndex, patch)}
                    />
                    {rich && (
                      <PressableScale haptic="selection" onPress={() => exportPdf(msg)} style={styles.pdfBtn} accessibilityLabel="Exporter en PDF">
                        <Feather name="download" size={14} color={BLUE} />
                        <Text style={styles.pdfText}>Exporter en PDF</Text>
                      </PressableScale>
                    )}
                  </Pressable>
                </View>
              );
            })}

            {isTyping && (
              <View style={styles.rowLeft}>
                <View style={[styles.bubbleAssistant, liveParts.some((p) => p.kind === 'ui') && styles.bubbleWide]}>
                  {liveParts.length ? (
                    <SprintyMessageView parts={liveParts} content="" interactive={false} onAnswer={() => undefined} onAskChange={() => undefined} onPatch={() => undefined} />
                  ) : (
                    <View style={styles.thinking}>
                      <AILoadingIndicator />
                      {status ? <Text style={styles.statusText}>{status}</Text> : null}
                    </View>
                  )}
                  {liveParts.length > 0 && status ? <Text style={[styles.statusText, { marginTop: 8 }]}>{status}</Text> : null}
                </View>
              </View>
            )}

            {error && !isTyping && (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={16} color={theme.colors.error} />
                <Text style={styles.errorText}>{error.message}</Text>
                {error.canRetry && (
                  <Pressable onPress={generate} hitSlop={8}>
                    <Text style={styles.errorRetry}>Réessayer</Text>
                  </Pressable>
                )}
              </View>
            )}
          </ScrollView>

          <View style={[styles.inputBar, { paddingBottom: bottomOffset }]}>
            {inputText.length > MAX_CHARS - 200 && (
              <Text style={[styles.counter, inputText.length >= MAX_CHARS && { color: theme.colors.error }]}>
                {inputText.length.toLocaleString('fr-FR')} / {MAX_CHARS.toLocaleString('fr-FR')}
              </Text>
            )}
            <View style={[styles.inputBox, glassSurface]}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder={athleteCtx ? `Une question sur ${athleteCtx.name.split(' ')[0]}…` : 'Écris à Sprinty…'}
                placeholderTextColor={theme.colors.textMuted}
                multiline
                maxLength={MAX_CHARS}
                value={inputText}
                onChangeText={setInputText}
              />
              {isTyping ? (
                <PressableScale style={[styles.sendBtn, styles.stopBtn]} onPress={stop} haptic="medium" accessibilityLabel="Arrêter la réponse">
                  <View style={styles.stopSquare} />
                </PressableScale>
              ) : (
                <PressableScale
                  style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
                  onPress={() => sendMessage()}
                  disabled={!inputText.trim()}
                  haptic="none"
                  accessibilityLabel="Envoyer"
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 10, zIndex: 10 },
  headerBtn: { ...glassSurface, width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
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

  banner: {
    ...glassSurface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 18,
  },
  bannerAvatar: { width: 36, height: 36, borderRadius: 18 },
  bannerAvatarFallback: { backgroundColor: theme.colors.glassFill, alignItems: 'center', justifyContent: 'center' },
  bannerKicker: { fontSize: 10, fontWeight: '800', color: BLUE, letterSpacing: 0.6 },
  bannerName: { fontSize: 15, fontWeight: '800', color: theme.colors.text },
  bannerClose: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.glassFill, alignItems: 'center', justifyContent: 'center' },

  chatContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  hero: { marginTop: 20, marginBottom: 24, paddingHorizontal: 4 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.6, marginBottom: 8 },
  heroSub: { fontSize: 15, color: theme.colors.textSecondary, marginBottom: 20, lineHeight: 21 },
  starters: { gap: 10 },
  leftover: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 16,
    padding: 12,
    marginTop: -8,
    marginBottom: 16,
  },
  leftoverText: { flex: 1, fontSize: 13, lineHeight: 18, color: theme.colors.text },
  starter: {
    ...glassSurface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  starterIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: 'rgba(0, 105, 232, 0.1)', alignItems: 'center', justifyContent: 'center' },
  starterText: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  starterHint: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },

  rowLeft: { flexDirection: 'row', marginBottom: 12, justifyContent: 'flex-start' },
  rowRight: { flexDirection: 'row', marginBottom: 12, justifyContent: 'flex-end' },
  bubbleAssistant: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderCurve: 'continuous',
    borderBottomLeftRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '88%',
  },
  bubbleWide: { maxWidth: '100%', width: '100%', backgroundColor: 'rgba(255,255,255,0.6)', paddingHorizontal: 8, paddingVertical: 8 },
  bubbleUser: {
    backgroundColor: BLUE,
    borderRadius: 20,
    borderCurve: 'continuous',
    borderBottomRightRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '82%',
  },
  bubbleAuto: { backgroundColor: 'rgba(0, 105, 232, 0.1)' },
  userText: { fontSize: 15, lineHeight: 21, color: '#FFFFFF' },
  autoText: { color: BLUE, fontSize: 13, lineHeight: 18 },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, minHeight: 36, paddingHorizontal: 8, marginTop: 4 },
  pdfText: { fontSize: 13, fontWeight: '700', color: BLUE },
  statusText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },

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

  inputBar: { paddingHorizontal: 12, paddingTop: 6 },
  counter: { alignSelf: 'flex-end', fontSize: 11, fontWeight: '600', color: theme.colors.textMuted, marginBottom: 4, marginRight: 8 },
  inputBox: { flexDirection: 'row', alignItems: 'flex-end', borderRadius: 24, paddingLeft: 6, paddingRight: 4, paddingVertical: 4 },
  input: { flex: 1, minHeight: 38, maxHeight: 120, color: theme.colors.text, paddingHorizontal: 10, paddingTop: 9, paddingBottom: 9, fontSize: 15 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: BLUE, marginBottom: 1 },
  sendBtnDisabled: { backgroundColor: theme.colors.textMuted, opacity: 0.5 },
  stopBtn: { backgroundColor: theme.colors.text },
  stopSquare: { width: 12, height: 12, borderRadius: 3, backgroundColor: '#FFFFFF' },
});
