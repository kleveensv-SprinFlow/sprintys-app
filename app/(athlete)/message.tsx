import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../src/core/theme';
import * as FileSystem from 'expo-file-system';
import { initLlama, LlamaContext } from 'llama.rn';
import { buildSystemPrompt } from '../../src/services/aiContextBuilder';

const MODEL_URL = 'https://huggingface.co/Qwen/Qwen1.5-0.5B-Chat-GGUF/resolve/main/qwen1_5-0_5b-chat-q4_k_m.gguf?download=true';
const MODEL_NAME = 'qwen0.5b-chat.gguf';
const MODEL_PATH = `${FileSystem.documentDirectory}${MODEL_NAME}`;

export default function MessageScreen() {
  const [messages, setMessages] = useState([{ role: 'system', content: '' }, { role: 'assistant', content: "Salut ! Je suis Sprinty. Je suis en train de m'échauffer..." }]);
  const [inputText, setInputText] = useState('');
  
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  const llamaContext = useRef<LlamaContext | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    setupModel();
    return () => {
      if (llamaContext.current) {
        llamaContext.current.release();
      }
    };
  }, []);

  const setupModel = async () => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(MODEL_PATH);
      
      if (!fileInfo.exists) {
        setIsDownloading(true);
        const downloadResumable = FileSystem.createDownloadResumable(
          MODEL_URL,
          MODEL_PATH,
          {},
          (downloadProgress) => {
            const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
            setDownloadProgress(progress);
          }
        );
        await downloadResumable.downloadAsync();
        setIsDownloading(false);
      }

      // Initialize LLM
      llamaContext.current = await initLlama({
        model: MODEL_PATH,
        use_mlock: true,
        n_ctx: 2048, // context window
      });

      // Mettre à jour le message système avec le contexte réel
      const systemPrompt = buildSystemPrompt();
      setMessages([
        { role: 'system', content: systemPrompt },
        { role: 'assistant', content: "Salut ! Je suis Sprinty, ton coach IA personnel. Je suis prêt à t'accompagner. Que veux-tu faire aujourd'hui ?" }
      ]);
      setIsModelReady(true);

    } catch (err) {
      console.error("Erreur d'initialisation de l'IA:", err);
      setIsDownloading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !isModelReady || isTyping) return;

    const userText = inputText.trim();
    setInputText('');
    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      // Format prompt for ChatML (Qwen format)
      let prompt = '';
      newMessages.forEach(msg => {
        prompt += `<|im_start|>${msg.role}\n${msg.content}<|im_end|>\n`;
      });
      prompt += `<|im_start|>assistant\n`;

      let assistantResponse = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '...' }]);

      // Generate response stream
      await llamaContext.current?.completion({ prompt, n_predict: 200 }, (result) => {
        assistantResponse += result.token;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1].content = assistantResponse;
          return updated;
        });
      });

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Désolé, j\'ai eu un problème de réseau neuronal.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Assistant & Coach</Text>
        <Text style={styles.subtitle}>{isModelReady ? 'IA On-Device (Qwen) Prête ⚡' : 'Chargement...'}</Text>
      </View>

      {isDownloading && (
        <View style={styles.downloadContainer}>
          <ActivityIndicator color={theme.colors.accent} size="large" />
          <Text style={styles.downloadText}>Téléchargement de l'IA locale...</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${downloadProgress * 100}%` }]} />
          </View>
          <Text style={styles.progressValue}>{Math.round(downloadProgress * 100)}% (350 Mo)</Text>
          <Text style={styles.downloadDesc}>Ceci n'arrive qu'une seule fois. L'IA fonctionnera ensuite 100% hors-ligne.</Text>
        </View>
      )}

      <ScrollView 
        style={styles.chatArea} 
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        ref={scrollViewRef}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {!isDownloading && messages.filter(m => m.role !== 'system').map((msg, index) => (
          <View key={index} style={msg.role === 'user' ? styles.messageBubbleRight : styles.messageBubbleLeft}>
            <Text style={[styles.messageText, msg.role === 'user' && { color: '#FFF' }]}>
              {msg.content}
            </Text>
          </View>
        ))}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.inputArea}>
          <TouchableOpacity style={styles.attachBtn} disabled={!isModelReady}>
            <Feather name="plus" size={24} color={isModelReady ? theme.colors.textMuted : theme.colors.border} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder={isModelReady ? "Écris un message..." : "Initialisation IA..."}
            placeholderTextColor={theme.colors.textMuted}
            multiline
            value={inputText}
            onChangeText={setInputText}
            editable={isModelReady && !isTyping}
          />
          <TouchableOpacity style={[styles.sendBtn, (!isModelReady || !inputText.trim()) && { opacity: 0.5 }]} onPress={sendMessage} disabled={!isModelReady || isTyping}>
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
  },
  downloadContainer: {
    padding: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface,
    margin: 20, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border
  },
  downloadText: { color: theme.colors.text, fontSize: 16, fontWeight: 'bold', marginTop: 16, marginBottom: 12 },
  progressBarBg: { width: '100%', height: 8, backgroundColor: theme.colors.background, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: theme.colors.accent },
  progressValue: { color: theme.colors.accent, fontWeight: 'bold', marginTop: 8 },
  downloadDesc: { color: theme.colors.textSecondary, textAlign: 'center', fontSize: 12, marginTop: 16 }
});
