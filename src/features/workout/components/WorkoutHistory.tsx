import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useWorkoutStore } from '../../../store/workoutStore';
import { Card } from '../../../shared/components/Card';
import { theme } from '../../../core/theme';
import { EmptyState } from '../../../shared/components/EmptyState';

export const WorkoutHistory: React.FC = React.memo(() => {
  const { history } = useWorkoutStore();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  if (history.length === 0) {
    return (
      <EmptyState 
        title="Aucune séance" 
        message="Vous n'avez pas encore de séances enregistrées. Votre progression s'affichera ici dès la fin de votre premier entraînement." 
      />
    );
  }

  return (
    <FlatList
      data={history}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.dateText}>{formatDate(item.date)}</Text>
            <Text style={styles.nameText}>{item.name}</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{item.durationMinutes}</Text>
              <Text style={styles.statLabel}>MIN</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{Math.round(item.totalVolume)}</Text>
              <Text style={styles.statLabel}>VOLUME (KG)</Text>
            </View>
          </View>
        </Card>
      )}
      contentContainerStyle={styles.listContent}
    />
  );
});

const styles = StyleSheet.create({
  emptyContainer: {
    padding: theme.spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  listContent: {
    paddingVertical: theme.spacing.lg,
  },
  card: {
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    marginBottom: theme.spacing.md,
  },
  dateText: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: theme.typography.fontWeights.bold as any,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  nameText: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: theme.typography.fontWeights.semibold as any,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: theme.typography.fontWeights.bold as any,
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: theme.typography.fontWeights.bold as any,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: theme.colors.border,
  },
});
