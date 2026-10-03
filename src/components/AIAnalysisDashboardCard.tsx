import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BezierCurveChart, CurvePoint } from './BezierCurveChart';

export interface BestRecordEver {
  exerciseOrDist: string;
  bestValue: string;
  date: string;
}

export interface StrictProgressionItem {
  exercise: string; // Ex: "Côte 120m" ou "Squat"
  previousSession: string; // Ex: "11/09 : 17.36s"
  currentSession: string; // Ex: "02/10 : 15.90s"
  delta: string; // Ex: "-1.46s" ou "+10kg"
  isPositive?: boolean;
}

export interface HighlightItem {
  type: 'pr' | 'success' | 'warning' | 'info';
  title: string;
  desc?: string;
}

export interface AnalysisDashboardData {
  athleteName: string;
  allTimeBests?: BestRecordEver[];
  curveChart?: {
    title: string;
    metricType: 'chrono' | 'weight' | 'score';
    unit: string;
    points: CurvePoint[];
  };
  strictProgressions?: StrictProgressionItem[];
  keyHighlights?: HighlightItem[];
}

export const AIAnalysisDashboardCard: React.FC<{ data: AnalysisDashboardData }> = ({ data }) => {
  const allTimeBests = data.allTimeBests || [];
  const strictProgressions = data.strictProgressions || [];
  const keyHighlights = data.keyHighlights || [];
  const curve = data.curveChart;

  return (
    <View style={styles.card}>
      {/* Header épuré : All-Time Records */}
      <LinearGradient
        colors={['#0F172A', '#1E293B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View style={styles.badgeRow}>
            <Ionicons name="sparkles" size={12} color="#38BDF8" />
            <Text style={styles.badgeText}>RAPPORT PERFORMANCE ATHLÈTE</Text>
          </View>
          <Text style={styles.athleteName} numberOfLines={1}>
            {data.athleteName}
          </Text>
        </View>

        {/* Section All-Time Best PRs (Ever) */}
        {allTimeBests.length > 0 && (
          <View style={styles.allTimeSection}>
            <View style={styles.allTimeHeader}>
              <Ionicons name="trophy" size={14} color="#F59E0B" />
              <Text style={styles.allTimeTitle}>RECORDS ABSOLUS ENREGISTRÉS (EVER)</Text>
            </View>
            <View style={styles.prGrid}>
              {allTimeBests.map((pr, idx) => (
                <View key={idx} style={styles.prChip}>
                  <Text style={styles.prExercise}>{pr.exerciseOrDist}</Text>
                  <Text style={styles.prValue}>{pr.bestValue}</Text>
                  <Text style={styles.prDate}>{pr.date}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </LinearGradient>

      {/* VRAIE COURBE (STYLE MONTAGNE) */}
      {curve && curve.points && curve.points.length >= 2 && (
        <View style={styles.chartWrapper}>
          <BezierCurveChart
            title={curve.title}
            points={curve.points}
            metricType={curve.metricType}
            unit={curve.unit}
            height={140}
          />
        </View>
      )}

      {/* COMPARISONS SÉANCE À SÉANCE (STRICTEMENT IDENTIQUES) */}
      {strictProgressions.length > 0 && (
        <View style={styles.progressionsSection}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="git-compare-outline" size={15} color="#0284C7" />
            <Text style={styles.sectionTitle}>
              PROGRESSION SÉANCE À SÉANCE (MÊME EXERCICE)
            </Text>
          </View>
          <View style={styles.progressionsList}>
            {strictProgressions.map((prog, idx) => {
              const isPositive =
                prog.isPositive !== false &&
                (!prog.delta.startsWith('+') || prog.delta.includes('kg'));
              return (
                <View key={idx} style={styles.progressionCard}>
                  <View style={styles.progressionHeader}>
                    <Text style={styles.progressionEx}>{prog.exercise}</Text>
                    <View
                      style={[
                        styles.deltaBadge,
                        { backgroundColor: isPositive ? '#ECFDF5' : '#FFFBEB' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.deltaText,
                          { color: isPositive ? '#059669' : '#D97706' },
                        ]}
                      >
                        {prog.delta}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.sessionsRow}>
                    <Text style={styles.sessionPrev}>Précédent : {prog.previousSession}</Text>
                    <Ionicons name="arrow-forward" size={12} color="#94A3B8" />
                    <Text style={styles.sessionCurr}>Actuel : {prog.currentSession}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Points de vigilance & constats clés pour le coach */}
      {keyHighlights.length > 0 && (
        <View style={styles.highlightsSection}>
          {keyHighlights.map((hl, idx) => {
            const isSuccess = hl.type === 'success' || hl.type === 'pr';
            const isWarning = hl.type === 'warning';

            return (
              <View
                key={idx}
                style={[
                  styles.highlightCard,
                  {
                    backgroundColor: isWarning ? '#FEF2F2' : isSuccess ? '#ECFDF5' : '#F8FAFC',
                    borderColor: isWarning ? '#FECACA' : isSuccess ? '#A7F3D0' : '#E2E8F0',
                  },
                ]}
              >
                <Ionicons
                  name={
                    isWarning
                      ? 'warning'
                      : isSuccess
                      ? 'checkmark-circle'
                      : 'information-circle'
                  }
                  size={16}
                  color={isWarning ? '#DC2626' : isSuccess ? '#059669' : '#64748B'}
                  style={{ marginTop: 1 }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.highlightTitle,
                      { color: isWarning ? '#991B1B' : isSuccess ? '#065F46' : '#1E293B' },
                    ]}
                  >
                    {hl.title}
                  </Text>
                  {hl.desc ? (
                    <Text style={styles.highlightDesc}>{hl.desc}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 14,
  },
  header: {
    padding: 16,
  },
  headerTop: {
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.8,
  },
  athleteName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  allTimeSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  allTimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  allTimeTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  prGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  prChip: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    minWidth: 100,
  },
  prExercise: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  prValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#F59E0B',
    marginVertical: 1,
  },
  prDate: {
    fontSize: 9,
    color: '#64748B',
  },
  chartWrapper: {
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  progressionsSection: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  progressionsList: {
    gap: 8,
  },
  progressionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  progressionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressionEx: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  deltaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deltaText: {
    fontSize: 12,
    fontWeight: '800',
  },
  sessionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  sessionPrev: {
    fontSize: 11,
    color: '#64748B',
  },
  sessionCurr: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  highlightsSection: {
    padding: 14,
    gap: 8,
  },
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  highlightTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  highlightDesc: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
    lineHeight: 15,
  },
});
