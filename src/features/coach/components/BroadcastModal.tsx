import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { useCoachStore } from '../../../store/coach/coachStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const BroadcastModal = ({ visible, onClose }: Props) => {
  const theme = useTheme();
  const { teamMembers, subgroups } = useCoachStore();
  
  const [target, setTarget] = useState<'all' | 'subgroup' | 'athlete'>('all');
  const [selectedSubgroup, setSelectedSubgroup] = useState<string | null>(null);
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  
  const [isSending, setIsSending] = useState(false);

  const handleSend = () => {
    if (!message.trim()) return;
    setIsSending(true);
    
    // Simulation d'un envoi de Push Notification (Expo Notifications)
    setTimeout(() => {
      setIsSending(false);
      setMessage('');
      Alert.alert("Succès", "L'annonce a été envoyée aux athlètes !");
      onClose();
    }, 1500);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <View style={[styles.content, { backgroundColor: theme.colors.surface }]}>
            
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Feather name="x" size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="mic" size={18} color={theme.colors.accent} />
                <Text style={[styles.title, { color: theme.colors.text }]}>Faire une annonce</Text>
              </View>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Destinataires :</Text>
              <View style={styles.targetRow}>
                <TouchableOpacity 
                  style={[styles.targetBtn, target === 'all' && { borderColor: theme.colors.accent, backgroundColor: theme.colors.accent + '15' }]} 
                  onPress={() => setTarget('all')}
                >
                  <Text style={[styles.targetText, target === 'all' && { color: theme.colors.accent, fontWeight: 'bold' }]}>Toute l'équipe</Text>
                </TouchableOpacity>

                {subgroups.length > 0 && (
                  <TouchableOpacity 
                    style={[styles.targetBtn, target === 'subgroup' && { borderColor: theme.colors.accent, backgroundColor: theme.colors.accent + '15' }]} 
                    onPress={() => setTarget('subgroup')}
                  >
                    <Text style={[styles.targetText, target === 'subgroup' && { color: theme.colors.accent, fontWeight: 'bold' }]}>Sous-groupe</Text>
                  </TouchableOpacity>
                )}
              </View>

              {target === 'subgroup' && (
                <View style={styles.subgroupSelector}>
                  {subgroups.map(sg => (
                    <TouchableOpacity 
                      key={sg.id}
                      style={[styles.sgOption, selectedSubgroup === sg.id && { backgroundColor: theme.colors.accent }]}
                      onPress={() => setSelectedSubgroup(sg.id)}
                    >
                      <Text style={[styles.sgOptionText, selectedSubgroup === sg.id && { color: '#FFF' }]}>{sg.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: 24 }]}>Message :</Text>
              <TextInput
                style={[styles.inputArea, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceLight }]}
                value={message}
                onChangeText={setMessage}
                placeholder="Ex: L'entraînement est décalé à 18h30 à cause de la pluie."
                placeholderTextColor={theme.colors.textMuted}
                multiline
                textAlignVertical="top"
              />

              <TouchableOpacity 
                style={[styles.sendBtn, { backgroundColor: theme.colors.accent, opacity: message.trim() ? 1 : 0.5 }]} 
                onPress={handleSend}
                disabled={isSending || !message.trim()}
              >
                {isSending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.sendBtnText}>Envoyer la notification push</Text>
                )}
              </TouchableOpacity>

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  closeBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center'
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  targetRow: {
    flexDirection: 'row',
    gap: 12,
  },
  targetBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  targetText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  subgroupSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  sgOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sgOptionText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  inputArea: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    height: 120,
  },
  sendBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  sendBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
