import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
  Linking,
  Animated,
  Easing,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../core/theme';
import { PUBLISHER } from '../../legal/publisher';
import { FeedbackHost } from '../feedback/FeedbackHost';
import { IconButton } from './IconButton';
import { PressableScale } from './PressableScale';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const BLUE_TINT = 'rgba(0, 105, 232, 0.1)';

type Role = 'athlete' | 'coach';

interface FaqItem {
  id: string;
  /** Shown to everyone when omitted. */
  roles?: Role[];
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'support',
    question: 'Comment contacter le support ?',
    answer: `Tu peux joindre notre équipe à tout moment par e-mail à ${PUBLISHER.contactEmail}. Nous répondons généralement en moins de 24 h ouvrées.`,
  },
  // ----- Athlète -----
  {
    id: 'a-join',
    roles: ['athlete'],
    question: 'Comment rejoindre le groupe de mon coach ?',
    answer: 'Ouvre « Mon groupe » depuis ton profil et saisis le code à 8 chiffres donné par ton coach. Il reçoit ta demande et doit l’accepter ; tu es prévenu dès que c’est fait.',
  },
  {
    id: 'a-share',
    roles: ['athlete'],
    question: 'Que voit mon coach de mes données ?',
    answer: 'Une fois dans son groupe, ton coach voit tes séances, tes repas, ton poids et ta composition, tes check-ins et, si tu l’as accepté, tes douleurs. Tu peux quitter le groupe à tout moment depuis « Mon groupe » : il n’y a alors plus accès.',
  },
  {
    id: 'a-checkin',
    roles: ['athlete'],
    question: 'À quoi sert le check-in du jour ?',
    answer: 'En 30 secondes (sommeil, énergie, stress, motivation, douleurs éventuelles), il calcule ta forme du jour. Ton coach s’en sert pour adapter la charge de tes séances.',
  },
  {
    id: 'a-meals',
    roles: ['athlete'],
    question: 'Comment enregistrer un repas ?',
    answer: 'Dans l’onglet Nutrition, touche « + » sur un repas : cherche un aliment, scanne un code-barres ou, si tu as activé l’IA, prends une photo ou décris ton repas.',
  },
  // ----- Coach -----
  {
    id: 'c-invite',
    roles: ['coach'],
    question: 'Comment inviter un athlète dans mon groupe ?',
    answer: 'Dans l’onglet Équipe, ouvre ton groupe puis copie ou partage le code d’invitation. L’athlète le saisit dans « Mon groupe » et tu valides sa demande dans l’onglet « Demandes ».',
  },
  {
    id: 'c-subgroups',
    roles: ['coach'],
    question: 'Puis-je créer des sous-groupes par niveau ou discipline ?',
    answer: 'Oui. Dans l’onglet « Groupes » de ton équipe, crée des sous-groupes (100 m/200 m, Haies, Relais…) pour planifier des séances spécifiques et adapter les charges.',
  },
  {
    id: 'c-form',
    roles: ['coach'],
    question: 'Où voir la forme de mon équipe ?',
    answer: 'Sur l’accueil, la carte « Forme de l’équipe » résume les check-ins du jour ; touche-la pour le détail par athlète. Tu ne vois que ce que chaque athlète a accepté de partager.',
  },
  {
    id: 'c-ai',
    roles: ['coach'],
    question: 'Comment Sprinty peut-il m’aider ?',
    answer: 'Sprinty peut proposer des séances, analyser la progression d’un athlète (touche l’athlète dans ton équipe puis « Analyser avec Sprinty ») ou faire un bilan de forme. Les données de l’athlète sont envoyées à notre prestataire d’IA uniquement quand tu lances une analyse.',
  },
  // ----- Les deux -----
  {
    id: 'phase',
    question: 'Comment définir une phase d’entraînement ?',
    answer: 'Depuis l’onglet Calendrier, touche le bouton « + Phase » en haut à droite ou « Définir une phase d’entraînement ». Choisis le nom (ex. : Prépa physique, Affûtage), les dates et la couleur associée.',
  },
  {
    id: 'weather',
    question: 'Comment fonctionnent les conditions météo ?',
    answer: 'Sprintys analyse les prévisions de vent (vitesse, rafales, sens favorable ou défavorable à la ligne droite) ainsi que le risque de pluie pour t’indiquer l’état de la piste.',
  },
  {
    id: 'data-athlete',
    roles: ['athlete'],
    question: 'Où sont stockées mes données personnelles et de santé ?',
    answer: 'Tes données sont hébergées dans l’Union européenne (Paris). Tu peux en exporter une copie et supprimer ton compte depuis ton profil. La politique de confidentialité détaille ce qui est partagé avec ton coach et avec notre prestataire d’IA.',
  },
  {
    id: 'data-coach',
    roles: ['coach'],
    question: 'Où sont stockées mes données et celles de mes athlètes ?',
    answer: 'Tout est hébergé dans l’Union européenne (Paris). Tu peux exporter tes données et supprimer ton compte depuis ton profil. Les données de tes athlètes ne te sont accessibles que tant qu’ils font partie de ton groupe.',
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  role?: Role;
}

