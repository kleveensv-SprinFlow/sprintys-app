import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useBodyStore } from '../../../store/bodyStore';

export const ChecklistManagerCard = () => {
  const { profile, updateProfile } = useBodyStore();
  const [newItem, setNewItem] = useState('');

  const checklist = profile?.competition_checklist || [];

  const handleAddItem = async () => {
    if (!newItem.trim()) return;
    if (!profile?.id) return;

    const newArray = [...checklist, newItem.trim()];
    try {
      await updateProfile(profile.id, { competition_checklist: newArray });
      setNewItem('');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter l\'élément.');
    }
  };

  const handleRemoveItem = async (index: number) => {
    if (!profile?.id) return;

    const newArray = checklist.filter((_, i) => i !== index);
    try {
      await updateProfile(profile.id, { competition_checklist: newArray });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de supprimer l\'élément.');
    }
  };

  return (
    <BlurView intensity={40} tint="default" style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="briefcase-outline" size={20} color="#00E5FF" />
        <Text style={styles.title}>MON SAC DE COMPÉTITION</Text>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="AJOUTER (EX: POINTES, LICENCE...)"
          placeholderTextColor="#555"
          value={newItem}
          onChangeText={setNewItem}
          onSubmitEditing={handleAddItem}
        />
        <TouchableOpacity style={styles.addBtn} onPress={handleAddItem}>
          <Ionicons name="add" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.listContainer}>
        {checklist.length === 0 ? (
          <Text style={styles.emptyText}>TA LISTE EST VIDE</Text>
        ) : (
          checklist.map((item, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.itemText}>{item.toUpperCase()}</Text>
              <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                <Ionicons name="trash-outline" size={18} color="#FF453A" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  title: {
    color: '#00E5FF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 12,
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#00E5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    gap: 10,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  itemText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  emptyText: {
    color: '#555',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 10,
  },
});
