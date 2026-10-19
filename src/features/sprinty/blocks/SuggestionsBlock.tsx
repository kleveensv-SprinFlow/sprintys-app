import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { PressableScale } from '../../../shared/components/PressableScale';
import { theme } from '../../../core/theme';
import { glassSurface } from '../../../core/glass';

interface Props {
  items: string[];
  disabled?: boolean;
  onSelect: (text: string) => void;
}

const BLUE = theme.colors.sprintyBlue;

export function SuggestionsBlock({ items, disabled, onSelect }: Props) {
  if (!items?.length) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Feather name="zap" size={13} color={BLUE} />
        <Text style={styles.headerText}>Suggestions pour continuer</Text>
      </View>
      <View style={styles.pillsWrap}>
        {items.map((item, idx) => (
          <PressableScale
            key={idx}
            disabled={disabled}
            onPress={() => onSelect(item)}
            style={[styles.pill, disabled && styles.pillDisabled]}
            accessibilityRole="button"
            accessibilityLabel={item}
          >
            <Text style={[styles.pillText, disabled && styles.pillTextDisabled]}>{item}</Text>
            <Feather name="arrow-up-right" size={14} color={disabled ? theme.colors.textSecondary : BLUE} />
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 6,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    ...glassSurface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    maxWidth: '100%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(0, 105, 232, 0.22)',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  pillDisabled: {
    opacity: 0.55,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  pillText: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  pillTextDisabled: {
    color: theme.colors.textSecondary,
  },
});
