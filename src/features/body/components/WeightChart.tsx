import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Polyline } from 'react-native-svg';
import { useBodyStore } from '../../../store/bodyStore';
import { theme } from '../../../core/theme';

const { width } = Dimensions.get('window');
const CHART_HEIGHT = 150;
const CHART_WIDTH = width - 80;

export const WeightChart: React.FC = React.memo(() => {
  const { metrics } = useBodyStore();
  
  // Need at least 2 points for a chart
  if (metrics.length < 2) return null;

  // Take last 7 measurements and reverse for chronological order
  const data = [...metrics].slice(0, 7).reverse();
  const weights = data.map(m => m.weight);
  
  const minWeight = Math.min(...weights) - 1;
  const maxWeight = Math.max(...weights) + 1;
  const range = maxWeight - minWeight;

  const points = data.map((m, i) => {
    const x = (i / (data.length - 1)) * CHART_WIDTH;
    const y = CHART_HEIGHT - ((m.weight - minWeight) / range) * CHART_HEIGHT;
    return `${x},${y}`;
  }).join(' ');

  return (
    <View style={styles.container}>
      <Svg height={CHART_HEIGHT} width={CHART_WIDTH}>
        <Polyline
          points={points}
          fill="none"
          stroke={theme.colors.accent}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: CHART_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: theme.spacing.xl,
  },
});
