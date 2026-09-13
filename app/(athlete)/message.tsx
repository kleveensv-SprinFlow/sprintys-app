import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Keyboard, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/core/theme';
import { buildSystemPrompt } from '../../src/services/aiContextBuilder';
import AILoadingIndicator from '../../src/components/AILoadingIndicator';
import * as Haptics from 'expo-haptics';

export default function MessageScreen() {
  const [messages, setMessages] = useState([
    { role: 'system', content: buildSystemPrompt() }, 
    { role: 'assistant', content: "Salut ! Je suis Sprinty, ton coach IA personnel. Je suis prêt à t'accompagner. Que veux-tu faire aujourd'hui ?" }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  const sendMessage = async () => {
    if (!inputText.trim() || isTyping) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userText = inputText.trim();
    setInputText('');
    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setIsTyping(true);

    // Scroll to bottom immediately when user sends
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const { fetchOpenAIResponse } = require('../../src/services/aiService');
      const response = await fetchOpenAIResponse(
        newMessages.slice(1).map(m => ({ role: m.role, content: m.content })),
        messages[0].content
      );
      
      setMessages(prev => [...prev, { role: 'assistant', content: response.trim() }]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Désolé, j'ai rencontré un problème de connexion avec le serveur." }]);
    } finally {
      setIsTyping(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarEmoji}>⚡</Text>
          </View>
          <View>
            <Text style={styles.title}>Sprinty IA</Text>
            <Text style={styles.subtitle}>En ligne</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerBtn}>
          <Feather name="more-vertical" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardAvoid} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.chatArea} 
          contentContainerStyle={styles.chatContent}
          ref={scrollViewRef}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        >
          {messages.filter(m => m.role !== 'system').map((msg, index) => (
            <View key={index} style={msg.role === 'user' ? styles.messageRowRight : styles.messageRowLeft}>
              {msg.role === 'assistant' && (
                <View style={styles.chatAvatar}>
                  <Text style={styles.chatAvatarEmoji}>⚡</Text>
                </View>
              )}
              <View style={msg.role === 'user' ? styles.messageBubbleRight : styles.messageBubbleLeft}>
                <Text style={[styles.messageText, msg.role === 'user' && { color: '#FFF' }]}>
                  {msg.content}
                </Text>
              </View>
            </View>
          ))}
          {isTyping && (
            <View style={styles.messageRowLeft}>
              <View style={styles.chatAvatar}>
                <Text style={styles.chatAvatarEmoji}>⚡</Text>
              </View>
              <View style={[styles.messageBubbleLeft, { paddingHorizontal: 16, paddingVertical: 12 }]}>
                <AILoadingIndicator />
              </View>
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputContainer, { paddingBottom: Math.max(16, keyboardHeight ? 16 : 30) }]}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity style={styles.attachBtn}>
              <Feather name="plus" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Message à Sprinty..."
              placeholderTextColor={theme.colors.textMuted}
              multiline
              value={inputText}
              onChangeText={setInputText}
              editable={!isTyping}
            />
            <TouchableOpacity 
              style={[styles.sendBtn, (!inputText.trim()) && { opacity: 0.5, backgroundColor: theme.colors.surface }]} 
              onPress={sendMessage} 
              disabled={isTyping || !inputText.trim()}
            >
              <Ionicons name="send" size={18} color={inputText.trim() ? "#FFF" : theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20, 
    paddingTop: 10, 
    paddingBottom: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    zIndex: 10
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarEmoji: {
    fontSize: 20,
  },
  title: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  subtitle: { fontSize: 12, color: theme.colors.success, marginTop: 2, fontWeight: '500' },
  headerBtn: {
    padding: 8,
  },
  keyboardAvoid: { flex: 1 },
  chatArea: { flex: 1 },
  chatContent: { padding: 20, paddingBottom: 10 },
  messageRowLeft: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
    maxWidth: '90%',
  },
  messageRowRight: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
    width: '100%',
  },
  chatAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  chatAvatarEmoji: {
    fontSize: 14,
  },
  messageBubbleLeft: {
    backgroundColor: theme.colors.surface, 
    padding: 14, 
    borderRadius: 20,
    borderBottomLeftRadius: 4, 
    borderWidth: 1, 
    borderColor: theme.colors.border,
  },
  messageBubbleRight: {
    backgroundColor: theme.colors.accent, 
    padding: 14, 
    borderRadius: 20,
    borderBottomRightRadius: 4, 
    maxWidth: '85%',
  },
  messageText: { color: theme.colors.text, fontSize: 16, lineHeight: 24 },
  inputContainer: {
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  attachBtn: { 
    padding: 12, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1, 
    color: theme.colors.text,
    fontSize: 16,
    paddingTop: 12, 
    paddingBottom: 12,
    paddingHorizontal: 8,
    maxHeight: 120, 
    minHeight: 40,
  },
  sendBtn: {
    backgroundColor: theme.colors.accent, 
    width: 38, 
    height: 38,
    borderRadius: 19, 
    alignItems: 'center', 
    justifyContent: 'center',
    marginRight: 4,
    marginBottom: 4,
  }
});
