import React from 'react';
import { View, Text, StyleSheet, Modal, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../core/theme';
import { glassSurface } from '../core/glass';
import { useSprintyChatStore, Conversation } from '../store/sprintyChatStore';
import { FeedbackHost } from '../shared/feedback/FeedbackHost';
import { appAlert, confirmAsync, toast } from '../shared/feedback/appAlert';
import { PressableScale } from '../shared/components/PressableScale';
import { IconButton } from '../shared/components/IconButton';
import { EmptyState } from '../shared/components/EmptyState';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const MAX_PINNED = 3;
const BLUE_TINT = 'rgba(0, 105, 232, 0.1)';

/** "À l’instant", "Il y a 5 min", "Hier", "Il y a 3 j", then a short date. */
const formatRelative = (timestamp: number): string => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMin = Math.floor((now.getTime() - timestamp) / 60000);

  if (diffMin < 1) return 'À l’instant';
  if (diffMin < 60) return `Il y a ${diffMin} min`;

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  if (dayDiff <= 0) return `Il y a ${Math.floor(diffMin / 60)} h`;
  if (dayDiff === 1) return `Hier, ${time}`;
  if (dayDiff < 7) return `Il y a ${dayDiff} j`;
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });
};

export default function SprintyHistoryModal({ visible, onClose }: Props) {
  const { conversations, loadConversation, togglePinConversation, deleteConversation, startNewConversation } = useSprintyChatStore();

  const handleSelect = (id: string) => {
    loadConversation(id);
    onClose();
  };

  const handleDelete = async (conv: Conversation) => {
    const confirmed = await confirmAsync({
      title: 'Supprimer cette conversation ?',
      message: `« ${conv.title} » sera définitivement supprimée.`,
      confirmText: 'Supprimer',
      destructive: true,
      icon: 'trash-2',
    });
    if (!confirmed) return;
    deleteConversation(conv.id);
    toast('success', 'Conversation supprimée.');
  };

  const handleOptions = (conv: Conversation) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // haptics unavailable (web)
    }
    const pinnedCount = conversations.filter(c => c.isPinned).length;
    const canPin = conv.isPinned || pinnedCount < MAX_PINNED;

    appAlert(
      'Options de la conversation',
      conv.title,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: conv.isPinned ? 'Désépingler' : (canPin ? 'Épingler' : `Épinglage max (${MAX_PINNED}) atteint`),
          onPress: () => {
            if (canPin) togglePinConversation(conv.id);
          },
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => handleDelete(conv),
        },
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

  const renderItem = ({ item }: { item: Conversation }) => (
    <PressableScale
      haptic="selection"
      activeScale={0.98}
      onPress={() => handleSelect(item.id)}
      onLongPress={() => handleOptions(item)}
      delayLongPress={300}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}${item.isPinned ? ', épinglée' : ''}`}
      accessibilityHint="Appui long pour épingler ou supprimer"
      style={[styles.convCard, item.isPinned && styles.pinnedCard]}
    >
      <View style={[styles.convIconBox, item.isPinned && styles.pinnedIconBox]}>
        <Feather
          name={item.isPinned ? 'bookmark' : 'message-square'}
          size={16}
          color={item.isPinned ? theme.colors.sprintyBlue : theme.colors.textSecondary}
        />
      </View>
      <View style={styles.convBody}>
        <Text style={styles.convTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.dateText}>
          {item.isPinned ? 'Épinglée · ' : ''}
          {formatRelative(item.updatedAt)}
        </Text>
      </View>
      <IconButton
        icon="more-horizontal"
        tone="plain"
        size={34}
        onPress={() => handleOptions(item)}
        accessibilityLabel={`Options de « ${item.title} »`}
      />
    </PressableScale>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <FeedbackHost />
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.grabber} />

          <View style={styles.header}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.title}>Historique</Text>
              <Text style={styles.subtitle}>Retrouve tes échanges avec Sprinty</Text>
            </View>
            <IconButton icon="x" onPress={onClose} accessibilityLabel="Fermer" />
          </View>

          <PressableScale
            haptic="light"
            onPress={handleNewChat}
            accessibilityRole="button"
            style={styles.newChatBtn}
          >
            <Feather name="plus" size={18} color="#FFFFFF" />
            <Text style={styles.newChatText}>Nouvelle conversation</Text>
          </PressableScale>

          <FlatList
            data={sortedConvs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={renderItem}
            ListHeaderComponent={
              sortedConvs.length > 0 ? <Text style={styles.sectionLabel}>Conversations</Text> : null
            }
            ListEmptyComponent={
              <EmptyState
                icon="message-circle"
                title="Aucune conversation"
                message="Pose ta première question à Sprinty : elle apparaîtra ici."
                compact
              />
            }
            ListFooterComponent={
              sortedConvs.length > 0 ? (
                <Text style={styles.footerHint}>Appui long sur une conversation pour l’épingler ou la supprimer.</Text>
              ) : null
            }
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
    backgroundColor: theme.colors.backdrop,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderCurve: 'continuous',
    maxHeight: '85%',
    minHeight: '55%',
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.15)',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.sprintyBlue,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    height: 52,
    borderRadius: 16,
    borderCurve: 'continuous',
  },
  newChatText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    flexGrow: 1,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: theme.colors.textSecondary,
    marginTop: 8,
    marginBottom: 8,
    marginLeft: 4,
  },
  convCard: {
    ...glassSurface,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderCurve: 'continuous',
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 6,
    marginBottom: 8,
    minHeight: 64,
  },
  pinnedCard: {
    borderColor: 'rgba(0, 105, 232, 0.22)',
  },
  convIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.glassFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinnedIconBox: {
    backgroundColor: BLUE_TINT,
  },
  convBody: {
    flex: 1,
    marginHorizontal: 12,
  },
  convTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  dateText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  footerHint: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 12,
  },
});
