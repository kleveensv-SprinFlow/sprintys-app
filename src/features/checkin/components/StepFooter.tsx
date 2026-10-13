import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../core/theme';
import { Button } from '../../../shared/components/Button';
import { PressableScale } from '../../../shared/components/PressableScale';

interface StepFooterProps {
  title: string;
  onPress: () => void;
  onBack?: () => void;
  loading?: boolean;
}

/** Bottom action bar of a check-in step: optional back square + primary button. */
export const StepFooter = ({ title, onPress, onBack, loading }: StepFooterProps) => (
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
    <Button title={title} onPress={onPress} loading={loading} style={styles.primary} />
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
});
