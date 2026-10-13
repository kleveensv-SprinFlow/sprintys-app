import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../core/theme';
import { glassCard } from '../../core/glass';
import { GlowBackground } from './GlowBackground';
import { PressableScale } from './PressableScale';

interface Props {
  error?: Error;
  retry: () => void;
}

/**
 * Shown instead of a blank or red screen when a screen crashes while rendering
 * (wired as expo-router's ErrorBoundary in app/_layout.tsx).
 */
export function AppErrorScreen({ error, retry }: Props) {
  if (error) console.error('Render error', error);
  return (
    <View style={styles.container}>
      <GlowBackground />
      <View style={[glassCard, styles.card]}>
        <View style={styles.icon}>
          <Feather name="refresh-cw" size={26} color={theme.colors.sprintyBlue} />
        </View>
        <Text style={styles.title}>Un faux départ</Text>
        <Text style={styles.text}>
          Cet écran n'a pas pu s'afficher. Tes données sont en sécurité : réessaie, et si ça continue, écris-nous depuis
          les réglages.
        </Text>
        <PressableScale onPress={retry} haptic="medium" style={styles.button}>
          <Text style={styles.buttonText}>Réessayer</Text>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 22,
  },
  icon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: theme.colors.text,
    marginBottom: 8,
  },
  text: {
    fontSize: 15,
    lineHeight: 21,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 22,
  },
  button: {
    alignSelf: 'stretch',
    backgroundColor: theme.colors.sprintyBlue,
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
