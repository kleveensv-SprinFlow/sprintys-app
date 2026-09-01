import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../src/core/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'sprinty';
  timestamp: Date;
}

export default function CoachChatScreen() {
  const router = useRouter();
  const { athleteId, athleteName } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Initial greeting
    const greeting = athleteName 
      ? `Bonjour Coach ! 👋\n\nJe suis prêt à analyser le dossier complet de **${athleteName}** de manière 100% sécurisée. Que voulez-vous examiner ?\n\n⚡ **Nutrition & Poids**\n📋 **Derniers Check-ins**\n🏋️ **Progression Musculation**`
      : "Bonjour Coach ! 👋\nJe suis Sprinty, votre assistant personnel. Comment puis-je vous aider à gérer votre équipe aujourd'hui ?";
    
    setMessages([
      { id: Date.now().toString(), text: greeting, sender: 'sprinty', timestamp: new Date() }
    ]);
  }, [athleteName]);

  const sendMessage = () => {
    if (!inputText.trim()) return;
    
    const userMsg: Message = { id: Date.now().toString(), text: inputText.trim(), sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    // Mock response from Sprinty
    setTimeout(() => {
      let sprintyReply = `Voici l'analyse demandée pour ${athleteName || 'l\'athlète'} : \n\n🔥 **Point fort :** Constance parfaite cette semaine.\n⚠️ **Attention :** Le sommeil est en baisse (moyenne de 5.5h/nuit sur 3 jours).\n\n💡 *Action recommandée : Réduire le volume d'entraînement de 15% demain.*`;
      
      const replyMsg: Message = { id: (Date.now() + 1).toString(), text: sprintyReply, sender: 'sprinty', timestamp: new Date() };
      setMessages(prev => [...prev, replyMsg]);
    }, 1500);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isSprinty = item.sender === 'sprinty';
    return (
      <View style={[styles.messageBubble, isSprinty ? styles.messageSprinty : styles.messageUser]}>
        {isSprinty && (
          <View style={styles.sprintyAvatar}>
            <Feather name="cpu" size={16} color="#FFF" />
          </View>
        )}
        <View style={[styles.messageContent, isSprinty ? styles.contentSprinty : styles.contentUser]}>
          <Text style={[styles.messageText, isSprinty ? styles.textSprinty : styles.textUser]}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="chevron-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SPRINTY IA (COACH)</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Posez une question sur un athlète..."
            placeholderTextColor={theme.colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
            <Feather name="send" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: '#8B5CF6', // Purple for AI
  },
  chatList: {
    padding: 20,
    paddingBottom: 40,
  },
  messageBubble: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 20,
    maxWidth: '85%',
  },
  messageSprinty: {
    alignSelf: 'flex-start',
  },
  messageUser: {
    alignSelf: 'flex-end',
  },
  sprintyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  messageContent: {
    padding: 16,
    borderRadius: 20,
  },
  contentSprinty: {
    backgroundColor: theme.colors.surfaceLight,
    borderBottomLeftRadius: 4,
  },
  contentUser: {
    backgroundColor: '#8B5CF6',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  textSprinty: {
    color: theme.colors.text,
  },
  textUser: {
    color: '#FFF',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 44,
    maxHeight: 120,
    color: theme.colors.text,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  }
});
