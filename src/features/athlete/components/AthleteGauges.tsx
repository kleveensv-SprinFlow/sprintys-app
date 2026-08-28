import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';
import { useTheme } from '../../../core/theme';
import { Feather } from '@expo/vector-icons';
import { CheckInModal } from '../../checkin/components/CheckInModal';
import { useCheckInStore } from '../../../store/checkInStore';
import { useAuthStore } from '../../../store/authStore';

export const AthleteGauges = () => {
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  
  const { user } = useAuthStore();
  const { startCheckIn, loadHistory, todayHealthScore } = useCheckInStore();

  useEffect(() => {
    if (user?.id) {
      loadHistory(user.id);
    }
  }, [user]);

  const handleCheckIn = () => {
    if (user?.id) {
      startCheckIn(user.id);
      setModalVisible(true);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return theme.colors.success;
    if (score >= 40) return theme.colors.warning;
    return theme.colors.error;
  };

  const scoreValue = todayHealthScore !== null ? todayHealthScore : 0;
  const scoreColor = todayHealthScore !== null ? getScoreColor(scoreValue) : theme.colors.border;
  const showScore = todayHealthScore !== null;

  const drawSemiCircle = (percentage: number, color: string, radius: number, strokeWidth: number) => {
    const circum = Math.PI * radius;
    const strokeDashoffset = circum - (percentage / 100) * circum;
    return (
      <Svg width={radius * 2 + strokeWidth} height={radius + strokeWidth} viewBox={`0 0 ${radius * 2 + strokeWidth} ${radius + strokeWidth}`}>
        <G rotation="-180" origin={`${radius + strokeWidth/2}, ${radius + strokeWidth/2}`}>
          <Path
            d={`M${strokeWidth/2},${radius + strokeWidth/2} a${radius},${radius} 0 0,1 ${radius*2},0`}
            fill="none"
            stroke={theme.colors.border}
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
            stroke={theme.colors.border}
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
          <Text style={[styles.gaugeValue, { color: theme.colors.text }]}>75%</Text>
          <Text style={[styles.gaugeLabel, { color: theme.colors.textMuted }]}>Objectif</Text>
        </View>
      </View>

      {/* Center Gauge: Main Circular Gauge with Check-in */}
      <View style={styles.mainGaugeContainer}>
        {drawCircle(scoreValue, scoreColor, 70, 12)}
        
        {showScore ? (
          <View style={styles.scoreContent}>
            <Text style={[styles.scoreValue, { color: scoreColor }]}>{scoreValue}%</Text>
            <Text style={[styles.scoreLabel, { color: theme.colors.textMuted }]}>SANTÉ</Text>
          </View>
        ) : (
          <TouchableOpacity style={[styles.checkInButton, { backgroundColor: theme.colors.surfaceLight }]} onPress={handleCheckIn} activeOpacity={0.8}>
            <Feather name="check" size={32} color={theme.colors.success} />
            <Text style={[styles.checkInText, { color: theme.colors.text }]}>CHECK IN</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Right Gauge: Prochaine Compétition (Semi-circle) */}
      <View style={styles.sideGaugeContainer}>
        {drawSemiCircle(40, theme.colors.warning, 40, 8)}
        <View style={styles.sideGaugeContent}>
          <Text style={[styles.gaugeValue, { color: theme.colors.text }]}>J-12</Text>
          <Text style={[styles.gaugeLabel, { color: theme.colors.textMuted }]}>Compétition</Text>
        </View>
      </View>
      
      <CheckInModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 24,
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
    fontSize: 14,
    fontWeight: 'bold',
  },
  gaugeLabel: {
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkInText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
    letterSpacing: 1,
  },
  scoreContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