/** One accordion row: the height change is animated with LayoutAnimation, the chevron rotates. */
const FaqRow = ({ item, expanded, onToggle }: { item: FaqItem; expanded: boolean; onToggle: () => void }) => {
  const rotation = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(rotation, {
      toValue: expanded ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [expanded]);

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <View style={[styles.faqCard, expanded && styles.faqCardExpanded]}>
      <PressableScale
        haptic="selection"
        activeScale={0.985}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={styles.faqQuestionRow}
      >
        <Text style={[styles.questionText, expanded && { color: theme.colors.sprintyBlue }]}>{item.question}</Text>
        <Animated.View style={[styles.chevronBox, expanded && { backgroundColor: BLUE_TINT }, { transform: [{ rotate }] }]}>
          <Feather
            name="chevron-down"
            size={16}
            color={expanded ? theme.colors.sprintyBlue : theme.colors.textSecondary}
          />
        </Animated.View>
      </PressableScale>

      {expanded && (
        <View style={styles.answerContainer}>
          <Text style={styles.answerText}>{item.answer}</Text>
        </View>
      )}
    </View>
  );
};

export const FaqModal = ({ visible, onClose, role = 'athlete' }: Props) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleContactSupport = () => {
    Linking.openURL(`mailto:${PUBLISHER.contactEmail}?subject=Question%20Support%20Sprintys`);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <FeedbackHost />
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.grabber} />

          {/* Header */}
          <View style={styles.header}>
            <IconButton icon="x" onPress={onClose} accessibilityLabel="Fermer" />
            <Text style={styles.title}>Centre d’aide</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Intro */}
            <View style={styles.bannerContainer}>
              <View style={styles.bannerIconBox}>
                <Feather name="help-circle" size={18} color={theme.colors.sprintyBlue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>Questions fréquentes</Text>
                <Text style={styles.bannerSubtitle}>Trouve rapidement les réponses aux usages clés de Sprintys.</Text>
              </View>
            </View>

            {FAQ_ITEMS.filter((item) => !item.roles || item.roles.includes(role)).map((item) => (
              <FaqRow key={item.id} item={item} expanded={expandedId === item.id} onToggle={() => toggleItem(item.id)} />
            ))}

            {/* Support CTA */}
            <View style={styles.contactCard}>
              <View style={styles.contactIconBox}>
                <Feather name="message-circle" size={20} color={theme.colors.sprintyBlue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactCardTitle}>Tu ne trouves pas ta réponse ?</Text>
                <Text style={styles.contactCardSubtitle}>Notre équipe est là pour t’aider.</Text>
              </View>
              <PressableScale
                haptic="light"
                onPress={handleContactSupport}
                accessibilityRole="button"
                accessibilityLabel={`Écrire au support : ${PUBLISHER.contactEmail}`}
                style={styles.contactButton}
              >
                <Feather name="mail" size={14} color="#FFFFFF" />
                <Text style={styles.contactButtonText}>Écrire</Text>
              </PressableScale>
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
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: theme.colors.backdrop,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderCurve: 'continuous',
    maxHeight: '88%',
    paddingBottom: 24,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
  },
  headerSpacer: {
    width: 38,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: theme.colors.text,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 10,
  },
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  bannerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: BLUE_TINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: theme.colors.text,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  faqCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    overflow: 'hidden',
  },
  faqCardExpanded: {
    borderColor: 'rgba(0, 105, 232, 0.25)',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 52,
    gap: 10,
  },
  questionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: -0.2,
  },
  chevronBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.glassFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerContainer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  answerText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 21,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 105, 232, 0.08)',
    borderRadius: 22,
    borderCurve: 'continuous',
    padding: 14,
    marginTop: 10,
    gap: 12,
  },
  contactIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: theme.colors.text,
  },
  contactCardSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.sprintyBlue,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 14,
    borderCurve: 'continuous',
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
