import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../src/core/theme';
import { buildSystemPrompt } from '../../src/services/aiContextBuilder';
import AILoadingIndicator from '../../src/components/AILoadingIndicator';

export default function MessageScreen() {
  const [messages, setMessages] = useState([
    { role: 'system', content: buildSystemPrompt() }, 
    { role: 'assistant', content: "Salut ! Je suis Sprinty, ton coach IA personnel. Je suis prêt à t'accompagner. Que veux-tu faire aujourd'hui ?" }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);

  const sendMessage = async () => {
    if (!inputText.trim() || isTyping) return;

    const userText = inputText.trim();
    setInputText('');
    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      const { fetchOpenAIResponse } = require('../../src/services/aiService');
      const response = await fetchOpenAIResponse(
        newMessages.slice(1).map(m => ({ role: m.role, content: m.content })),
        messages[0].content
      );
      
      setMessages(prev => [...prev, { role: 'assistant', content: response.trim() }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Désolé, problème de connexion avec l'API." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Assistant & Coach</Text>
        <Text style={styles.subtitle}>Prêt ⚡</Text>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          style={styles.chatArea} 
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          ref={scrollViewRef}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.filter(m => m.role !== 'system').map((msg, index) => (
            <View key={index} style={msg.role === 'user' ? styles.messageBubbleRight : styles.messageBubbleLeft}>
              <Text style={[styles.messageText, msg.role === 'user' && { color: '#FFF' }]}>
                {msg.content}
              </Text>
          ))}
          {isTyping && <AILoadingIndicator />}
        </ScrollView>

        <View style={styles.inputArea}>
          <TouchableOpacity style={styles.attachBtn}>
            <Feather name="plus" size={24} color={theme.colors.textMuted} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Écris un message..."
            placeholderTextColor={theme.colors.textMuted}
            multiline
            value={inputText}
            onChangeText={setInputText}
            editable={!isTyping}
          />
          <TouchableOpacity style={[styles.sendBtn, (!inputText.trim()) && { opacity: 0.5 }]} onPress={sendMessage} disabled={isTyping || !inputText.trim()}>
            <Feather name="send" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.border, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  subtitle: { fontSize: 12, color: theme.colors.accent, marginTop: 4 },
  chatArea: { flex: 1 },
  messageBubbleLeft: {
    backgroundColor: theme.colors.surface, padding: 16, borderRadius: 20,
    borderBottomLeftRadius: 4, maxWidth: '85%', alignSelf: 'flex-start',
    borderWidth: 1, borderColor: theme.colors.border, marginBottom: 12,
  },
  messageBubbleRight: {
    backgroundColor: theme.colors.accent, padding: 16, borderRadius: 20,
    borderBottomRightRadius: 4, maxWidth: '85%', alignSelf: 'flex-end',
    marginBottom: 12,
  },
  messageText: { color: theme.colors.text, fontSize: 15, lineHeight: 22 },
  inputArea: {
    flexDirection: 'row', padding: 16, alignItems: 'flex-end',
    backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border
  },
  attachBtn: { padding: 10, marginRight: 4, marginBottom: 2 },
  input: {
    flex: 1, backgroundColor: theme.colors.background, color: theme.colors.text,
    borderRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
    maxHeight: 100, minHeight: 40, borderWidth: 1, borderColor: theme.colors.border
  },
  sendBtn: {
    backgroundColor: theme.colors.accent, width: 44, height: 44,
    borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginLeft: 12, marginBottom: 2
  }
});
