import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../core/theme';
import { useNutritionStore } from '../../../store/nutrition/nutritionStore';
import { useAuthStore } from '../../../store/authStore';
import Svg, { Circle, ClipPath, Defs, Path, Rect } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withRepeat, withTiming, Easing, withSpring } from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export const NutritionSummary: React.FC = () => {
  const theme = useTheme();
  const mealLogs = useNutritionStore((state) => state.mealLogs);
  const user = useAuthStore((state) => state.user);

  const kcalGoal = user?.manualKcalGoal || 2000;

  const consumedKcal = mealLogs.reduce((sum, log) => sum + Number(log.calories), 0);
  const consumedPro = mealLogs.reduce((sum, log) => sum + Number(log.proteines), 0);
  const consumedGlu = mealLogs.reduce((sum, log) => sum + Number(log.glucides), 0);
  const consumedLip = mealLogs.reduce((sum, log) => sum + Number(log.lipides), 0);

  const proGoal = Math.round((kcalGoal * 0.3) / 4);
  const gluGoal = Math.round((kcalGoal * 0.4) / 4);
  const lipGoal = Math.round((kcalGoal * 0.3) / 9);

  const remainingKcal = Math.max(0, kcalGoal - consumedKcal);
  const fillPercentage = Math.min(1, consumedKcal / kcalGoal);

  // Animation values
  const waveOffset = useSharedValue(0);
  const heightAnim = useSharedValue(0);

  useEffect(() => {
    // Animate the wave horizontally infinitely
    waveOffset.value = withRepeat(
      withTiming(2 * Math.PI, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );
    // Animate the liquid height when data changes
    heightAnim.value = withSpring(fillPercentage, { damping: 15 });
  }, [fillPercentage]);

  const animatedProps = useAnimatedProps(() => {
    // Wave parameters
    const size = 160;
    const amplitude = 8;
    const frequency = 0.05;
    const liquidHeight = (1 - heightAnim.value) * size;
    
    // Generate a simple sine wave path
    let path = `M 0 ${size} L 0 ${liquidHeight}`;
    for (let x = 0; x <= size; x += 5) {
      const y = liquidHeight + Math.sin(x * frequency + waveOffset.value) * amplitude;
      path += ` L ${x} ${y}`;
    }
    path += ` L ${size} ${size} Z`;
    
    return {
      d: path
    };
  });

  const renderProgressBar = (label: string, current: number, max: number, color: string) => {
    const percent = Math.min(100, max > 0 ? (current / max) * 100 : 0);
    return (
      <View style={styles.macroRow}>
        <View style={styles.macroHeader}>
          <Text style={[styles.macroLabel, { color: theme.colors.text }]}>{label}</Text>
          <Text style={[styles.macroValue, { color: theme.colors.textSecondary }]}>
            {Math.round(current)} / {max}g
          </Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: theme.colors.border }]}>
          <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: color }]} />
        </View>
      </View>
    );
  };

  const SIZE = 160;
  const STROKE_WIDTH = 12;
  const RADIUS = (SIZE - STROKE_WIDTH) / 2;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      
      {/* DONUT LIQUID GAUGE */}
      <View style={styles.gaugeContainer}>
        <View style={{ width: SIZE, height: SIZE, position: 'relative' }}>
          <Svg width={SIZE} height={SIZE}>
            <Defs>
              <ClipPath id="circleClip">
                <Circle cx={SIZE/2} cy={SIZE/2} r={RADIUS - 5} />
              </ClipPath>
            </Defs>

            {/* Background Circle */}
            <Circle 
              cx={SIZE/2} cy={SIZE/2} r={RADIUS} 
              stroke={theme.colors.border} 
              strokeWidth={STROKE_WIDTH} 
              fill="none" 
            />
            
            {/* Liquid Fill */}
            <AnimatedPath
              animatedProps={animatedProps}
              fill={theme.colors.accent}
              fillOpacity={0.8}
              clipPath="url(#circleClip)"
            />

            {/* Foreground Border */}
            <Circle 
              cx={SIZE/2} cy={SIZE/2} r={RADIUS} 
              stroke={theme.colors.accent} 
              strokeWidth={STROKE_WIDTH} 
              strokeOpacity={0.2}
              fill="none" 
            />
          </Svg>

          {/* Text inside */}
          <View style={styles.centerTextContainer}>
            <Text style={[styles.remainingValue, { color: theme.colors.text }]}>{Math.round(remainingKcal)}</Text>
            <Text style={[styles.remainingLabel, { color: theme.colors.textSecondary }]}>Kcal restants</Text>
          </View>
        </View>
      </View>

      {/* MACROS */}
      <View style={styles.macrosContainer}>
        {renderProgressBar('Protéines', consumedPro, proGoal, '#FF6B6B')}
        {renderProgressBar('Glucides', consumedGlu, gluGoal, '#4ECDC4')}
        {renderProgressBar('Lipides', consumedLip, lipGoal, '#FFE66D')}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 20,
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  gaugeContainer: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  centerTextContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  remainingValue: {
    fontSize: 32,
    fontWeight: '900',
  },
  remainingLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  macrosContainer: {
    gap: 16,
  },
  macroRow: {
    gap: 8,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  macroValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  }
});
