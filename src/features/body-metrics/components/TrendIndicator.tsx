import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface TrendIndicatorProps {
  currentValue: number;
  previousValue?: number;
  unit?: string;
  inverseColors?: boolean; // For weight/bf, lower is usually considered "good" (green) depending on goals, but we'll stick to basic red/green or neutral
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({ 
  currentValue, 
  previousValue, 
  unit = '',
  inverseColors = false
}) => {
  if (previousValue === undefined) {
    return (
      <View style={styles.container}>
        <Text style={styles.neutralText}>-</Text>
      </View>
    );
  }

  const diff = currentValue - previousValue;
  
  if (diff === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.neutralText}>=</Text>
      </View>
    );
  }

  const isPositive = diff > 0;
  const icon = isPositive ? '↗️' : '↘️';
  
  // Assuming for weight/bf, decreasing is "green" and increasing is "red" if inverseColors is true
  let color = '#aaa'; // neutral
  if (inverseColors) {
    color = isPositive ? '#ff4444' : '#4CAF50';
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.text, { color }]}>
        {icon} {Math.abs(diff).toFixed(1)}{unit}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  neutralText: {
    color: '#666',
    fontSize: 12,
  }
});
