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
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Historique Sprinty</Text>
              <Text style={styles.subtitle}>Retrouve toutes tes sessions d'assistance</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={22} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.newChatBtn} onPress={handleNewChat} activeOpacity={0.8}>
            <Feather name="plus" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.newChatText}>Nouvelle conversation</Text>
          </TouchableOpacity>

          <FlatList
            data={sortedConvs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.convCard, item.isPinned && styles.pinnedCard]}
                onPress={() => handleSelect(item.id)}
                onLongPress={() => handleLongPress(item)}
                delayLongPress={300}
                activeOpacity={0.7}
              >
                <View style={styles.convHeader}>
                  <View style={[styles.convIconBox, item.isPinned && styles.pinnedIconBox]}>
                    <Feather name="message-square" size={16} color={item.isPinned ? '#0069E8' : '#64748B'} />
                  </View>
                  <Text style={styles.convTitle} numberOfLines={1}>{item.title}</Text>
                  {item.isPinned && (
                    <View style={styles.pinBadge}>
                      <Feather name="map-pin" size={12} color="#0069E8" />
                    </View>
                  )}
                </View>
                <Text style={styles.dateText}>
                  {new Date(item.updatedAt).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    minHeight: '55%',
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0069E8',
    marginHorizontal: 18,
    marginTop: 16,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#0069E8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  newChatText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  convCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pinnedCard: {
    backgroundColor: '#F0F7FF',
    borderColor: '#BAE6FD',
  },
  convHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  convIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinnedIconBox: {
    backgroundColor: '#0069E815',
  },
  convTitle: {
    flex: 1,
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
    marginHorizontal: 10,
    letterSpacing: -0.2,
  },
  pinBadge: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#0069E815',
  },
  dateText: {
    color: '#94A3B8',
    fontSize: 12,
    marginLeft: 38,
    fontWeight: '500',
  },
});
