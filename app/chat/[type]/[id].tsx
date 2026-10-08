import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../src/core/theme';
import { useAuthStore } from '../../../src/store/authStore';
import { chatService } from '../../../src/services/chatService';
import { supabase } from '../../../src/services/supabase';
import { PollMessage } from '../../../src/features/chat/PollMessage';
import { BlurView } from 'expo-blur';
import { useKeyboardOffset } from '../../../src/shared/hooks/useKeyboardOffset';

export default function ChatScreen() {
  const { type, id, title } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { bottomOffset } = useKeyboardOffset({ extraMargin: 20 });
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [conversation, setConversation] = useState<any>(null);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  
  // For Poll creation
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  useEffect(() => {
    if (user && id && type) {
      initChat();
    }
  }, [user, id, type]);

  const initChat = async () => {
    if (!user) return;
    let convo = null;
    if (type === 'team') {
      convo = await chatService.getOrCreateTeamConversation(id as string);
    } else {
      convo = await chatService.getOrCreateDirectConversation(user.id, id as string);
    }

    if (convo) {
      setConversation(convo);
      await chatService.ensureParticipant(convo.id, user.id);
      fetchMessages(convo.id);
      
      // Subscribe to new messages
      const channel = supabase.channel(`chat_${convo.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convo.id}` }, (payload: any) => {
          setMessages(prev => [payload.new, ...prev]);
          if (user?.id && payload.new.sender_id !== user.id) {
            chatService.markAsRead(convo.id, user.id, payload.new.id);
          }
        })
        .subscribe();
      
      return () => {
        channel.unsubscribe();
      };
    }
  };

  const fetchMessages = async (convoId: string) => {
    const msgs = await chatService.getMessages(convoId);
    setMessages(msgs);
    if (msgs.length > 0 && user?.id) {
      chatService.markAsRead(convoId, user.id, msgs[0].id);
    }
    
    // Fetch profiles for all senders
    const senderIds = [...new Set(msgs.map(m => m.sender_id).filter(Boolean))];
    if (senderIds.length > 0) {
      const { data } = await supabase.from('profiles').select('id, first_name, last_name, full_name').in('id', senderIds);
      if (data) {
        const profs: Record<string, any> = {};
        data.forEach((p: any) => profs[p.id] = p);
        setProfiles(profs);
      }
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !conversation || !user) return;
    const text = inputText;
    setInputText('');
    await chatService.sendMessage(conversation.id, user.id, text);
  };

  const handleSendPoll = async () => {
    if (!pollQuestion.trim() || !conversation || !user) return;
    const validOptions = pollOptions.filter(o => o.trim() !== '').map((text, i) => ({ id: `opt_${i}`, text }));
    if (validOptions.length < 2) return;

    await chatService.sendMessage(conversation.id, user.id, 'Sondage', 'poll', {
      question: pollQuestion,
      options: validOptions,
      multipleChoice: false
    });
    setIsCreatingPoll(false);
    setPollQuestion('');
    setPollOptions(['', '']);
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.sender_id === user?.id;
    const profile = profiles[item.sender_id];
    const senderName = isMe ? 'Moi' : (profile?.full_name || profile?.first_name || 'Inconnu');

    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}>
        {!isMe && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{senderName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flexShrink: 1, maxWidth: '80%' }}>
          {!isMe && type === 'team' && <Text style={styles.senderName}>{senderName}</Text>}
          
          <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleOther]}>
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
              <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
                {item.content}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title ? (title as string) : (type === 'team' ? "Chat d'Équipe" : 'Message Privé')}
            </Text>
            <Text style={styles.headerSubtitle}>
              {type === 'team' ? 'Discussion de groupe' : 'Message direct'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => {
            Alert.alert(
              "Options",
              "Sélectionnez une action :",
              [
                { text: "Signaler", onPress: async () => {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) return;
                  const { error } = await supabase.from('user_reports').insert({
                    reporter_id: user.id,
                    conversation_id: id,
                    reason: 'Signalement depuis la conversation',
                  });
                  Alert.alert(error ? 'Signalement' : 'Signalement envoyé', error ? 'Impossible de l’enregistrer pour le moment.' : 'C’est noté. Il n’y a pas encore de blocage.');
                } },
                { text: "Annuler", style: "cancel" }
              ]
            );
          }} style={styles.backBtn}>
            <Feather name="more-vertical" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Messages or Empty State */}
        {messages.length === 0 ? (
          <View style={styles.emptyChatContainer}>
            <View style={styles.emptyIconCircle}>
              <Feather name="users" size={32} color="#0069E8" />
            </View>
            <Text style={styles.emptyChatTitle}>
              {type === 'team' ? "Salon d'Équipe" : "Discussion Directe"}
            </Text>
            <Text style={styles.emptyChatSubtitle}>
              {type === 'team'
                ? "Échangez avec l'ensemble des athlètes, partagez les annonces de séances et organisez vos sondages d'équipe."
                : "Envoyez un premier message direct."}
            </Text>
            {user?.role === 'coach' && type === 'team' && (
              <TouchableOpacity
                style={styles.emptyQuickActionBtn}
                onPress={() => setIsCreatingPoll(true)}
                activeOpacity={0.8}
              >
                <Feather name="bar-chart-2" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyQuickActionText}>Lancer un sondage d'équipe</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            inverted
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Input Bar or Poll Sheet */}
        {isCreatingPoll ? (
          <View style={[styles.pollContainer, { paddingBottom: bottomOffset }]}>
            <View style={styles.pollHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.pollIconWrap}>
                  <Feather name="bar-chart-2" size={18} color="#0069E8" />
                </View>
                <Text style={styles.pollTitle}>Nouveau sondage d'équipe</Text>
              </View>
              <TouchableOpacity onPress={() => setIsCreatingPoll(false)} style={styles.pollCloseBtn}>
                <Feather name="x" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.pollInput}
              placeholder="Poser une question à l'équipe..."
              placeholderTextColor="#94A3B8"
              value={pollQuestion}
              onChangeText={setPollQuestion}
            />
            {pollOptions.map((opt, idx) => (
              <TextInput
                key={idx}
                style={styles.pollInput}
                placeholder={`Option ${idx + 1}`}
                placeholderTextColor="#94A3B8"
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
            <TouchableOpacity style={styles.sendPollBtn} onPress={handleSendPoll} activeOpacity={0.8}>
              <Text style={styles.sendPollBtnText}>Envoyer le sondage</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.inputContainer, { paddingBottom: bottomOffset }]}>
            {user?.role === 'coach' && (
              <TouchableOpacity style={styles.attachBtn} onPress={() => setIsCreatingPoll(true)} activeOpacity={0.7}>
                <Feather name="bar-chart-2" size={20} color="#0069E8" />
              </TouchableOpacity>
            )}
            <TextInput
              style={styles.input}
              placeholder="Votre message..."
              placeholderTextColor="#94A3B8"
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            <TouchableOpacity 
              style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]} 
              onPress={handleSend}
              disabled={!inputText.trim()}
              activeOpacity={0.8}
            >
              <Feather name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontWeight: '600',
    fontSize: 18,
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontWeight: '600',
    color: theme.colors.text,
    fontSize: 12,
  },
  senderName: {
    fontWeight: '500',
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
    marginLeft: 4,
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  messageBubbleMe: {
    backgroundColor: theme.colors.accent,
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontWeight: '400',
    fontSize: 15,
  },
  messageTextMe: {
    color: '#fff',
  },
  messageTextOther: {
    color: theme.colors.text,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    alignItems: 'flex-end',
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    color: theme.colors.text,
    fontWeight: '400',
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0069E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
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
    backgroundColor: '#0069E815',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyChatTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptyChatSubtitle: {
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyQuickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0069E8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#0069E8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  emptyQuickActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // Light Theme Poll Sheet
  pollContainer: {
    padding: 18,
    paddingBottom: Platform.OS === 'ios' ? 32 : 18,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
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
    backgroundColor: '#0069E815',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pollTitle: {
    fontWeight: '800',
    fontSize: 16,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  pollCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pollInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0F172A',
    fontWeight: '500',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  sendPollBtn: {
    backgroundColor: '#0069E8',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#0069E8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  sendPollBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
