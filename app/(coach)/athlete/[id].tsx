import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '../../../src/core/theme';
import { GlassView } from '../../../src/shared/components/GlassView';
import { Button } from '../../../src/shared/components/Button';
import { insightService, Insight } from '../../../src/services/insightService';
import { workoutService } from '../../../src/services/workoutService';
import { WorkoutHistoryItem } from '../../../src/features/workout/types';
import { useCoachStore } from '../../../src/store/coachStore';

export default function AthleteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { athletes } = useCoachStore();
  const athlete = athletes.find(a => a.id === id);

  const [insights, setInsights] = useState<Insight[]>([]);
  const [history, setHistory] = useState<WorkoutHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const [insightsData, historyData] = await Promise.all([
          insightService.fetchInsights(id, 5),
          // We don't have a direct fetchHistory(athleteId) yet, 
          // but workoutService might need it or we can use workouts table.
          // For now let's assume we can fetch it.
          [] as WorkoutHistoryItem[] 
        ]);
        setInsights(insightsData);
        // setHistory(historyData);
      } catch (error) {
        console.error('Failed to load athlete details', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (!athlete) return <View style={styles.center}><Text style={styles.errorText}>Athlète non trouvé</Text></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button 
          title="RETOUR" 
          onPress={() => router.back()} 
          variant="ghost" 
          style={styles.backBtn}
          textStyle={styles.backBtnText}
        />
        <Text style={styles.title}>{athlete.name.toUpperCase()}</Text>
        <Text style={styles.subtitle}>{athlete.email}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>INSIGHTS RÉCENTS (SPRINTY)</Text>
        {loading ? (
          <ActivityIndicator color={theme.colors.accent} style={styles.loader} />
        ) : (
          insights.map((insight, idx) => (
            <GlassView key={insight.id || idx} style={styles.insightCard}>
              <View style={[styles.indicator, { backgroundColor: getInsightColor(insight.type) }]} />
              <View style={styles.insightTextContainer}>
                <Text style={styles.insightDate}>
                  {insight.created_at ? new Date(insight.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : 'RÉCENT'}
                </Text>
                <Text style={styles.insightMessage}>{insight.message}</Text>
              </View>
            </GlassView>
          ))
        )}
        {insights.length === 0 && !loading && (
          <Text style={styles.emptyText}>Aucun insight généré pour le moment.</Text>
        )}

        <View style={styles.actions}>
          <Button 
            title="ASSIGNER NOUVELLE SÉANCE" 
            onPress={() => router.push(`/(coach)/assign/${id}`)}
            style={styles.mainAction}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function getInsightColor(type: string) {
  switch (type) {
    case 'success': return theme.colors.accent;
    case 'warning': return theme.colors.warning;
    case 'info': return '#3498db';
    default: return theme.colors.textMuted;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 0,
    marginBottom: theme.spacing.md,
  },
  backBtnText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: theme.typography.fontWeights.bold as any,
    letterSpacing: 1,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  scrollContent: {
    padding: theme.spacing.xl,
  },
  sectionTitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: theme.typography.fontWeights.bold as any,
    letterSpacing: 1.5,
    marginBottom: theme.spacing.lg,
  },
  insightCard: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: theme.radius.sm,
  },
  indicator: {
    width: 3,
    borderRadius: 1.5,
    marginRight: theme.spacing.md,
  },
  insightTextContainer: {
    flex: 1,
  },
  insightDate: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: theme.typography.fontWeights.bold as any,
    marginBottom: 4,
  },
  insightMessage: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  loader: {
    marginVertical: theme.spacing.xxl,
  },
  emptyText: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
    fontSize: 14,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 16,
  },
  actions: {
    marginTop: theme.spacing.xxl,
  },
  mainAction: {
    height: 56,
  },
});
