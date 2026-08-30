import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../core/theme';
import { useAuthStore } from '../../store/authStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const EditProfileModal = ({ visible, onClose }: Props) => {
  const theme = useTheme();
  const { user, updateProfile } = useAuthStore();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user && visible) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setHeight(user.height ? String(user.height) : '');
      setWeight(user.weight ? String(user.weight) : '');
    }
  }, [user, visible]);

  const handleSave = async () => {
    setIsSaving(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    
    await updateProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      name: fullName,
      height: height ? Number(height) : undefined,
      weight: weight ? Number(weight) : undefined,
    });
    
    setIsSaving(false);
    onClose();
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
              <Text style={[styles.title, { color: theme.colors.text }]}>Mes informations</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Prénom</Text>
                <TextInput
                  style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Jean"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Nom</Text>
                <TextInput
                  style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Dupont"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Taille (cm)</Text>
                  <TextInput
                    style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                    value={height}
                    onChangeText={setHeight}
                    placeholder="180"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ width: 16 }} />
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Poids (kg)</Text>
                  <TextInput
                    style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                    value={weight}
                    onChangeText={setWeight}
                    placeholder="75"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.saveBtn, { backgroundColor: theme.colors.accent }]} 
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Enregistrer les modifications</Text>
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
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
