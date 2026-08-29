import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../src/core/theme';
import { useAssistantStore, ChatMessage } from '../../src/store/coach/assistantStore';

export default function AssistantScreen() {
  const { 
    messages, isTyping, sendMessage, 
    isModelReady, isDownloadingModel, downloadProgress, 
    checkModelExists, downloadModel 
  } = useAssistantStore();
  
  const [inputText, setInputText] = useState('');

  React.useEffect(() => {
    checkModelExists();
  }, []);

  const handleSend = () => {
    if (inputText.trim()) {
      sendMessage(inputText.trim());
      setInputText('');
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';

    return (
      <View style={[styles.messageWrapper, isUser ? styles.messageWrapperUser : styles.messageWrapperAssistant]}>
        
        {/* Avatar de l'assistant */}
        {!isUser && (
          <View style={styles.avatarContainer}>
            <Feather name="cpu" size={20} color={theme.colors.background} />
          </View>
        )}

        <View style={styles.messageContentWrapper}>
          {/* Texte du message */}
          <View style={[styles.messageBubble, isUser ? styles.messageBubbleUser : styles.messageBubbleAssistant]}>
            <Text style={[styles.messageText, isUser ? { color: '#FFF' } : { color: theme.colors.text }]}>
              {item.content}
            </Text>
          </View>

          {/* Cartes Riches (ex: Compétitions) */}
          {item.type === 'competition_card' && item.data && (
            <View style={styles.cardsContainer}>
              {item.data.map((comp: any) => (
                <View key={comp.id} style={[styles.richCard, { backgroundColor: theme.colors.surface }]}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.iconBox, { backgroundColor: theme.colors.accent + '20' }]}>
                      <Feather name="award" size={20} color={theme.colors.accent} />
                    </View>
                    <View style={styles.cardTitleBox}>
                      <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{comp.name}</Text>
                      <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>{comp.events}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.cardBody}>
                    <View style={styles.cardRow}>
                      <Feather name="calendar" size={14} color={theme.colors.textSecondary} />
                      <Text style={[styles.cardRowText, { color: theme.colors.textSecondary }]}>{comp.date}</Text>
                    </View>
                    <View style={styles.cardRow}>
                      <Feather name="map-pin" size={14} color={theme.colors.textSecondary} />
                      <Text style={[styles.cardRowText, { color: theme.colors.textSecondary }]}>{comp.location}</Text>
                    </View>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity style={[styles.cardBtn, { borderColor: theme.colors.border }]} onPress={() => Linking.openURL(comp.url)}>
                      <Text style={[styles.cardBtnText, { color: theme.colors.textSecondary }]}>Lien Web</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.cardBtn, { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }]}>
                      <Text style={[styles.cardBtnText, { color: '#FFF' }]}>Proposer à un athlète</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  // -------------------------
  // Écran de téléchargement
  // -------------------------
  if (!isModelReady) {
    const percentage = Math.round(downloadProgress * 100);
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <View style={styles.downloadCard}>
          <Feather name="cpu" size={60} color={theme.colors.accent} style={{ marginBottom: 20 }} />
          <Text style={[styles.downloadTitle, { color: theme.colors.text }]}>Intelligence Artificielle Locale</Text>
          <Text style={[styles.downloadDesc, { color: theme.colors.textSecondary }]}>
            Pour fonctionner sans internet et protéger vos données de coaching, l'assistant a besoin de télécharger son modèle neuronal (environ 300 Mo).
          </Text>
          
          {isDownloadingModel ? (
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: theme.colors.accent }]} />
              </View>
              <Text style={[styles.progressText, { color: theme.colors.text }]}>Téléchargement en cours... {percentage}%</Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.downloadBtn, { backgroundColor: theme.colors.accent }]}
              onPress={downloadModel}
            >
              <Feather name="download" size={20} color="#FFF" style={{ marginRight: 10 }} />
              <Text style={styles.downloadBtnText}>Télécharger l'Assistant</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // -------------------------
  // Écran de Chat principal
  // -------------------------
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <View style={styles.headerTitleBox}>
          <Feather name="cpu" size={28} color={theme.colors.accent} />
          <View style={{ marginLeft: 12 }}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Coach Copilot</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.success }]}>Connecté à Internet</Text>
          </View>
        </View>
      </View>

      {/* CHAT LIST */}
      <KeyboardAvoidingView 
        style={styles.chatContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          inverted // Le plus récent en bas
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        {/* TYPING INDICATOR */}
        {isTyping && (
          <View style={styles.typingIndicator}>
            <View style={styles.avatarContainer}>
              <Feather name="cpu" size={20} color={theme.colors.background} />
            </View>
            <View style={[styles.messageBubble, styles.messageBubbleAssistant, { paddingHorizontal: 16 }]}>
              <Text style={{ color: theme.colors.textSecondary, fontStyle: 'italic' }}>Recherche en cours...</Text>
            </View>
          </View>
        )}

        {/* INPUT BAR */}
        <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface }]}>
          <TextInput
            style={[styles.input, { color: theme.colors.text }]}
            placeholder="Demandez-moi d'analyser le groupe, ou cherchez une course..."
            placeholderTextColor={theme.colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[styles.sendButton, { backgroundColor: inputText.trim() ? theme.colors.accent : theme.colors.border }]}
            onPress={handleSend}
            disabled={!inputText.trim() || isTyping}
          >
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  chatContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 100, // Espace pour la bottom tab bar
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-end',
  },
  messageWrapperUser: {
    justifyContent: 'flex-end',
  },
  messageWrapperAssistant: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  messageContentWrapper: {
    maxWidth: '85%',
  },
  messageBubble: {
    padding: 16,
    borderRadius: 20,
  },
  messageBubbleUser: {
    backgroundColor: theme.colors.accent,
    borderBottomRightRadius: 4,
  },
  messageBubbleAssistant: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 100, // Espace pour la tab bar
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 40,
    fontSize: 16,
    paddingTop: 10,
    marginRight: 12,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Styles des cartes riches
  cardsContainer: {
    marginTop: 12,
    gap: 12,
  },
  richCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitleBox: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  cardBody: {
    marginBottom: 16,
    gap: 6,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardRowText: {
    fontSize: 14,
    marginLeft: 8,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cardBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  downloadCard: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '85%',
  },
  downloadTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  downloadDesc: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  downloadBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  }
});
