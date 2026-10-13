import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../../core/theme';
import { Button } from '../../../../shared/components/Button';
import { PressableScale } from '../../../../shared/components/PressableScale';
import { SocialAuthButtons, OrDivider } from '../SocialAuthButtons';

const ROLES: { role: 'athlete' | 'coach'; title: string; desc: string; icon: keyof typeof Feather.glyphMap }[] = [
  { role: 'athlete', title: 'Athlète', desc: 'Je suis mes séances, ma forme et ma nutrition.', icon: 'activity' },
  { role: 'coach', title: 'Coach', desc: 'Je planifie et j’accompagne mes athlètes.', icon: 'clipboard' },
];

export const StepRole = ({ data, updateData, onNext }: any) => (
  <View>
    <Text style={styles.title}>Crée ton compte</Text>
    <Text style={styles.subtitle}>{Platform.OS === 'ios' ? 'En quelques secondes avec Apple ou Google, ou avec ton e-mail.' : 'En quelques secondes avec Google, ou avec ton e-mail.'}</Text>

    <SocialAuthButtons />
    <OrDivider label="ou avec ton e-mail" />

    <Text style={styles.question}>Tu utilises Sprintys en tant que</Text>
    <View style={styles.cards}>
      {ROLES.map((r) => {
        const on = data.role === r.role;
        return (
          <PressableScale
            key={r.role}
            haptic="selection"
            onPress={() => updateData({ role: r.role })}
            style={[styles.card, on && styles.cardOn]}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
          >
            <View style={[styles.icon, on && styles.iconOn]}>
              <Feather name={r.icon} size={20} color={on ? '#FFFFFF' : theme.colors.sprintyBlue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, on && { color: theme.colors.sprintyBlue }]}>{r.title}</Text>
              <Text style={styles.cardDesc}>{r.desc}</Text>
            </View>
            <View style={[styles.radio, on && styles.radioOn]}>{on && <View style={styles.radioDot} />}</View>
          </PressableScale>
        );
      })}
    </View>

    <Button title="Continuer" onPress={onNext} style={styles.button} />
  </View>
);

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6, color: theme.colors.text },
  subtitle: { fontSize: 15, lineHeight: 21, color: theme.colors.textSecondary, marginTop: 4, marginBottom: 20 },
  question: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 10 },
  cards: { gap: 10, marginBottom: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: theme.colors.glassFill,
  },
  cardOn: { borderColor: theme.colors.sprintyBlue, backgroundColor: 'rgba(0, 105, 232, 0.08)' },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOn: { backgroundColor: theme.colors.sprintyBlue },
  cardTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
  cardDesc: { fontSize: 13, lineHeight: 18, color: theme.colors.textSecondary, marginTop: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: theme.colors.sprintyBlue },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.sprintyBlue },
  button: { marginTop: 4 },
});
