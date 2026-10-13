import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../core/theme';
import { glassCard } from '../../../core/glass';
import { PressableScale } from '../../../shared/components/PressableScale';

export interface ScaleOption {
  value: number;
  /** Short label shown under the chip. */
  label: string;
  icon: keyof typeof Feather.glyphMap;
}

interface ScaleChipsProps {
  value: number;
  onChange: (value: number) => void;
  options: ScaleOption[];
}

/** Row of 5 icon chips with a short label under each. Selected = blue fill, white icon. */
export const ScaleChips = ({ value, onChange, options }: ScaleChipsProps) => (
  <View style={styles.row}>
    {options.map((item) => {
      const active = value === item.value;
      return (
        <PressableScale
          key={item.value}
          haptic="selection"
          activeScale={0.92}
          onPress={() => onChange(item.value)}
          containerStyle={styles.cell}
          style={styles.cellInner}
          accessibilityRole="radio"
          accessibilityState={{ selected: active }}
          accessibilityLabel={item.label}
        >
          <View style={[styles.chip, active && styles.chipActive]}>
            <Feather name={item.icon} size={20} color={active ? '#FFFFFF' : theme.colors.textSecondary} />
          </View>
          <Text style={[styles.label, active && styles.labelActive]} numberOfLines={2}>
            {item.label}
          </Text>
        </PressableScale>
      );
    })}
  </View>
);

interface ScaleCardProps extends ScaleChipsProps {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  /** Long label of the selected value, shown in the pill on the right. */
  valueLabel?: string;
}

/** Glass card: icon + title + selected value pill, then the chip row. */
export const ScaleCard = ({ title, icon, valueLabel, ...chips }: ScaleCardProps) => (
  <View style={[glassCard, styles.card]}>
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.iconBox}>
          <Feather name={icon} size={16} color={theme.colors.sprintyBlue} />
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {!!valueLabel && (
        <View style={styles.valuePill}>
          <Text style={styles.valuePillText} numberOfLines={1}>
            {valueLabel}
          </Text>
        </View>
      )}
    </View>
    <ScaleChips {...chips} />
  </View>
);

const styles = StyleSheet.create({
  card: { marginBottom: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2, color: theme.colors.text, flexShrink: 1 },
  valuePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
    maxWidth: '50%',
  },
  valuePillText: { fontSize: 12, fontWeight: '700', color: theme.colors.sprintyBlue },

  row: { flexDirection: 'row', gap: 6 },
  cell: { flex: 1 },
  cellInner: { alignItems: 'center', minHeight: 44 },
  chip: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.glassFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: theme.colors.sprintyBlue,
    shadowColor: theme.colors.sprintyBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  label: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  labelActive: { color: theme.colors.sprintyBlue, fontWeight: '800' },
});
