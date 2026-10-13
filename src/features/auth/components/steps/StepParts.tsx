import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../../core/theme';
import { Button } from '../../../../shared/components/Button';
import { PressableScale } from '../../../../shared/components/PressableScale';

/** Shared building blocks so every signup step reads the same way. */

export const StepTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <View style={styles.head}>
    <Text style={styles.title}>{title}</Text>
    {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
  </View>
);

export const StepFooter = ({
  onBack,
  onNext,
  nextTitle = 'Continuer',
  disabled,
  loading,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextTitle?: string;
  disabled?: boolean;
  loading?: boolean;
}) => (
  <View style={styles.footer}>
    {onBack && (
      <PressableScale
        haptic="selection"
        onPress={onBack}
        disabled={loading}
        style={styles.back}
        accessibilityRole="button"
        accessibilityLabel="Étape précédente"
      >
        <Feather name="arrow-left" size={20} color={theme.colors.text} />
      </PressableScale>
    )}
    <Button title={nextTitle} onPress={onNext} disabled={disabled || loading} loading={loading} style={styles.next} />
  </View>
);

export const ChoiceCard = ({
  selected,
  onPress,
  icon,
  label,
}: {
  selected: boolean;
  onPress: () => void;
  icon: keyof typeof Feather.glyphMap;
  label: string;
}) => (
  <PressableScale
    haptic="selection"
    onPress={onPress}
    containerStyle={styles.choiceWrap}
    style={[styles.choice, selected && styles.choiceOn]}
    accessibilityRole="radio"
    accessibilityState={{ selected }}
  >
    <Feather name={icon} size={20} color={selected ? theme.colors.sprintyBlue : theme.colors.textMuted} />
    <Text style={[styles.choiceText, selected && { color: theme.colors.sprintyBlue }]}>{label}</Text>
  </PressableScale>
);

export const FieldLabel = ({ children }: { children: string }) => <Text style={styles.label}>{children}</Text>;

export const stepStyles = StyleSheet.create({
  error: { color: theme.colors.error, fontSize: 13, fontWeight: '600', marginTop: -8, marginBottom: 12 },
});

const styles = StyleSheet.create({
  head: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6, color: theme.colors.text },
  subtitle: { fontSize: 15, lineHeight: 21, color: theme.colors.textSecondary, marginTop: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  back: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.glassFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  next: { flex: 1 },
  choiceWrap: { flex: 1 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: theme.colors.glassFill,
  },
  choiceOn: { borderColor: theme.colors.sprintyBlue, backgroundColor: 'rgba(0, 105, 232, 0.08)' },
  choiceText: { fontSize: 16, fontWeight: '700', color: theme.colors.textSecondary },
  label: { fontSize: 13, fontWeight: '600', letterSpacing: -0.2, color: theme.colors.textSecondary, marginBottom: 6 },
});
