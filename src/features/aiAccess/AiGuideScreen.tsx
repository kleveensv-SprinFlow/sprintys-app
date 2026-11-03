import React, { useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '../../core/theme';
import { goBack } from '../../core/navigation';
import { Header } from '../../shared/components/Header';
import { GlassScreen } from '../../shared/components/GlassScreen';
import { PressableScale } from '../../shared/components/PressableScale';
import { useFrostedHeader } from '../../shared/hooks/useFrostedHeader';
import { AI_QUESTIONS, AiGuideKind } from '../../services/aiAccessService';
import { AiGuide } from './components/AiGuide';
import { Section, copyText } from './components/ui';

/** Setup guide for each AI, then ready-made questions to copy. */
export function AiGuideScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ ai?: string }>();
  const { scrollY, scrollProps } = useFrostedHeader();
  const [kind, setKind] = useState<AiGuideKind>(params.ai === 'claude' || params.ai === 'autre' ? params.ai : 'chatgpt');

  return (
    <GlassScreen>
      <Header title="Mode d’emploi" showBackButton onBackPress={() => goBack(router, '/(athlete)/ai-access')} scrollY={scrollY} />
      <Animated.ScrollView {...scrollProps} contentContainerStyle={styles.content}>
        <Text style={styles.intro}>Crée d’abord une clé dans Accès IA, puis suis les étapes de ton IA.</Text>
        <AiGuide kind={kind} onKindChange={setKind} />

        <Section title="Idées de questions" footer="Touche une question pour la copier, puis colle-la dans ton IA.">
          {AI_QUESTIONS.map((q, i) => (
            <PressableScale
              key={q.label}
              haptic="selection"
              activeScale={0.985}
              onPress={() => copyText(q.text, 'Question')}
              accessibilityRole="button"
              accessibilityLabel={`Copier : ${q.text}`}
              style={[styles.row, i < AI_QUESTIONS.length - 1 && styles.divider]}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.label}>{q.label}</Text>
                <Text style={styles.detail} numberOfLines={2}>
                  {q.text}
                </Text>
              </View>
              <Feather name="copy" size={17} color={theme.colors.sprintyBlue} />
            </PressableScale>
          ))}
        </Section>
      </Animated.ScrollView>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.xxxl },
  intro: { fontSize: 15, lineHeight: 21, color: theme.colors.textSecondary, marginBottom: theme.spacing.lg, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 10 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.hairline },
  label: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  detail: { fontSize: 13, lineHeight: 18, color: theme.colors.textSecondary, marginTop: 1 },
});
