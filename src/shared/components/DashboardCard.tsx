import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../core/theme';

// Glass styles live in core/glass; re-exported for the dashboard components
export { GLASS_BACKDROP, glassFill, glassCard } from '../../core/glass';

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
    color: theme.colors.textSecondary,
    flexShrink: 1,
  },
});
