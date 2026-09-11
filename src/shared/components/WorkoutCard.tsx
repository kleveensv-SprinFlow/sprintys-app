import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../core/theme';
import { getWorkoutTypeConfig } from './MonthlyCalendar';

export interface WorkoutCardProps {
  time?: string;
  title: string;
  type?: string;
  duration?: string;
  status?: 'pending' | 'completed' | 'active';
  summary?: string;
  onPress?: () => void;
}

export const WorkoutCard: React.FC<WorkoutCardProps> = ({
  title,
  type,
  status = 'pending',
  summary,
  onPress,
}) => {
  const theme = useTheme();

  const isCompleted = status === 'completed';
  const isActive = status === 'active';
  
  // Dynamic color coding & icon from session type
  const typeConfig = getWorkoutTypeConfig(title || type || '');
  const cardBg = theme.colors.surface;

  // Only display type subtitle if it's a specific informative category, not generic "Séance" / "Séance Coach"
  const showTypeSubtitle = type && !type.toLowerCase().includes('séance');

  return (
    <View style={styles.containerRow}>
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: cardBg,
            borderColor: theme.colors.border,
            borderLeftWidth: 4.5,
            borderLeftColor: typeConfig.text,
          },
        ]}
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconBox, { backgroundColor: typeConfig.bg }]}>
              <Ionicons name={typeConfig.icon} size={20} color={typeConfig.text} />
            </View>
            <View style={styles.titleWrapper}>
              <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
              {showTypeSubtitle && (
                <Text style={[styles.type, { color: typeConfig.text }]}>{type}</Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.moreButton, { backgroundColor: theme.colors.background }]}
            onPress={onPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="more-horizontal" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {summary ? (
          <View style={styles.summaryContainer}>
            <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]} numberOfLines={2}>
              {summary}
            </Text>
          </View>
        ) : null}

        {(isCompleted || isActive) && (
          <View style={styles.footer}>
            {isCompleted && (
              <View style={styles.statusBadge}>
                <Feather name="check-circle" size={14} color={theme.colors.success} />
                <Text style={[styles.statusText, { color: theme.colors.success }]}>Terminée</Text>
              </View>
            )}
            {isActive && (
              <View style={styles.statusBadge}>
                <Feather name="activity" size={14} color={theme.colors.accent} />
                <Text style={[styles.statusText, { color: theme.colors.accent }]}>En cours</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  containerRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrapper: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  type: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  durationText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
