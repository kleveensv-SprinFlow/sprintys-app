import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../../../core/theme';
import { glassCard } from '../../../core/glass';
import { GlassSheen } from '../../../shared/components/GlassSheen';
import { PressableScale } from '../../../shared/components/PressableScale';
import { Skeleton } from '../../../shared/components/Skeleton';
import {
  teamWeeklySummaryService,
  TeamWeeklySummaryResult,
} from '../../../services/teamWeeklySummaryService';

interface Props {
  teamId?: string;
  teamName?: string;
}

const BLUE = theme.colors.sprintyBlue;
const BLUE_TINT = 'rgba(0, 105, 232, 0.08)';

export const TeamWeeklySummaryCard = ({ teamId, teamName = 'Équipe' }: Props) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<TeamWeeklySummaryResult | null>(null);

  const loadSummary = useCallback(
    async (force = false) => {
      if (!teamId) return;
      if (force) setRefreshing(true);
      else setLoading(true);

      try {
        const result = await teamWeeklySummaryService.getOrGenerateWeeklySummary(teamId, teamName, force);
        setData(result);
      } catch (err) {
        console.error('Erreur chargement résumé hebdo:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [teamId, teamName]
  );

  useEffect(() => {
    loadSummary(false);
  }, [loadSummary]);

  const handleRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadSummary(true);
  };

  if (!teamId) return null;

  if (loading && !data) {
    return (
      <View style={{ marginBottom: 16 }}>
        <Text style={styles.sectionTitle}>BILAN DE LA SEMAINE</Text>
        <View style={[glassCard, styles.card]}>
          <Skeleton width="50%" height={14} style={{ marginBottom: 12 }} />
          <View style={styles.metricsGrid}>
            <Skeleton width="48%" height={56} style={{ borderRadius: 12 }} />
            <Skeleton width="48%" height={56} style={{ borderRadius: 12 }} />
          </View>
          <Skeleton width="100%" height={80} style={{ marginTop: 12, borderRadius: 12 }} />
        </View>
      </View>
    );
  }

  if (!data) return null;

  const { stats, aiLines, isFallback } = data;

  // Statut forme
  const formColor =
    stats.avgHealthScore === null
      ? theme.colors.textMuted
      : stats.avgHealthScore >= 70
      ? theme.colors.success
      : stats.avgHealthScore >= 40
      ? theme.colors.warning
      : theme.colors.error;

  return (
    <View style={{ marginBottom: 16 }}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>BILAN HEBDOMADAIRE</Text>
          <Text style={styles.subtitle}>{stats.weekLabel}</Text>
        </View>
        <PressableScale
          onPress={handleRefresh}
          disabled={refreshing}
          style={styles.refreshBtn}
          accessibilityLabel="Actualiser le bilan hebdomadaire"
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={BLUE} />
          ) : (
            <Feather name="refresh-cw" size={15} color={theme.colors.textSecondary} />
          )}
        </PressableScale>
      </View>

      <View style={[glassCard, styles.card]}>
        <GlassSheen radius={22} />

        {/* Grille des 4 indicateurs réels calculés */}
        <View style={styles.metricsGrid}>
          {/* 1. Séances */}
          <View style={styles.metricItem}>
            <View style={styles.metricIconWrap}>
              <Feather name="activity" size={14} color={BLUE} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.metricValue}>
                {stats.completedWorkouts}/{stats.plannedWorkouts}
              </Text>
              <Text style={styles.metricLabel}>
                Séances ({stats.workoutCompletionRate}%)
              </Text>
            </View>
          </View>

          {/* 2. Forme moyenne */}
          <View style={styles.metricItem}>
            <View style={[styles.metricIconWrap, { backgroundColor: `${formColor}1A` }]}>
              <Ionicons name="fitness" size={14} color={formColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.metricValue, { color: formColor }]}>
                {stats.avgHealthScore !== null ? `${stats.avgHealthScore}%` : '-'}
              </Text>
              <Text style={styles.metricLabel}>Forme groupe</Text>
            </View>
          </View>

          {/* 3. Check-ins saisis */}
          <View style={styles.metricItem}>
            <View style={styles.metricIconWrap}>
              <Feather name="check-circle" size={14} color={theme.colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.metricValue}>
                {stats.recordedCheckIns}/{stats.expectedCheckIns}
              </Text>
              <Text style={styles.metricLabel}>Check-ins ({stats.checkInRate}%)</Text>
            </View>
          </View>

          {/* 4. Alertes et Surveillance */}
          <View style={styles.metricItem}>
            <View
              style={[
                styles.metricIconWrap,
                { backgroundColor: stats.flaggedAthletesCount > 0 ? 'rgba(239, 68, 68, 0.12)' : BLUE_TINT },
              ]}
            >
              <Feather
                name={stats.flaggedAthletesCount > 0 ? 'alert-triangle' : 'shield'}
                size={14}
                color={stats.flaggedAthletesCount > 0 ? theme.colors.error : theme.colors.success}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.metricValue,
                  stats.flaggedAthletesCount > 0 && { color: theme.colors.error },
                ]}
              >
                {stats.flaggedAthletesCount}
              </Text>
              <Text style={styles.metricLabel}>
                {stats.flaggedAthletesCount > 1 ? 'À surveiller' : 'À surveiller'}
              </Text>
            </View>
          </View>
        </View>

        {/* Synthèse IA rédigée en 5 lignes exactes */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryBadgeRow}>
            <View style={styles.sprintyBadge}>
              <Feather name="cpu" size={12} color={BLUE} />
              <Text style={styles.sprintyBadgeText}>
                {isFallback ? 'SYNTHÈSE CALCULÉE' : 'SYNTHÈSE SPRINTY IA'}
              </Text>
            </View>
            <Text style={styles.lineCountText}>5 points clés</Text>
          </View>

          <View style={styles.linesList}>
            {aiLines.map((line, index) => (
              <View key={index} style={styles.lineItem}>
                <View style={styles.lineBullet}>
                  <Text style={styles.lineBulletText}>{index + 1}</Text>
                </View>
                <Text style={styles.lineText}>{line}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: theme.colors.textSecondary,
  },
  subtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.glassFill,
  },
  card: {
    padding: 14,
    borderRadius: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  metricItem: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 10,
  },
  metricIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: BLUE_TINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.2,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  summaryBox: {
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: 14,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.hairline,
  },
  summaryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sprintyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: BLUE_TINT,
    borderRadius: 8,
  },
  sprintyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: BLUE,
    letterSpacing: 0.5,
  },
  lineCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  linesList: {
    gap: 8,
  },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  lineBullet: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  lineBulletText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  lineText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.text,
    fontWeight: '500',
  },
});
