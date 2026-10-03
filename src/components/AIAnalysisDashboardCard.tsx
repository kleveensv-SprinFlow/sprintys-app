import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CircularGauge } from './CircularGauge';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export interface ProgressionItem {
  exercise: string;
  previous: string;
  current: string;
  delta: string;
  isPositive?: boolean;
}

export interface HighlightItem {
  type: 'pr' | 'success' | 'warning' | 'info';
  title: string;
  desc?: string;
}

export interface AnalysisDashboardData {
  athleteName: string;
  globalScore: number; // ex: 8.5 / 10
  healthGauge: number; // 0-100
  attendanceGauge: number; // 0-100
  nutritionGauge?: number; // 0-100 (optionnel)
  keyHighlights?: HighlightItem[];
  progressions?: ProgressionItem[];
  trendChart?: {
    title?: string;
    labels: string[];
    values: number[];
  };
}

export const AIAnalysisDashboardCard: React.FC<{ data: AnalysisDashboardData }> = ({ data }) => {
  const globalScore = Number(data.globalScore) || 0;
  const scoreColor =
    globalScore >= 8 ? '#10B981' : globalScore >= 6 ? '#F59E0B' : '#EF4444';

  const chartValues = data.trendChart?.values || [];
  const chartLabels = data.trendChart?.labels || [];
  const maxValue = chartValues.length > 0 ? Math.max(...chartValues, 1) : 100;

  return (
    <View style={styles.card}>
      {/* Header avec note globale */}
      <LinearGradient
        colors={['#0F172A', '#1E293B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerLeft}>
          <View style={styles.badgeRow}>
            <View style={styles.pulseDot} />
            <Text style={styles.badgeText}>RAPPORT DE PERFORMANCE IA</Text>
          </View>
          <Text style={styles.athleteName} numberOfLines={1}>
            {data.athleteName}
          </Text>
        </View>

        <View style={styles.globalScoreWrap}>
          <Text style={styles.scoreSubtitle}>NOTE GLOBALE</Text>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreNumber, { color: scoreColor }]}>
              {globalScore.toFixed(1)}
            </Text>
            <Text style={styles.scoreMax}>/10</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Section Jauges Circulaires */}
      <View style={styles.gaugesSection}>
        <CircularGauge
          score={data.attendanceGauge ?? 100}
          label="Assiduité"
          color="#3B82F6"
        />
        <CircularGauge
          score={data.healthGauge ?? 70}
          label="Forme"
          color="#10B981"
        />
        {data.nutritionGauge !== undefined && data.nutritionGauge !== null && (
          <CircularGauge
            score={data.nutritionGauge}
            label="Nutrition"
            color="#EC4899"
          />
        )}
      </View>

      {/* Mini-Graphique de Tendance (si disponible) */}
      {chartValues.length > 1 && (
        <View style={styles.chartSection}>
          <View style={styles.sectionHeaderRow}>
            <Feather name="trending-up" size={14} color="#0284C7" />
            <Text style={styles.sectionTitle}>
              {data.trendChart?.title || 'Évolution de la charge & régularité'}
            </Text>
          </View>
          <View style={styles.barsContainer}>
            {chartValues.map((val, idx) => {
              const heightPercent = Math.max(12, Math.min(100, (val / maxValue) * 100));
              return (
                <View key={idx} style={styles.barCol}>
                  <View style={styles.barTrack}>
                    <LinearGradient
                      colors={['#38BDF8', '#0284C7']}
                      style={[styles.barFill, { height: `${heightPercent}%` }]}
                    />
                  </View>
                  <Text style={styles.barLabel} numberOfLines={1}>
                    {chartLabels[idx] || `S${idx + 1}`}
                  </Text>
                  <Text style={styles.barValue}>{Math.round(val)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Progressions séance à séance / Deltras constatés */}
      {Array.isArray(data.progressions) && data.progressions.length > 0 && (
        <View style={styles.progressionsSection}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="flash" size={14} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Progressions séance à séance</Text>
          </View>
          <View style={styles.progressionsList}>
            {data.progressions.map((prog, idx) => {
              const isPositive = prog.isPositive !== false && !prog.delta.startsWith('-');
              return (
                <View key={idx} style={styles.progressionRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.progressionEx}>{prog.exercise}</Text>
                    <Text style={styles.progressionDetail}>
                      {prog.previous} ➔ {prog.current}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.deltaBadge,
                      { backgroundColor: isPositive ? '#ECFDF5' : '#FEF2F2' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.deltaText,
                        { color: isPositive ? '#059669' : '#DC2626' },
                      ]}
                    >
                      {prog.delta}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Points saillants / Badges clés */}
      {Array.isArray(data.keyHighlights) && data.keyHighlights.length > 0 && (
        <View style={styles.highlightsSection}>
          {data.keyHighlights.map((hl, idx) => {
            const isPr = hl.type === 'pr';
            const isSuccess = hl.type === 'success';
            const isWarning = hl.type === 'warning';

            const bg = isPr
              ? '#FEF3C7'
              : isSuccess
              ? '#ECFDF5'
              : isWarning
              ? '#FEF2F2'
              : '#F1F5F9';
            const border = isPr
              ? '#FDE68A'
              : isSuccess
              ? '#A7F3D0'
              : isWarning
              ? '#FECACA'
              : '#E2E8F0';
            const iconColor = isPr
              ? '#D97706'
              : isSuccess
              ? '#059669'
              : isWarning
              ? '#DC2626'
              : '#64748B';

            return (
              <View
                key={idx}
                style={[styles.highlightCard, { backgroundColor: bg, borderColor: border }]}
              >
                <Ionicons
                  name={
                    isPr
                      ? 'trophy'
                      : isSuccess
                      ? 'checkmark-circle'
                      : isWarning
                      ? 'alert-circle'
                      : 'information-circle'
                  }
                  size={18}
                  color={iconColor}
                  style={{ marginTop: 2 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.highlightTitle, { color: iconColor }]}>
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
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 14,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38BDF8',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.8,
  },
  athleteName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  globalScoreWrap: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  scoreSubtitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreNumber: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  scoreMax: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginLeft: 2,
  },
  gaugesSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  chartSection: {
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
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 80,
    paddingTop: 8,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 14,
    height: 52,
    backgroundColor: '#E2E8F0',
    borderRadius: 7,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 7,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
  },
  barValue: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0F172A',
  },
  progressionsSection: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  progressionsList: {
    gap: 8,
  },
  progressionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  progressionEx: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  progressionDetail: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  deltaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  deltaText: {
    fontSize: 12,
    fontWeight: '800',
  },
  highlightsSection: {
    padding: 14,
    gap: 8,
  },
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
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
