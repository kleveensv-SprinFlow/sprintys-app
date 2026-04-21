import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ManagedAthlete } from '../types';
import { Card } from '../../../shared/components/Card';
import { Button } from '../../../shared/components/Button';
import { theme } from '../../../core/theme';
import { GlowView } from '../../../shared/components/GlowView';
import { useRouter } from 'expo-router';

interface Props {
  athlete: ManagedAthlete;
}

export const AthleteCard: React.FC<Props> = React.memo(({ athlete }) => {
  const router = useRouter();
  const getStatusColor = () => {
    switch (athlete.lastWorkoutStatus) {
      case 'completed': return theme.colors.success;
      case 'in-progress': return theme.colors.warning;
      case 'missed': return theme.colors.error;
      default: return theme.colors.textMuted;
    }
  };

  return (
    <GlowView active={athlete.lastWorkoutStatus === 'in-progress'} variant="surface">
      <Card style={styles.card}>
        <View style={styles.header}>
          <View>
            <Text style={styles.name}>{athlete.name}</Text>
            <Text style={styles.email}>{athlete.email}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: getStatusColor() + '20' }]}>
            <Text style={[styles.badgeText, { color: getStatusColor() }]}>
              {athlete.lastWorkoutStatus.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>COMPLÉTION</Text>
            <Text style={styles.statValue}>{athlete.completionRate}%</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statLabel}>DERNIER ENTRAÎNEMENT</Text>
            <Text style={styles.statValue}>
              {athlete.lastWorkoutDate ? new Date(athlete.lastWorkoutDate).toLocaleDateString('fr-FR') : 'N/A'}
            </Text>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <Button
            title="DÉTAILS"
            onPress={() => router.push(`/(coach)/athlete/${athlete.id}`)}
            variant="ghost"
            style={[styles.actionBtn, { flex: 1, marginRight: 8 }] as any}
          />
          <Button
            title="ASSIGNER"
            onPress={() => router.push(`/(coach)/assign/${athlete.id}`)}
            variant="outline"
            style={[styles.actionBtn, { flex: 1.5 }] as any}
          />
        </View>
      </Card>
    </GlowView>
  );
});

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  name: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: theme.typography.fontWeights.bold as any,
  },
  email: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: theme.typography.fontWeights.bold as any,
    letterSpacing: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceLight,
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.lg,
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: theme.typography.fontWeights.bold as any,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: theme.typography.fontWeights.semibold as any,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    height: 44,
  },
});
