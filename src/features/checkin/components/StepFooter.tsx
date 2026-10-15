import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../core/theme';
import { Button } from '../../../shared/components/Button';
import { PressableScale } from '../../../shared/components/PressableScale';

interface StepFooterProps {
  title: string;
  onPress: () => void;
  onBack?: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Lien « Passer » : l'étape reste non renseignée (jamais remplie par une valeur par défaut). */
  onSkip?: () => void;
}

/** Bottom action bar of a check-in step: optional back square + primary button (+ optional skip link). */
export const StepFooter = ({ title, onPress, onBack, loading, disabled, onSkip }: StepFooterProps) => (
  <View>
    {onSkip && (
      <PressableScale
        haptic="selection"
        onPress={onSkip}
        style={styles.skip}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Passer cette étape"
        disabled={loading}
      >
        <Text style={styles.skipText}>Passer cette étape</Text>
      </PressableScale>
    )}
    <View style={styles.footer}>
    {onBack && (
      <PressableScale
        haptic="selection"
        onPress={onBack}
        style={styles.backBtn}
        accessibilityRole="button"
        accessibilityLabel="Étape précédente"
        disabled={loading}
      >
        <Feather name="arrow-left" size={22} color={theme.colors.text} />
      </PressableScale>
    )}
    <Button title={title} onPress={onPress} loading={loading} disabled={disabled} style={styles.primary} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.hairline,
  },
  backBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.glassFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { flex: 1 },
  skip: { alignSelf: 'center', paddingTop: 10, paddingBottom: 2, paddingHorizontal: 12 },
  skipText: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
});
