import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../core/theme';

export const isSprintyWorkout = (w: any) => w?.source === 'sprinty';

/** Marks a session planned by Sprinty (AI), as required for transparency. */
export function SprintyBadge({ compact }: { compact?: boolean }) {
  return (
    <View style={styles.badge} accessibilityLabel="Séance proposée par Sprinty, l’IA de l’app">
      <MaterialCommunityIcons name="robot-outline" size={compact ? 12 : 14} color={theme.colors.sprintyBlue} />
      <Text style={[styles.text, compact && styles.compact]}>{compact ? 'Sprinty' : 'Proposée par Sprinty (IA)'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
  },
  text: { fontSize: 12, fontWeight: '700', color: theme.colors.sprintyBlue },
  compact: { fontSize: 11 },
});
