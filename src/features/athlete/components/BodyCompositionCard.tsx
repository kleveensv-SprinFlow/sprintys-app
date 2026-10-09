import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../core/theme';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useBodyStore } from '../../../store/bodyStore';
import { useAuthStore } from '../../../store/authStore';

export const BodyCompositionCard = () => {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { metrics, loadMetrics } = useBodyStore();

  useEffect(() => {
    if (user?.id) {
      loadMetrics(user.id);
    }
  }, [user]);

  const latestMetric = metrics[metrics.length - 1];

  const weight = latestMetric ? latestMetric.weight : (user?.weight || '--');
  const bodyFat = latestMetric?.body_fat ? `${latestMetric.body_fat}%` : null;
  const muscleMass = latestMetric?.muscle_mass_kg ? `${latestMetric.muscle_mass_kg}kg` : null;

  const currentWeightNum = Number(latestMetric?.weight || user?.weight || 0);
  const startWeightNum = Number(user?.startWeight || (metrics.length > 0 ? metrics[0]?.weight : 0) || currentWeightNum);
  const targetWeightNum = Number(user?.targetWeight || 0);

  const hasTarget = targetWeightNum > 0 && startWeightNum > 0 && currentWeightNum > 0;
  
  let progressPercent = 0;
  let remainingKg = 0;
  let diffFromStart = 0;

  if (hasTarget) {
    const totalDist = Math.abs(startWeightNum - targetWeightNum);
    diffFromStart = currentWeightNum - startWeightNum;
    remainingKg = Math.abs(currentWeightNum - targetWeightNum);

    if (totalDist > 0) {
      const isLoss = targetWeightNum < startWeightNum;
      const progressRatio = isLoss 
        ? (startWeightNum - currentWeightNum) / totalDist 
        : (currentWeightNum - startWeightNum) / totalDist;
      progressPercent = Math.min(100, Math.max(0, Math.round(progressRatio * 100)));
    } else {
      progressPercent = 100;
    }
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.sectionHeader}>
        <Feather name="activity" size={18} color={theme.colors.text} />
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Composition Corporelle</Text>
      </View>

      <TouchableOpacity 
        style={styles.cardsRow}
        activeOpacity={0.85}
        onPress={() => router.push('/(athlete)/body')}
      >
        {/* Carte 1 : Masse Grasse */}
        <View style={[styles.sideCard, { backgroundColor: '#FFFBEB', borderColor: '#FEF3C7' }]}>
          <View style={[styles.statDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={[styles.sideValue, { color: theme.colors.text }]}>
            {bodyFat || '--'}
          </Text>
          <Text style={[styles.sideLabel, { color: '#B45309' }]}>
            Masse Grasse
          </Text>
        </View>

        {/* Carte 2 (Centrale) : Poids Actuel */}
        <View style={[styles.centerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.centerRing, { borderColor: '#0066FF' }]}>
            <Text style={[styles.centerValue, { color: theme.colors.text }]}>{weight}</Text>
            <Text style={[styles.centerUnit, { color: theme.colors.textSecondary }]}>kg</Text>
          </View>
          <Text style={[styles.centerLabel, { color: theme.colors.text }]}>
            Poids Actuel
          </Text>
        </View>

        {/* Carte 3 : Masse Musculaire */}
        <View style={[styles.sideCard, { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' }]}>
          <View style={[styles.statDot, { backgroundColor: '#10B981' }]} />
          <Text style={[styles.sideValue, { color: theme.colors.text }]}>
            {muscleMass || '--'}
          </Text>
          <Text style={[styles.sideLabel, { color: '#047857' }]}>
            Masse Muscle
          </Text>
        </View>
      </TouchableOpacity>

      {/* Barre de progression du poids (Objectif Point 0 -> Point B) */}
      {hasTarget ? (
        <TouchableOpacity 
          style={[styles.progressCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          activeOpacity={0.85}
          onPress={() => router.push('/(athlete)/body')}
        >
          <View style={styles.progressTopRow}>
            <View style={styles.pointBlock}>
              <Text style={[styles.pointLabel, { color: theme.colors.textMuted }]}>Départ</Text>
              <Text style={[styles.pointVal, { color: theme.colors.text }]}>
                {startWeightNum} <Text style={styles.pointUnit}>kg</Text>
              </Text>
            </View>

            <View style={[styles.currentBadge, { backgroundColor: theme.colors.surfaceLight }]}>
              <Feather 
                name={diffFromStart < -0.05 ? 'trending-down' : diffFromStart > 0.05 ? 'trending-up' : 'minus'} 
                size={13} 
                color={diffFromStart < -0.05 ? '#10B981' : diffFromStart > 0.05 ? '#0066FF' : theme.colors.textMuted} 
              />
              <Text style={[styles.currentText, { color: theme.colors.text }]}>
                {currentWeightNum} kg ({diffFromStart > 0 ? `+${diffFromStart.toFixed(1)}` : `${diffFromStart.toFixed(1)}`} kg)
              </Text>
            </View>

            <View style={[styles.pointBlock, { alignItems: 'flex-end' }]}>
              <Text style={[styles.pointLabel, { color: theme.colors.textMuted }]}>Cible</Text>
              <Text style={[styles.pointVal, { color: '#0066FF' }]}>
                {targetWeightNum} <Text style={styles.pointUnit}>kg</Text>
              </Text>
            </View>
          </View>

          {/* Barre de progression */}
          <View style={[styles.progressBarTrack, { backgroundColor: theme.colors.border }]}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: '#0066FF' }]} />
          </View>

          <View style={styles.progressBottomRow}>
            <Text style={[styles.progressSubtitle, { color: theme.colors.textSecondary }]}>
              {remainingKg <= 0.1 
                ? '🎯 Objectif atteint !' 
                : `Encore ${remainingKg.toFixed(1)} kg pour atteindre ta cible`}
            </Text>
            <Text style={[styles.progressPercentText, { color: '#0066FF' }]}>{progressPercent}%</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          style={[styles.emptyProgressCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          activeOpacity={0.8}
          onPress={() => router.push('/(athlete)/nutrition')}
        >
          <View style={styles.emptyLeft}>
            <View style={[styles.emptyIconCircle, { backgroundColor: theme.colors.surfaceLight }]}>
              <Feather name="target" size={15} color="#0066FF" />
            </View>
            <Text style={[styles.emptyProgressText, { color: theme.colors.textSecondary }]}>
              Définis un poids cible dans tes repères pour voir ta progression
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  sideCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 8,
  },
  sideValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  sideLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  centerCard: {
    flex: 1.25,
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  centerRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  centerValue: {
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  centerUnit: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: -2,
  },
  centerLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  progressCard: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  progressTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pointBlock: {
    minWidth: 60,
  },
  pointLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  pointVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  pointUnit: {
    fontSize: 11,
    fontWeight: '600',
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  currentText: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  progressPercentText: {
    fontSize: 12,
    fontWeight: '800',
  },
  emptyProgressCard: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emptyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  emptyIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyProgressText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
});
