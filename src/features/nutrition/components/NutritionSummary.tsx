import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../core/theme';
import { useNutritionStore } from '../../../store/nutrition/nutritionStore';
import { useAuthStore } from '../../../store/authStore';
import Svg, { Circle, ClipPath, Defs, LinearGradient as SvgGradient, Stop, Path } from 'react-native-svg';
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
    waveOffset.value = withRepeat(
      withTiming(2 * Math.PI, { duration: 3200, easing: Easing.linear }),
      -1,
      false
    );
    heightAnim.value = withSpring(fillPercentage, { damping: 15 });
  }, [fillPercentage]);

  const SIZE = 170;
  const STROKE_WIDTH = 10;
  const RADIUS = (SIZE - STROKE_WIDTH) / 2;

  const animatedProps = useAnimatedProps(() => {
    const amplitude = 6;
    const frequency = 0.045;
    // Map liquid level from bottom (SIZE) up to a max of 75% height to prevent overlapping the central text
    const maxLiquidHeight = SIZE * 0.72;
    const liquidHeight = SIZE - (heightAnim.value * maxLiquidHeight);
    
    let path = `M 0 ${SIZE} L 0 ${liquidHeight}`;
    for (let x = 0; x <= SIZE; x += 5) {
      const y = liquidHeight + Math.sin(x * frequency + waveOffset.value) * amplitude;
      path += ` L ${x} ${y}`;
    }
    path += ` L ${SIZE} ${SIZE} Z`;
    
    return {
      d: path
    };
  });

  const renderProgressBar = (label: string, current: number, max: number, color: string) => {
    const percent = Math.min(100, max > 0 ? (current / max) * 100 : 0);
    return (
      <View style={styles.macroRow} key={label}>
        <View style={styles.macroHeader}>
          <View style={styles.macroTitleGroup}>
            <View style={[styles.macroDot, { backgroundColor: color }]} />
            <Text style={[styles.macroLabel, { color: theme.colors.text }]}>{label}</Text>
          </View>
          <View style={styles.macroValueGroup}>
            <Text style={[styles.macroValue, { color: theme.colors.text }]}>
              {Math.round(current)} <Text style={[styles.macroMax, { color: theme.colors.textSecondary }]}>/ {max}g</Text>
            </Text>
            <Text style={[styles.macroPercent, { color: theme.colors.textSecondary }]}>
              {Math.round(percent)}%
            </Text>
          </View>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: theme.colors.border }]}>
          <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: color }]} />
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      
      {/* JAUGE CENTRALE LUMINEUSE AVEC VAGUE DOUCE */}
      <View style={styles.gaugeContainer}>
        <View style={{ width: SIZE, height: SIZE, position: 'relative' }}>
          <Svg width={SIZE} height={SIZE}>
            <Defs>
              <ClipPath id="circleClip">
                <Circle cx={SIZE/2} cy={SIZE/2} r={RADIUS - 4} />
              </ClipPath>
              <SvgGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#0069E8" />
                <Stop offset="50%" stopColor="#00D2FF" />
                <Stop offset="100%" stopColor="#00E5A3" />
              </SvgGradient>
              <SvgGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#0069E8" stopOpacity={0.25} />
                <Stop offset="100%" stopColor="#00D2FF" stopOpacity={0.12} />
              </SvgGradient>
            </Defs>

            {/* Anneau de fond */}
            <Circle 
              cx={SIZE/2} cy={SIZE/2} r={RADIUS} 
              stroke={theme.colors.border} 
              strokeWidth={STROKE_WIDTH} 
              strokeOpacity={0.5}
              fill="none" 
            />
            
            {/* Vague Liquide Translucide */}
            <AnimatedPath
              animatedProps={animatedProps}
              fill="url(#waveGradient)"
              clipPath="url(#circleClip)"
            />

            {/* Anneau Lumineux Extérieur */}
            <Circle 
              cx={SIZE/2} cy={SIZE/2} r={RADIUS} 
              stroke="url(#ringGradient)" 
              strokeWidth={STROKE_WIDTH} 
              strokeDasharray={`${2 * Math.PI * RADIUS}`}
              strokeDashoffset={`${2 * Math.PI * RADIUS * (1 - fillPercentage)}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${SIZE/2} ${SIZE/2})`}
              fill="none" 
            />
          </Svg>

          {/* Texte central haute lisibilité */}
          <View style={styles.centerTextContainer}>
            <Text style={[styles.remainingValue, { color: theme.colors.text }]}>
              {Math.round(remainingKcal)}
            </Text>
            <Text style={[styles.remainingLabel, { color: theme.colors.textSecondary }]}>
              KCAL RESTANTS
            </Text>
            <Text style={[styles.consumedSub, { color: theme.colors.textMuted }]}>
              {Math.round(consumedKcal)} / {kcalGoal} consommés
            </Text>
          </View>
        </View>
      </View>

      {/* MACROS REVISITÉS */}
      <View style={styles.macrosContainer}>
        {renderProgressBar('Protéines', consumedPro, proGoal, '#FF5252')}
        {renderProgressBar('Glucides', consumedGlu, gluGoal, '#00C9A7')}
        {renderProgressBar('Lipides', consumedLip, lipGoal, '#FFB703')}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  gaugeContainer: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 6,
  },
  centerTextContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  remainingValue: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  remainingLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  consumedSub: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  macrosContainer: {
    gap: 14,
  },
  macroRow: {
    gap: 6,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  macroValueGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  macroValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  macroMax: {
    fontSize: 12,
    fontWeight: '500',
  },
  macroPercent: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'right',
  },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  }
});
