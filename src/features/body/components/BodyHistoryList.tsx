import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useBodyStore } from '../../../store/bodyStore';
import { Card } from '../../../shared/components/Card';
import { theme } from '../../../core/theme';

export const BodyHistoryList: React.FC = () => {
  const { metrics } = useBodyStore();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  if (metrics.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Historique</Text>
      {metrics.map((item) => (
        <Card key={item.id} style={styles.card}>
          <View style={styles.row}>
            <View>
              <Text style={styles.date}>{formatDate(item.created_at || new Date().toISOString())}</Text>
              <Text style={styles.weight}>{item.weight} kg</Text>
            </View>
            {item.body_fat && (
              <View style={styles.fatContainer}>
                <Text style={styles.fatLabel}>GRAS</Text>
                <Text style={styles.fatValue}>{item.body_fat}%</Text>
              </View>
            )}
          </View>
        </Card>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: theme.spacing.lg,
  },
  title: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: theme.typography.fontWeights.bold as any,
    letterSpacing: 1,
    marginBottom: theme.spacing.md,
    textTransform: 'uppercase',
  },
  card: {
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: theme.typography.fontWeights.bold as any,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  weight: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: theme.typography.fontWeights.semibold as any,
  },
  fatContainer: {
    alignItems: 'flex-end',
  },
  fatLabel: {
    color: theme.colors.textMuted,
    fontSize: 8,
    fontWeight: theme.typography.fontWeights.bold as any,
    marginBottom: 2,
  },
  fatValue: {
    color: theme.colors.accent,
    fontSize: 16,
    fontWeight: theme.typography.fontWeights.bold as any,
  },
});
