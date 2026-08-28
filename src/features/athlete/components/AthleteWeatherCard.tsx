import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../core/theme';

export const AthleteWeatherCard = () => {
  return (
    <View style={styles.container}>
      <View style={styles.leftContent}>
        <Text style={styles.temperature}>24°</Text>
        <View style={styles.details}>
          <Text style={styles.condition}>Ensoleillé</Text>
          <Text style={styles.location}>Paris, France</Text>
        </View>
      </View>
      
      <View style={styles.iconContainer}>
        <Feather name="sun" size={48} color={theme.colors.warning} />
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Feather name="wind" size={14} color={theme.colors.textMuted} />
          <Text style={styles.statText}>15 km/h</Text>
        </View>
        <View style={styles.stat}>
          <Feather name="droplet" size={14} color={theme.colors.textMuted} />
          <Text style={styles.statText}>45%</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xxxl * 2, // Space for custom tab bar
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: theme.radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  temperature: {
    fontSize: 36,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  details: {
    justifyContent: 'center',
  },
  condition: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '600',
  },
  location: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  iconContainer: {
    position: 'absolute',
    right: '35%',
    opacity: 0.8,
  },
  statsContainer: {
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
});
