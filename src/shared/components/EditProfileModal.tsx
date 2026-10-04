import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../core/theme';
import { useAuthStore } from '../../store/authStore';
import { Input } from './Input';

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
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user && visible) {
      setFirstName(user.firstName || user.name?.split(' ')[0] || '');
      setLastName(user.lastName || (user.name?.includes(' ') ? user.name.split(' ').slice(1).join(' ') : ''));
      setHeight(user.height ? String(user.height) : '');
    }
  }, [user, visible]);

  const handleSave = async () => {
    setIsSaving(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    
    await updateProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      name: fullName || 'Athlète',
      height: height ? Number(height) : null,
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
              
              <Input
                label="Prénom"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Prénom"
              />

              <Input
                label="Nom"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Nom"
              />

              {user?.role === 'athlete' ? (
                <Input
                  label="Taille (cm)"
                  value={height}
                  onChangeText={setHeight}
                  placeholder="Ex: 180"
                  keyboardType="numeric"
                />
              ) : (
                <View style={styles.coachRoleBadgeRow}>
                  <View style={styles.coachRoleIconBox}>
                    <Feather name="shield" size={15} color="#0069E8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.coachRoleLabel}>Rôle du compte</Text>
                    <Text style={styles.coachRoleValue}>Entraîneur / Coach</Text>
                  </View>
                </View>
              )}

              <TouchableOpacity 
                style={[styles.saveBtn, { backgroundColor: '#0069E8' }]} 
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
  },
  coachRoleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  coachRoleIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0069E815',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachRoleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369A1',
  },
  coachRoleValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
});
