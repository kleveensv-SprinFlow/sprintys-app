import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../core/theme';
import { getWorkoutTypeConfig } from './MonthlyCalendar';
import { glassSurface } from '../../core/glass';
import { PressableScale } from './PressableScale';
import { GlassSheen } from './GlassSheen';

export interface WorkoutCardProps {
  time?: string;
  title: string;
  type?: string;
  duration?: string;
  status?: 'pending' | 'completed' | 'active';
  summary?: string;
  onPress?: () => void;
}

/**
 * One session of a day, on two lines: the title, then time and summary. The state sits on the right (done / in progress),
 * otherwise a chevron says the card opens. (The old « … » button did the same as the card itself: removed.)
 */
export const WorkoutCard: React.FC<WorkoutCardProps> = ({ time, title, type, status = 'pending', summary, onPress }) => {
  const theme = useTheme();
  const isCompleted = status === 'completed';
  const isActive = status === 'active';

  // Dynamic color coding & icon from session type
  const typeConfig = getWorkoutTypeConfig(title || type || '');

  // Only display the type if it is a specific informative category, not generic "Séance" / "Séance Coach"
  const showTypeSubtitle = !!type && !type.toLowerCase().includes('séance');
  const detail = [time, showTypeSubtitle ? type : null, summary].filter(Boolean).join(' · ');

  return (
    <View style={styles.containerRow}>
      <PressableScale
        containerStyle={styles.cardTouch}
        style={[styles.card, glassSurface]}
        onPress={onPress}
        disabled={!onPress}
        haptic={onPress ? 'light' : 'none'}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={`${title}${detail ? `, ${detail}` : ''}${isCompleted ? ', terminée' : isActive ? ', en cours' : ''}`}
      >
        <GlassSheen radius={22} />
        <View style={[styles.iconBox, { backgroundColor: typeConfig.bg }]}>
          <Ionicons name={typeConfig.icon} size={20} color={typeConfig.text} />
        </View>
        <View style={styles.texts}>
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          {!!detail && (
            <Text style={[styles.detail, { color: theme.colors.textSecondary }]} numberOfLines={2}>
              {detail}
            </Text>
          )}
        </View>
        {isCompleted ? (
          <Feather name="check-circle" size={22} color={theme.colors.success} />
        ) : isActive ? (
          <Feather name="activity" size={20} color={theme.colors.sprintyBlue} />
        ) : onPress ? (
          <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
        ) : null}
      </PressableScale>
    </View>
  );
};

const styles = StyleSheet.create({
  containerRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  cardTouch: {
    flex: 1,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 68,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  detail: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 18,
  },
});
