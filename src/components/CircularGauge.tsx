import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface CircularGaugeProps {
  score: number; // 0 à 100
  size?: number;
  strokeWidth?: number;
  label: string;
  unit?: string;
  color?: string;
}

export const CircularGauge: React.FC<CircularGaugeProps> = ({
  score,
  size = 72,
  strokeWidth = 6,
  label,
  unit = '%',
  color,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const strokeDashoffset = circumference - (circumference * clampedScore) / 100;

  const defaultColor =
    clampedScore >= 75 ? '#10B981' : clampedScore >= 50 ? '#F59E0B' : '#EF4444';
  const finalColor = color || defaultColor;

  return (
    <View style={[styles.container, { width: size }]}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size}>
          {/* Cercle d'arrière-plan */}
          <Circle
            stroke="#E2E8F0"
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
          />
          {/* Cercle de progression */}
          <Circle
            stroke={finalColor}
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={styles.centerText}>
          <Text style={[styles.scoreValue, { color: finalColor }]}>
            {clampedScore}
            <Text style={styles.unitText}>{unit}</Text>
          </Text>
        </View>
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 4,
  },
  centerText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  unitText: {
    fontSize: 10,
    fontWeight: '600',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
});
