import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../core/theme';
import { useNutritionStore } from '../../../store/nutrition/nutritionStore';
import { useAuthStore } from '../../../store/authStore';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

interface NutritionSummaryProps {
  athleteProfile?: any;
}

export const NutritionSummary: React.FC<NutritionSummaryProps> = ({ athleteProfile }) => {
  const theme = useTheme();
  const mealLogs = useNutritionStore((state) => state.mealLogs);
  const user = useAuthStore((state) => state.user);

  const activeProfile = athleteProfile || user;
  const kcalGoal = activeProfile?.manualKcalGoal || activeProfile?.manual_kcal_goal || 2000;

  const consumedKcal = mealLogs.reduce((sum, log) => sum + Number(log.calories), 0);
  const consumedPro = mealLogs.reduce((sum, log) => sum + Number(log.proteines), 0);
  const consumedGlu = mealLogs.reduce((sum, log) => sum + Number(log.glucides), 0);
  const consumedLip = mealLogs.reduce((sum, log) => sum + Number(log.lipides), 0);

  const proGoal = Math.round((kcalGoal * 0.3) / 4);
  const gluGoal = Math.round((kcalGoal * 0.4) / 4);
  const lipGoal = Math.round((kcalGoal * 0.3) / 9);

  const remainingKcal = Math.max(0, kcalGoal - consumedKcal);
  const fillPercentage = Math.min(1, kcalGoal > 0 ? consumedKcal / kcalGoal : 0);

  const SIZE = 156;
  const STROKE_WIDTH = 8;
  const RADIUS = (SIZE - STROKE_WIDTH) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeDashoffset = CIRCUMFERENCE * (1 - fillPercentage);

  const MACROS = [
    {
      key: 'pro',
      label: 'Protéines',
      current: consumedPro,
      goal: proGoal,
      color: '#F43F5E', // Corail / Rose doux
      bgColor: 'rgba(244, 63, 94, 0.08)',
    },
    {
      key: 'glu',
      label: 'Glucides',
      current: consumedGlu,
      goal: gluGoal,
      color: '#10B981', // Émeraude / Menthe fraîche
      bgColor: 'rgba(16, 185, 129, 0.08)',
    },
    {
      key: 'lip',
      label: 'Lipides',
      current: consumedLip,
      goal: lipGoal,
      color: '#F59E0B', // Ambre chaud
      bgColor: 'rgba(245, 158, 11, 0.08)',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      {/* JAUGE CENTRALE ÉPURÉE SANS GADGET */}
      <View style={styles.gaugeContainer}>
        <View style={{ width: SIZE, height: SIZE, position: 'relative' }}>
          <Svg width={SIZE} height={SIZE}>
            <Defs>
              <SvgGradient id="cleanRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#0284C7" />
                <Stop offset="60%" stopColor="#0EA5E9" />
                <Stop offset="100%" stopColor="#38BDF8" />
              </SvgGradient>
            </Defs>

            {/* Piste de fond douce */}
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={theme.colors.border}
              strokeWidth={STROKE_WIDTH}
              strokeOpacity={0.4}
              fill="none"
            />

            {/* Anneau de progression actif */}
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke="url(#cleanRingGradient)"
              strokeWidth={STROKE_WIDTH}
              strokeDasharray={`${CIRCUMFERENCE}`}
              strokeDashoffset={`${strokeDashoffset}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              fill="none"
            />
          </Svg>

          {/* Chiffres au centre */}
          <View style={styles.centerTextContainer}>
            <Text style={[styles.remainingValue, { color: theme.colors.text }]}>
              {Math.round(remainingKcal)}
            </Text>
            <Text style={[styles.remainingLabel, { color: theme.colors.textSecondary }]}>
              KCAL RESTANTES
            </Text>
            <Text style={[styles.consumedSub, { color: theme.colors.textMuted }]}>
              {Math.round(consumedKcal)} / {kcalGoal} consommées
            </Text>
          </View>
        </View>
      </View>

      {/* 3 MACROS EN 3 COLONNES CÔTE À CÔTE */}
      <View style={styles.macrosRow}>
        {MACROS.map((macro) => {
          const percent = Math.min(100, macro.goal > 0 ? (macro.current / macro.goal) * 100 : 0);
          return (
            <View
              key={macro.key}
              style={[
                styles.macroCard,
                {
                  backgroundColor: theme.colors.background || '#F8FAFC',
                  borderColor: theme.colors.border,
                },
              ]}
            >
              {/* En-tête : Dot + Nom */}
              <View style={styles.macroHeader}>
                <View style={[styles.macroDot, { backgroundColor: macro.color }]} />
                <Text style={[styles.macroLabel, { color: theme.colors.text }]}>
                  {macro.label}
                </Text>
              </View>

              {/* Valeurs : Consommé / Objectif */}
              <View style={styles.macroValueRow}>
                <Text style={[styles.macroCurrentValue, { color: theme.colors.text }]}>
                  {Math.round(macro.current)}
                </Text>
                <Text style={[styles.macroGoalValue, { color: theme.colors.textSecondary }]}>
                  /{macro.goal}g
                </Text>
              </View>

              {/* Barre de progression fine et arrondie */}
              <View style={[styles.macroTrack, { backgroundColor: theme.colors.border }]}>
                <View
                  style={[
                    styles.macroFill,
                    {
                      width: `${percent}%`,
                      backgroundColor: macro.color,
                    },
                  ]}
                />
              </View>

              {/* Pourcentage */}
              <Text style={[styles.macroPercentText, { color: theme.colors.textMuted }]}>
                {Math.round(percent)}%
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  gaugeContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 2,
  },
  centerTextContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  remainingValue: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  remainingLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginTop: 2,
  },
  consumedSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macroCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  macroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  macroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  macroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  macroCurrentValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  macroGoalValue: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 1,
  },
  macroTrack: {
    height: 4,
    borderRadius: 2,
    width: '100%',
    overflow: 'hidden',
    marginBottom: 6,
  },
  macroFill: {
    height: '100%',
    borderRadius: 2,
  },
  macroPercentText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
