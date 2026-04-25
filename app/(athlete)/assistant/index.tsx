import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { theme } from '../../../src/core/theme';
import { useAssistantStore } from '../../../src/store/useAssistantStore';
import { useAuthStore } from '../../../src/store/authStore';
import { workoutService } from '../../../src/services/workoutService';
import { Feather } from '@expo/vector-icons';
import { Stack } from 'expo-router';

export default function AssistantChat() {
  const [inputText, setInputText] = useState('');
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [userContext, setUserContext] = useState('');

  const {
    messages,
    memories,
    isModelLoaded,
    isDownloading,
    downloadProgress,
    isGenerating,
    loadModel,
    generateResponse,
    confirmAction,
    removeMemory
  } = useAssistantStore();

  const user = useAuthStore(state => state.user);

  useEffect(() => {
    // Load model on mount
    loadModel();

    // Fetch user context
    const loadContext = async () => {
      if (user?.id) {
        try {
          const recent = await workoutService.fetchRecentWorkoutsContext(user.id);
          const upcoming = await workoutService.fetchUpcomingCompetitionsContext(user.id);
          setUserContext(`Entraînements récents:\n${recent}\n\nCompétitions à venir:\n${upcoming}`);
        } catch (error) {
          console.error("Error fetching context for AI", error);
        }
      }
    };

    loadContext();
  }, [user]);

  const handleSend = () => {
    if (!inputText.trim() || isGenerating || !isModelLoaded) return;

    generateResponse(inputText, userContext);
    setInputText('');
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isUser = item.sender === 'user';

    return (
      <View style={[styles.messageWrapper, isUser ? styles.messageWrapperUser : styles.messageWrapperAssistant]}>
        <View style={[styles.messageBubble, isUser ? styles.messageBubbleUser : styles.messageBubbleAssistant]}>
          <Text style={styles.messageText}>{item.text}</Text>

          {item.isAction && item.actionPayload && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => confirmAction(item.id)}
            >
              <Text style={styles.actionButtonText}>Valider cette action</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Custom Header since Tabs layout hides it */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mon Assistant</Text>
        <TouchableOpacity onPress={() => setIsSettingsVisible(true)}>
          <Feather name="settings" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Model Download Progress */}
      {isDownloading && (
        <View style={styles.downloadContainer}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={styles.downloadText}>
            Installation de l'IA locale... {Math.round(downloadProgress * 100)}%
          </Text>
        </View>
      )}

      {/* Chat Area */}
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatContainer}
        inverted={false} // Would need reversal logic if true, keeping false for simplicity
      />

      {/* Generating Indicator */}
      {isGenerating && (
        <View style={styles.typingIndicator}>
          <ActivityIndicator size="small" color={theme.colors.accent} />
          <Text style={styles.typingText}>L'assistant réfléchit...</Text>
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder={isModelLoaded ? "Posez une question..." : "Chargement..."}
          placeholderTextColor={theme.colors.textMuted}
          editable={isModelLoaded && !isGenerating}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isGenerating || !isModelLoaded) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || isGenerating || !isModelLoaded}
        >
          <Feather name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Settings / Memory Modal */}
      <Modal
        visible={isSettingsVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsSettingsVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ce que je sais de vous</Text>
            <TouchableOpacity onPress={() => setIsSettingsVisible(false)}>
              <Feather name="x" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {memories.length === 0 ? (
            <Text style={styles.emptyMemoryText}>L'assistant n'a encore rien mémorisé.</Text>
          ) : (
            <FlatList
              data={memories}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={styles.memoryItem}>
                  <Text style={styles.memoryText}>{item.content}</Text>
                  <TouchableOpacity onPress={() => removeMemory(item.id)}>
                    <Feather name="trash-2" size={20} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 15,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  downloadContainer: {
    padding: 10,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadText: {
    color: theme.colors.text,
    marginLeft: 10,
    fontSize: 12,
  },
  chatContainer: {
    padding: 15,
    paddingBottom: 20,
  },
  messageWrapper: {
    marginBottom: 15,
    flexDirection: 'row',
  },
  messageWrapperUser: {
    justifyContent: 'flex-end',
  },
  messageWrapperAssistant: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
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
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 22,
  },
  actionButton: {
    marginTop: 10,
    backgroundColor: theme.colors.success || '#4ade80',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  typingText: {
    color: theme.colors.textMuted,
    marginLeft: 10,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    marginBottom: 2,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyMemoryText: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 20,
  },
  memoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  memoryText: {
    color: theme.colors.text,
    flex: 1,
    marginRight: 10,
  }
});
