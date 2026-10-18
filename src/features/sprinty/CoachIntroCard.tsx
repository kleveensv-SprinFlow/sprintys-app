import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../core/theme';
import { PressableScale } from '../../shared/components/PressableScale';
import { coachMemoryService, INTRO_PROMPT } from '../../services/coachMemoryService';

/**
 * Coach : tant que Sprinty ne connaît rien de sa façon d'entraîner et que la présentation n'a été ni faite ni remise
 * à plus tard, une invitation à faire connaissance (2 minutes). Ne s'affiche jamais en cas de doute (erreur réseau).
 */
export function CoachIntroCard({ onStart }: { onStart: (prompt: string) => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([coachMemoryService.getIntroStatus(), coachMemoryService.count()])
      .then(([status, n]) => alive && setShow(status === null && n === 0))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (!show) return null;

  const later = () => {
    setShow(false);
    coachMemoryService.setIntroStatus('skipped').catch(() => undefined);
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <Feather name="user-check" size={16} color={theme.colors.sprintyBlue} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Faisons connaissance</Text>
          <Text style={styles.sub}>2 minutes pour que je comprenne tes méthodes et tes objectifs. Mes conseils et mes séances te ressembleront.</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <PressableScale haptic="light" onPress={() => { setShow(false); onStart(INTRO_PROMPT); }} style={styles.primary} accessibilityRole="button">
          <Text style={styles.primaryText}>C’est parti</Text>
        </PressableScale>
        <PressableScale haptic="selection" onPress={later} style={styles.secondary} accessibilityRole="button">
          <Text style={styles.secondaryText}>Plus tard</Text>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.hairline,
    padding: 14,
    gap: 12,
    marginBottom: 12,
  },
  head: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icon: { width: 34, height: 34, borderRadius: 11, backgroundColor: 'rgba(0, 105, 232, 0.1)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '800', color: theme.colors.text },
  sub: { fontSize: 13, lineHeight: 18, color: theme.colors.textSecondary, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10 },
  primary: { flex: 1, height: 44, borderRadius: 14, borderCurve: 'continuous', backgroundColor: theme.colors.sprintyBlue, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondary: { height: 44, paddingHorizontal: 18, borderRadius: 14, borderCurve: 'continuous', backgroundColor: theme.colors.glassFill, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
});
