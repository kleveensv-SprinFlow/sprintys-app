import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';
import { theme } from '../../../core/theme';
import { Feather } from '@expo/vector-icons';

export const AthleteGauges = () => {
  const handleCheckIn = () => {
    Alert.alert('Interface en cours de dev', "Cette fonctionnalité n'est pas encore prête.");
  };

  const drawSemiCircle = (percentage: number, color: string, radius: number, strokeWidth: number) => {
    const circum = Math.PI * radius;
    const strokeDashoffset = circum - (percentage / 100) * circum;
    return (
      <Svg width={radius * 2 + strokeWidth} height={radius + strokeWidth} viewBox={`0 0 ${radius * 2 + strokeWidth} ${radius + strokeWidth}`}>
        <G rotation="-180" origin={`${radius + strokeWidth/2}, ${radius + strokeWidth/2}`}>
          <Path
            d={`M${strokeWidth/2},${radius + strokeWidth/2} a${radius},${radius} 0 0,1 ${radius*2},0`}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <Path
            d={`M${strokeWidth/2},${radius + strokeWidth/2} a${radius},${radius} 0 0,1 ${radius*2},0`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circum}
            strokeDashoffset={strokeDashoffset}
          />
        </G>
      </Svg>
    );
  };

  const drawCircle = (percentage: number, color: string, radius: number, strokeWidth: number) => {
    const circum = 2 * Math.PI * radius;
    const strokeDashoffset = circum - (percentage / 100) * circum;
    return (
      <Svg width={radius * 2 + strokeWidth} height={radius * 2 + strokeWidth} viewBox={`0 0 ${radius * 2 + strokeWidth} ${radius * 2 + strokeWidth}`}>
        <G rotation="-90" origin={`${radius + strokeWidth/2}, ${radius + strokeWidth/2}`}>
          <Circle
            cx={radius + strokeWidth/2}
            cy={radius + strokeWidth/2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
          />
          <Circle
            cx={radius + strokeWidth/2}
            cy={radius + strokeWidth/2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circum}
            strokeDashoffset={strokeDashoffset}
          />
        </G>
      </Svg>
    );
  };

  return (
    <View style={styles.container}>
      {/* Left Gauge: Objectif (Semi-circle) */}
      <View style={styles.sideGaugeContainer}>
        {drawSemiCircle(75, theme.colors.accent, 40, 8)}
        <View style={styles.sideGaugeContent}>
          <Text style={styles.gaugeValue}>75%</Text>
          <Text style={styles.gaugeLabel}>Objectif</Text>
        </View>
      </View>

      {/* Center Gauge: Main Circular Gauge with Check-in */}
      <View style={styles.mainGaugeContainer}>
        {drawCircle(60, theme.colors.success, 70, 12)}
        <TouchableOpacity style={styles.checkInButton} onPress={handleCheckIn} activeOpacity={0.8}>
          <Feather name="check" size={32} color="#fff" />
          <Text style={styles.checkInText}>CHECK IN</Text>
        </TouchableOpacity>
      </View>

      {/* Right Gauge: Prochaine Compétition (Semi-circle) */}
      <View style={styles.sideGaugeContainer}>
        {drawSemiCircle(40, theme.colors.warning, 40, 8)}
        <View style={styles.sideGaugeContent}>
          <Text style={styles.gaugeValue}>J-12</Text>
          <Text style={styles.gaugeLabel}>Compétition</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  sideGaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 60,
  },
  sideGaugeContent: {
    position: 'absolute',
    bottom: -15,
    alignItems: 'center',
  },
  gaugeValue: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  gaugeLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  mainGaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    top: -10,
  },
  checkInButton: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkInText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
    letterSpacing: 1,
  },
});
