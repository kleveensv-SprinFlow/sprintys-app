import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/core/theme';
import { buildSystemPrompt } from '../../src/services/aiContextBuilder';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { fetchOpenAIResponse } from '../../src/services/aiService';
import AILoadingIndicator from '../../src/components/AILoadingIndicator';
import * as Haptics from 'expo-haptics';
import { WorkoutProposalCard, AIWorkoutProposal } from '../../src/components/WorkoutProposalCard';
import { useAuthStore } from '../../src/store/authStore';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import LottieView from 'lottie-react-native';
import { useSprintyChatStore } from '../../src/store/sprintyChatStore';
import SprintyHistoryModal from '../../src/components/SprintyHistoryModal';

export default function AthleteMessageScreen() {
  const router = useRouter();
  
  const { 
    currentConversationId, 
    startNewConversation, 
    addMessage, 
    getCurrentMessages 
  } = useSprintyChatStore();

  const messages = getCurrentMessages();

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);

  const insets = useSafeAreaInsets();
  const { updateCoachPhilosophy } = useAuthStore();
  const scrollViewRef = useRef<ScrollView>(null);
  const lottieRef = useRef<LottieView>(null);

  // Auto reset conversation on mount
  useEffect(() => {
    startNewConversation();
    lottieRef.current?.play();
  }, []);

  const renderMessageContent = (msg: { role: string; content: string }) => {
    if (msg.role !== 'assistant') {
      return <Text style={styles.messageTextUser}>{msg.content}</Text>;
    }

    const proposalRegex = /```workout_proposal([\s\S]*?)```/i;
    let textOnly = msg.content;
    let proposalObj: AIWorkoutProposal | null = null;
    
    const match = textOnly.match(proposalRegex);
    if (match && match[1]) {
      textOnly = textOnly.replace(proposalRegex, '').trim();
      try {
        proposalObj = JSON.parse(match[1].trim());
      } catch (e) {
        console.error('Failed to parse AI workout proposal', e);
      }
    }

    return (
      <View style={{ width: '100%' }}>
        {textOnly ? <Text style={styles.messageTextAssistant}>{textOnly}</Text> : null}
        {proposalObj && (
          <View style={{ marginTop: 12, minWidth: 280 }}>
            <WorkoutProposalCard 
              proposal={proposalObj} 
              onValidate={() => {
                addMessage({ role: 'assistant', content: '💪 Séance ajoutée au calendrier !' });
              }}
              onReject={() => {
                setInputText("Je n'ai pas validé cette séance, voici ce qu'il faut changer : ");
              }}
            />
          </View>
        )}
      </View>
    );
  };
  
  const sendMessage = async (text?: string) => {
    const messageToSend = text || inputText;
    if (!messageToSend.trim() || isTyping) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputText('');
    
    const userMsg = { role: 'user', content: messageToSend.trim() };
    addMessage(userMsg);
    setIsTyping(true);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const systemPrompt = buildSystemPrompt();
      const currentMsgs = getCurrentMessages();
      
      const response = await fetchOpenAIResponse(
        currentMsgs.map(m => ({ role: m.role, content: m.content })),
        systemPrompt
      );
      
      addMessage({ role: 'assistant', content: response.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error(err);
      addMessage({ role: 'assistant', content: "Désolé, j'ai rencontré un problème de connexion avec le serveur." });
    } finally {
      setIsTyping(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const athleteCapabilities = [
    { id: 1, title: 'Analyser ma nutrition', icon: 'coffee', prompt: "J'aimerais une analyse sur ma nutrition et mes repas." },
    { id: 2, title: 'Analyser ma forme', icon: 'activity', prompt: "J'aimerais une analyse de mon état de forme actuel." },
  ];

  return (
    <View style={styles.container}>
      {/* Rich Complex Gradient for nebulous look (Android Safe) */}
      <LinearGradient
        colors={['#1F0E38', '#140A26', '#09090D']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.avatarWrapper}>
              <LottieView
                ref={lottieRef}
                source={isTyping ? require('../../src/assets/animations/active.json') : require('../../src/assets/animations/idle.json')}
                autoPlay
                loop
                style={styles.lottieAvatar}
              />
              <View style={styles.onlineDot} />
            </View>
            <View>
              <Text style={styles.title}>Sprinty IA</Text>
              <Text style={styles.subtitle}>{isTyping ? 'ENTRAIN DE RÉFLÉCHIR...' : 'NEURAL ASSISTANT ACTIF'}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.menuBtn} onPress={() => setHistoryVisible(true)}>
            <Feather name="more-horizontal" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView 
          style={styles.keyboardAvoid} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <ScrollView 
            style={styles.chatArea} 
            contentContainerStyle={[styles.chatContent, { paddingBottom: 100 }]}
            ref={scrollViewRef}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
          >
            {/* Hero Quick Actions if empty */}
            {messages.length <= 1 && (
              <View style={styles.heroContainer}>
                <Text style={styles.heroTitle}>Capacités Sprinty</Text>
                <Text style={styles.heroSub}>Explore tout le potentiel de ton assistant IA personnel.</Text>
                <View style={styles.capabilitiesGrid}>
                  {athleteCapabilities.map(cap => (
                    <TouchableOpacity 
                      key={cap.id} 
                      style={styles.capabilityCard}
                      activeOpacity={0.7}
                      onPress={() => sendMessage(cap.prompt)}
                    >
                      <View style={styles.capabilityIconWrap}>
                        <Feather name={cap.icon as any} size={20} color="#00FFFF" />
                      </View>
                      <Text style={styles.capabilityTitle}>{cap.title}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Chat Messages */}
            {messages.map((msg, index) => {
              if (msg.role === 'system') return null;
              const isAssistant = msg.role === 'assistant';
              return (
                <View key={index} style={!isAssistant ? styles.messageRowRight : styles.messageRowLeft}>
                  {isAssistant && (
                    <View style={styles.chatAvatarSmall}>
                      <LottieView
                        source={require('../../src/assets/animations/idle.json')}
                        autoPlay
                        loop
                        style={{ width: 20, height: 20 }}
                      />
                    </View>
                  )}
                  <View style={!isAssistant ? styles.messageBubbleRight : styles.messageBubbleLeft}>
                    {renderMessageContent(msg)}
                  </View>
                </View>
              )
            })}
            
            {isTyping && (
              <View style={styles.messageRowLeft}>
                <View style={styles.chatAvatarSmall}>
                  <LottieView
                    source={require('../../src/assets/animations/active.json')}
                    autoPlay
                    loop
                    style={{ width: 20, height: 20 }}
                  />
                </View>
                <View style={[styles.messageBubbleLeft, { paddingHorizontal: 16, paddingVertical: 12 }]}>
                  <AILoadingIndicator />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Floating Input Bar */}
          <View style={styles.floatingInputWrapper}>
            <BlurView intensity={30} tint="dark" style={styles.floatingBlur}>
              <View style={[styles.inputContainer, { paddingBottom: Platform.OS === 'ios' ? Math.max(16, insets.bottom) : 16 }]}>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    placeholder="Tapez un message..."
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    multiline
                    value={inputText}
                    onChangeText={setInputText}
                  />
                  <TouchableOpacity 
                    style={[styles.sendBtn, (!inputText.trim()) && { opacity: 0.5, backgroundColor: 'rgba(0, 255, 255, 0.1)' }]} 
                    onPress={() => sendMessage()} 
                    disabled={isTyping || !inputText.trim()}
                  >
                    <Ionicons name="arrow-up" size={18} color={inputText.trim() ? "#09090D" : "rgba(255, 255, 255, 0.4)"} />
                  </TouchableOpacity>
                </View>
              </View>
            </BlurView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* History Modal */}
      <SprintyHistoryModal 
        visible={historyVisible} 
        onClose={() => setHistoryVisible(false)} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090D' },
  header: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20, 
    paddingTop: 10, 
    paddingBottom: 16, 
    zIndex: 10
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  lottieAvatar: { width: 40, height: 40 },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00FF88',
    borderWidth: 2,
    borderColor: '#1F0E38',
  },
  title: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  subtitle: { fontSize: 10, fontWeight: '600', color: '#00FFFF', marginTop: 2 },
  keyboardAvoid: { flex: 1 },
  chatArea: { flex: 1 },
  chatContent: { paddingHorizontal: 16, paddingTop: 20 },
  
  heroContainer: { marginTop: 20, marginBottom: 40, paddingHorizontal: 8 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#FFF', marginBottom: 8 },
  heroSub: { fontSize: 14, color: 'rgba(255, 255, 255, 0.6)', marginBottom: 24, lineHeight: 20 },
  capabilitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  capabilityCard: {
    width: '48%', backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  capabilityIconWrap: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0, 255, 255, 0.1)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  capabilityTitle: { fontSize: 14, fontWeight: '600', color: '#FFF', lineHeight: 20 },

  messageRowLeft: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16, justifyContent: 'flex-start' },
  messageRowRight: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16, justifyContent: 'flex-end' },
  
  chatAvatarSmall: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center', alignItems: 'center', marginRight: 8, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  
  messageBubbleLeft: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 20, borderBottomLeftRadius: 4,
    paddingHorizontal: 16, paddingVertical: 12, maxWidth: '80%', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  messageBubbleRight: {
    backgroundColor: '#FFFFFF', borderRadius: 20, borderBottomRightRadius: 4,
    paddingHorizontal: 16, paddingVertical: 12, maxWidth: '80%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8,
  },
  messageTextAssistant: { fontSize: 15, lineHeight: 22, color: '#E2E8F0' },
  messageTextUser: { fontSize: 15, lineHeight: 22, color: '#09090D' }, // Fixed user text color
  
  floatingInputWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  floatingBlur: {
    paddingTop: 16, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden',
    borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  inputContainer: { paddingHorizontal: 16 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 30, paddingHorizontal: 6, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  input: { flex: 1, minHeight: 40, maxHeight: 100, color: '#FFF', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, fontSize: 15 },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#00FFFF', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#00FFFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 10,
  },
});
