import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../core/theme';

export interface WorkoutCardProps {
  time?: string;
  title: string;
  type: string;
  duration?: string;
  status?: 'pending' | 'completed' | 'active';
  summary?: string;
  onPress?: () => void;
}

export const WorkoutCard: React.FC<WorkoutCardProps> = ({
  time = 'À définir',
  title,
  type,
  duration = '-- min',
  status = 'pending',
  summary,
  onPress,
}) => {
  const theme = useTheme();

  // Determine colors based on status and type
  const isCompleted = status === 'completed';
  const isActive = status === 'active';
  
  // Choose a subtle tint based on type (for BioAthlete styling)
  let cardBg = theme.colors.surface;
  let accentColor = theme.colors.accent;

  if (type.toLowerCase().includes('vitesse')) {
    cardBg = isCompleted ? theme.colors.surface : theme.colors.surfaceLight;
    accentColor = theme.colors.error; // Red for speed
  } else if (type.toLowerCase().includes('endurance')) {
    accentColor = theme.colors.success;
  } else if (type.toLowerCase().includes('musculation')) {
    accentColor = theme.colors.warning;
  }

  return (
    <View style={styles.containerRow}>
      <View style={styles.timeColumn}>
        <Text style={[styles.timeText, { color: theme.colors.text }]}>
          {time.split(':')[0]}
        </Text>
        {time.includes(':') && (
          <Text style={[styles.timeSubText, { color: theme.colors.textMuted }]}>
            {time.split(':')[1]}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.card, { backgroundColor: cardBg, borderColor: theme.colors.border }]}
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
            <Text style={[styles.type, { color: accentColor }]}>{type}</Text>
          </View>
          <TouchableOpacity style={[styles.moreButton, { backgroundColor: theme.colors.background }]}>
            <Feather name="more-horizontal" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {summary && (
          <View style={styles.summaryContainer}>
            <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]} numberOfLines={3}>
              {summary}
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.footerInfo}>
            <Feather name="clock" size={14} color={theme.colors.textMuted} />
            <Text style={[styles.durationText, { color: theme.colors.textSecondary }]}>
              {duration}
            </Text>
          </View>

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
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  containerRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  timeColumn: {
    width: 50,
    paddingTop: 8,
  },
  timeText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  timeSubText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  card: {
    flex: 1,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  type: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
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
