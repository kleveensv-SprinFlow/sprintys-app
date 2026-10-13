import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../core/theme';
import { PressableScale } from './PressableScale';

interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Feather.glyphMap;
  iconColor?: string;
  /** Text or element shown on the right, before the chevron. */
  value?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  chevron?: boolean;
  last?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Settings-style row: tinted icon, title, optional subtitle/value and chevron. Stack them inside a glass card. */
export const ListRow: React.FC<ListRowProps> = ({
  title,
  subtitle,
  icon,
  iconColor,
  value,
  onPress,
  destructive,
  chevron = !!onPress,
  last,
  style,
}) => {
  const tint = destructive ? theme.colors.error : iconColor ?? theme.colors.sprintyBlue;
  const content = (
    <>
      {icon && (
        <View style={[styles.icon, { backgroundColor: `${tint}1A` }]}>
          <Feather name={icon} size={17} color={tint} />
        </View>
      )}
      <View style={styles.text}>
        <Text style={[styles.title, destructive && { color: theme.colors.error }]} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
      {typeof value === 'string' ? <Text style={styles.value}>{value}</Text> : value}
      {chevron && <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />}
    </>
  );

  const rowStyle = [styles.row, !last && styles.divider, style];
  if (!onPress) return <View style={rowStyle}>{content}</View>;
  return (
    <PressableScale haptic="selection" activeScale={0.985} onPress={onPress} style={rowStyle} accessibilityRole="button">
      {content}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 10 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.hairline },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  subtitle: { fontSize: 13, lineHeight: 18, color: theme.colors.textSecondary, marginTop: 1 },
  value: { fontSize: 15, color: theme.colors.textSecondary, fontWeight: '500' },
});
