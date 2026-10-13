import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../core/theme';

/**
 * Shared look of the athlete dashboard cards (Apple Health-like summary tiles):
 * white surface, no border, soft shadow, continuous corners.
 */
export const dashboardCard: ViewStyle = {
  backgroundColor: theme.colors.surface,
  borderRadius: 22,
  borderCurve: 'continuous',
  padding: 16,
  ...theme.shadows.soft,
  // No border anymore: a slightly stronger shadow keeps the card edge readable
  shadowOpacity: 0.06,
};

interface DashboardCardHeaderProps {
  icon: React.ReactNode;
  label: string;
  /** Tint of the label, matching the icon. */
  tint: string;
  /** Optional right-side text before the chevron (e.g. "Aujourd'hui"). */
  meta?: string;
  showChevron?: boolean;
}

export const DashboardCardHeader = ({ icon, label, tint, meta, showChevron = true }: DashboardCardHeaderProps) => (
  <View style={styles.row}>
    <View style={styles.left}>
      {icon}
      <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
    <View style={styles.right}>
      {!!meta && (
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      )}
      {showChevron && <Feather name="chevron-right" size={16} color={theme.colors.textMuted} />}
    </View>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    marginLeft: 12,
  },
  meta: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textMuted,
    flexShrink: 1,
  },
});
