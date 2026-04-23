import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

interface DebriefModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (place: string, mark: string, feeling: string) => void;
}

export const DebriefModal = ({ visible, onClose, onSubmit }: DebriefModalProps) => {
  const [place, setPlace] = useState('');
  const [mark, setMark] = useState('');
  const [feeling, setFeeling] = useState('🔥');

  const handleSubmit = () => {
    onSubmit(place, mark, feeling);
    setPlace('');
    setMark('');
    setFeeling('🔥');
  };

  const feelings = [
    { emoji: '🔥', label: 'SUPER' },
    { emoji: '😐', label: 'MOYEN' },
    { emoji: '📉', label: 'DIFFICILE' },
  ];

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <BlurView intensity={100} tint="dark" style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <BlurView intensity={40} tint="default" style={styles.modalCard}>
            <View style={styles.header}>
              <Text style={styles.title}>DÉBRIEFING</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>PLACE / CLASSEMENT</Text>
              <TextInput
                style={styles.input}
                placeholder="EX: 1"
                placeholderTextColor="#555"
                value={place}
                onChangeText={setPlace}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>CHRONO / MARQUE</Text>
              <TextInput
                style={styles.input}
                placeholder="EX: 10.55"
                placeholderTextColor="#555"
                value={mark}
                onChangeText={setMark}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>RESSENTI</Text>
              <View style={styles.feelingRow}>
                {feelings.map((f) => (
                  <TouchableOpacity
                    key={f.emoji}
                    style={[
                      styles.feelingBtn,
                      feeling === f.emoji && styles.feelingBtnActive,
                    ]}
                    onPress={() => setFeeling(f.emoji)}
                  >
                    <Text style={styles.emoji}>{f.emoji}</Text>
                    <Text style={styles.emojiLabel}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={styles.submitBtnText}>ENREGISTRER</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>ANNULER</Text>
            </TouchableOpacity>
          </BlurView>
        </KeyboardAvoidingView>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  container: {
    width: '90%',
    maxWidth: 400,
  },
  modalCard: {
    borderRadius: 32,
    padding: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#00E5FF',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 14,
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  feelingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  feelingBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  feelingBtnActive: {
    borderColor: '#00E5FF',
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
  },
  emoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  emojiLabel: {
    color: '#8E8E93',
    fontSize: 8,
    fontWeight: '900',
  },
  submitBtn: {
    backgroundColor: '#00E5FF',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 12,
  },
  submitBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cancelBtn: {
    padding: 16,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '700',
  },
});
