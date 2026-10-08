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

  const isExceeded = consumedKcal > kcalGoal;
  const remainingKcal = isExceeded ? consumedKcal - kcalGoal : Math.max(0, kcalGoal - consumedKcal);
  const fillPercentage = Math.min(1, kcalGoal > 0 ? consumedKcal / kcalGoal : 0);

  // Configuration géométrique aérée (180px pour un espace intérieur confortable)
  const SIZE = 180;
  const STROKE_WIDTH = 10;
  const RADIUS = (SIZE - STROKE_WIDTH) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeDashoffset = CIRCUMFERENCE * (1 - fillPercentage);

  // Palette dynamique inspirée de l'image de référence
  const getStatusConfig = () => {
    if (isExceeded) {
      return {
        startColor: '#EF4444',
        endColor: '#F43F5E',
        knobColor: '#F43F5E',
        badgeBg: 'rgba(244, 63, 94, 0.12)',
        badgeText: '#E11D48',
        badgeLabel: 'DÉPASSÉ',
      };
    }
    if (fillPercentage >= 0.85 || remainingKcal <= 250) {
      return {
        startColor: '#F59E0B',
        endColor: '#FB923C',
        knobColor: '#FB923C',
        badgeBg: 'rgba(245, 158, 11, 0.12)',
        badgeText: '#D97706',
        badgeLabel: 'RESTANTES',
      };
    }
    return {
      startColor: '#059669',
      endColor: '#06B6D4',
      knobColor: '#06B6D4',
      badgeBg: 'rgba(6, 182, 212, 0.12)',
      badgeText: '#0891B2',
      badgeLabel: 'RESTANTES',
    };
  };

  const statusConfig = getStatusConfig();

  // Position du curseur (knob) signature à l'extrémité de l'arc
  const knobAngle = -Math.PI / 2 + fillPercentage * 2 * Math.PI;
  const knobX = SIZE / 2 + RADIUS * Math.cos(knobAngle);
  const knobY = SIZE / 2 + RADIUS * Math.sin(knobAngle);

  const MACROS = [
    {
      key: 'pro',
      label: 'Protéines',
      current: consumedPro,
      goal: proGoal,
      color: '#F43F5E',
    },
    {
      key: 'glu',
      label: 'Glucides',
      current: consumedGlu,
      goal: gluGoal,
      color: '#10B981',
    },
    {
      key: 'lip',
      label: 'Lipides',
      current: consumedLip,
      goal: lipGoal,
      color: '#F59E0B',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      {/* JAUGE CIRCULAIRE STYLE INSTRUMENT DE PRÉCISION */}
      <View style={styles.gaugeContainer}>
        <View style={{ width: SIZE, height: SIZE, position: 'relative' }}>
          <Svg width={SIZE} height={SIZE}>
            <Defs>
              <SvgGradient id="dynamicArcGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={statusConfig.startColor} />
                <Stop offset="100%" stopColor={statusConfig.endColor} />
              </SvgGradient>
            </Defs>

            {/* Piste de fond ultra-fine (comme l'image de référence) */}
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={theme.colors.border}
              strokeWidth={2.5}
              strokeOpacity={0.45}
              fill="none"
            />

            {/* Arc de progression avec bouts arrondis */}
            {fillPercentage > 0 && (
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                stroke="url(#dynamicArcGradient)"
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={`${CIRCUMFERENCE}`}
                strokeDashoffset={`${strokeDashoffset}`}
                strokeLinecap="round"
                transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                fill="none"
              />
            )}

            {/* Curseur signature rond avec centre blanc à l'extrémité de l'arc */}
            {fillPercentage > 0.02 && (
              <>
                <Circle
                  cx={knobX}
                  cy={knobY}
                  r={7.5}
                  fill={statusConfig.knobColor}
                />
                <Circle
                  cx={knobX}
                  cy={knobY}
                  r={3.5}
                  fill="#FFFFFF"
                />
              </>
            )}
          </Svg>

          {/* Textes intérieurs parfaitement aérés et centrés */}
          <View style={styles.centerTextContainer}>
            {/* Badge pilule discret inspiré de l'image */}
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.badgeBg }]}>
              <Text style={[styles.statusBadgeText, { color: statusConfig.badgeText }]}>
                {statusConfig.badgeLabel}
              </Text>
            </View>

            {/* Grand chiffre héros net */}
            <Text style={[styles.remainingValue, { color: theme.colors.text }]}>
              {Math.round(remainingKcal)}
            </Text>

            {/* Sous-titre propre sans aucun débordement */}
            <Text style={[styles.consumedSub, { color: theme.colors.textSecondary }]}>
              sur {kcalGoal.toLocaleString('fr-FR')} kcal
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
    paddingTop: 18,
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
    paddingHorizontal: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  remainingValue: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 44,
  },
  consumedSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
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
