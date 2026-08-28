import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';

export const AthleteWeatherCard = () => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.leftContent}>
        <Text style={[styles.temperature, { color: theme.colors.text }]}>24°</Text>
        <View style={styles.details}>
          <Text style={[styles.condition, { color: theme.colors.text }]}>Ensoleillé</Text>
          <Text style={[styles.location, { color: theme.colors.textSecondary }]}>Paris, France</Text>
        </View>
      </View>
      
      <View style={styles.iconContainer}>
        <Feather name="sun" size={48} color={theme.colors.warning} />
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Feather name="wind" size={14} color={theme.colors.textMuted} />
          <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>15 km/h</Text>
        </View>
        <View style={styles.stat}>
          <Feather name="droplet" size={14} color={theme.colors.textMuted} />
          <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>45%</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 96, // Space for custom tab bar
    padding: 16,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  temperature: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  details: {
    justifyContent: 'center',
  },
  condition: {
    fontSize: 16,
    fontWeight: '600',
  },
  location: {
    fontSize: 12,
    marginTop: 2,
  },
  iconContainer: {
    position: 'absolute',
    right: '35%',
    opacity: 0.8,
  },
  statsContainer: {
    alignItems: 'flex-end',
    gap: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
  },
});
