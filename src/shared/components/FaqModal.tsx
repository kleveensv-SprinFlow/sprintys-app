import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../core/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FaqItem {
  id: string;
  category: 'general' | 'planning' | 'team';
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: '1',
    category: 'general',
    question: 'Comment contacter le support ?',
    answer: 'Tu peux joindre notre équipe à tout moment par email à support@sprintflow.app. Nous répondons généralement en moins de 24h ouvrées.',
  },
  {
    id: '2',
    category: 'planning',
    question: 'Comment définir une phase d\'entraînement ?',
    answer: 'Depuis l\'onglet Calendrier, touche le bouton "+ Phase" en haut à droite ou clique sur "Définir une phase d\'entraînement". Choisis le nom (ex: Prépa physique, Affûtage), les dates et la couleur associée.',
  },
  {
    id: '3',
    category: 'planning',
    question: 'Comment fonctionnent les conditions météo ?',
    answer: 'Sprintflow analyse les prévisions de vent (vitesse, rafales, sens favorable ou défavorable à la ligne droite), ainsi que le risque de pluie pour t\'indiquer l\'état de la piste.',
  },
  {
    id: '4',
    category: 'team',
    question: 'Comment inviter un athlète dans mon équipe ?',
    answer: 'Dans l\'onglet Équipe, utilise le bouton d\'invitation pour partager le code de ton groupe ou envoyer un lien d\'accès sécurisé à tes athlètes.',
  },
  {
    id: '5',
    category: 'team',
    question: 'Puis-je créer des sous-groupes de niveau ou discipline ?',
    answer: 'Oui ! Tu peux segmenter ton équipe en sous-groupes (ex: 100m/200m, Haies, Relais) pour planifier des séances spécifiques et adapter les charges de travail.',
  },
  {
    id: '6',
    category: 'general',
    question: 'Où sont stockées mes données personnelles et de santé ?',
    answer: 'Tes données sont hébergées chez Supabase. Tu peux exporter une copie depuis les réglages, et supprimer ton compte. Les mentions dans les réglages disent ce qui part chez l’assistant, et ce qui ne l’est pas encore (l’éditeur n’est pas une société).',
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const FaqModal = ({ visible, onClose }: Props) => {
  const theme = useTheme();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@sprintflow.app?subject=Question%20Support%20Sprintflow');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: '#FFFFFF' }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={22} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.colors.text }]}>Centre d'aide & FAQ</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Subtitle banner */}
          <View style={styles.bannerContainer}>
            <View style={styles.bannerIconBox}>
              <Feather name="help-circle" size={18} color="#0069E8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Questions fréquentes</Text>
              <Text style={styles.bannerSubtitle}>Trouve rapidement les réponses aux usages clés de Sprintflow.</Text>
            </View>
          </View>

          {/* List of FAQ items */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {FAQ_ITEMS.map((item) => {
              const isExpanded = expandedId === item.id;
              return (
                <View key={item.id} style={styles.faqCard}>
                  <TouchableOpacity
                    style={styles.faqQuestionRow}
                    onPress={() => toggleItem(item.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.questionText, isExpanded && { color: '#0069E8' }]}>
                      {item.question}
                    </Text>
                    <View style={[styles.chevronBox, isExpanded && { backgroundColor: '#0069E815' }]}>
                      <Feather
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={isExpanded ? '#0069E8' : theme.colors.textSecondary}
                      />
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.answerContainer}>
                      <Text style={styles.answerText}>{item.answer}</Text>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Support CTA card */}
            <View style={styles.contactCard}>
              <Feather name="message-circle" size={24} color="#0069E8" />
              <View style={{ flex: 1 }}>
                <Text style={styles.contactCardTitle}>Tu ne trouves pas ta réponse ?</Text>
                <Text style={styles.contactCardSubtitle}>Notre équipe d'entraîneurs et développeurs est disponible pour t'aider.</Text>
              </View>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={handleContactSupport}
                activeOpacity={0.8}
              >
                <Feather name="mail" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.contactButtonText}>Écrire</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 18,
    marginTop: 14,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bannerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0069E815',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  bannerSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 10,
  },
  faqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: -0.2,
  },
  chevronBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerContainer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F1F5F9',
  },
  answerText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    padding: 14,
    marginTop: 10,
    gap: 12,
  },
  contactCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1',
  },
  contactCardSubtitle: {
    fontSize: 11,
    color: '#0284C7',
    marginTop: 2,
    lineHeight: 15,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0069E8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
