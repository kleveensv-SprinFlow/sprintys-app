import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Platform } from 'react-native';
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

/** Page color behind the glows: slightly tinted so translucent white cards stand out. */
export const GLASS_BACKDROP = '#EDF1F7';

/** Neutral fill for elements inside a glass card (progress tracks, rest tiles…). */
export const glassFill = 'rgba(15, 23, 42, 0.05)';

/**
 * Light-theme "glass" card: translucent white over the glow background with a
 * bright rim. No real blur on purpose: behind cards there are only static,
 * already-soft glows, so a blur would look the same and cost a lot on Android.
 * No elevation on Android: it draws a grey halo through translucent views.
 */
export const glassCard: ViewStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.68)',
  borderRadius: 22,
  borderCurve: 'continuous',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.9)',
  padding: 16,
  ...Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#1E3A8A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.05,
      shadowRadius: 20,
    },
    android: { elevation: 0 },
    default: {},
  }),
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
    color: theme.colors.textSecondary,
    flexShrink: 1,
  },
});
