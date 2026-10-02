import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../core/theme';
import { useSprintyChatStore, Conversation } from '../store/sprintyChatStore';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function SprintyHistoryModal({ visible, onClose }: Props) {
  const { conversations, loadConversation, togglePinConversation, deleteConversation, renameConversation, startNewConversation } = useSprintyChatStore();

  const handleSelect = (id: string) => {
    loadConversation(id);
    onClose();
  };

  const handleLongPress = (conv: Conversation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const pinnedCount = conversations.filter(c => c.isPinned).length;
    const canPin = conv.isPinned || pinnedCount < 3;
    
    Alert.alert(
      "Options de la conversation",
      conv.title,
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: conv.isPinned ? "Désépingler" : (canPin ? "Épingler" : "Épinglage max (3) atteint"), 
          onPress: () => {
            if (canPin) togglePinConversation(conv.id);
          }
        },
        { 
          text: "Supprimer", 
          style: "destructive",
          onPress: () => deleteConversation(conv.id) 
        }
      ]
    );
  };

  const handleNewChat = () => {
    startNewConversation();
    onClose();
  };

  const sortedConvs = [...conversations].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.updatedAt - a.updatedAt;
  });

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />
        <LinearGradient
          colors={['rgba(31, 14, 56, 0.9)', 'rgba(9, 9, 13, 0.95)']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.header}>
          <Text style={styles.title}>Historique Sprinty</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.newChatBtn} onPress={handleNewChat}>
          <Feather name="plus" size={20} color="#09090D" style={{ marginRight: 8 }} />
          <Text style={styles.newChatText}>Nouvelle conversation</Text>
        </TouchableOpacity>

        <FlatList
          data={sortedConvs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.convCard, item.isPinned && styles.pinnedCard]}
              onPress={() => handleSelect(item.id)}
              onLongPress={() => handleLongPress(item)}
              delayLongPress={300}
            >
              <View style={styles.convHeader}>
                <Feather name="message-square" size={18} color={item.isPinned ? '#00FFFF' : 'rgba(255,255,255,0.6)'} />
                <Text style={styles.convTitle} numberOfLines={1}>{item.title}</Text>
                {item.isPinned && <Feather name="map-pin" size={14} color="#00FFFF" />}
              </View>
              <Text style={styles.dateText}>
                {new Date(item.updatedAt).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  closeBtn: { padding: 8 },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00FFFF',
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 24,
    marginBottom: 16,
  },
  newChatText: {
    color: '#09090D',
    fontWeight: '700',
    fontSize: 16,
  },
  convCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pinnedCard: {
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
  convHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  convTitle: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 10,
  },
  dateText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginLeft: 28,
  }
});
