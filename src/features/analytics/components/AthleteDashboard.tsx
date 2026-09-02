import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { analyticsService, SessionStats, AthletePR, WorkoutDegradation } from '../../../services/analyticsService';
import { theme } from '../../../core/theme';
import { useAuthStore } from '../../../store/authStore';
import { Feather } from '@expo/vector-icons';

export const AthleteDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState<SessionStats[]>([]);
  const [prs, setPrs] = useState<AthletePR[]>([]);
  const [degradations, setDegradations] = useState<WorkoutDegradation[]>([]);

  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      try {
        setLoading(true);
        const [recentStats, records, degs] = await Promise.all([
          analyticsService.getRecentSessionStats(user.id, 5),
          analyticsService.getPersonalRecords(user.id),
          analyticsService.getWorkoutDegradation(user.id, 5)
        ]);
        
        setStats(recentStats);
        setPrs(records);
        setDegradations(degs);
      } catch (err) {
        console.error("Erreur de chargement du dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  // Calculs aggregǸs
  const globalAdherence = stats.length > 0 
    ? stats.reduce((acc, s) => acc + (s.adherence_percentage || 0), 0) / stats.length 
    : 0;
  
  const globalVolume = stats.reduce((acc, s) => acc + (s.total_volume_kg || 0), 0);
  const globalDistance = stats.reduce((acc, s) => acc + (s.total_distance_m || 0), 0);

  const runPrs = prs.filter(p => p.exercise_category === 'run');
  const strengthPrs = prs.filter(p => p.exercise_category === 'strength');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      {/* SECTION 1: GLOBAL KPIs */}
      <Text style={styles.sectionTitle}>Vue Globale</Text>
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Feather name="target" size={20} color={theme.colors.accent} />
          <Text style={styles.kpiValue}>{globalAdherence.toFixed(0)}%</Text>
          <Text style={styles.kpiLabel}>AdhǸrence Moyenne</Text>
        </View>
        <View style={styles.kpiCard}>
          <Feather name="activity" size={20} color={theme.colors.success} />
          <Text style={styles.kpiValue}>{stats.length > 0 ? (stats.reduce((acc, s) => acc + (s.avg_intensity || 0), 0) / stats.length).toFixed(1) : '-'}</Text>
          <Text style={styles.kpiLabel}>Intensit� Moyenne</Text>
        </View>
      </View>

      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Feather name="zap" size={20} color={theme.colors.error} />
          <Text style={styles.kpiValue}>{globalDistance} m</Text>
          <Text style={styles.kpiLabel}>Volume Course (RǸcent)</Text>
        </View>
        <View style={styles.kpiCard}>
          <Feather name="package" size={20} color="#8B5CF6" />
          <Text style={styles.kpiValue}>{globalVolume} kg</Text>
          <Text style={styles.kpiLabel}>Volume Muscu (RǸcent)</Text>
        </View>
      </View>

      {/* SECTION 2: DEGRADATION (INTRA-SESSION) */}
      <Text style={styles.sectionTitle}>Endurance Lactique / Vitesse</Text>
      {degradations.length === 0 ? (
        <Text style={styles.emptyText}>Pas assez de sǸries rǸcentes pour calculer la dǸgradation.</Text>
      ) : (
        degradations.map((deg, i) => (
          <View key={i} style={styles.listCard}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>{deg.distance_m}m Sprint</Text>
              <Text style={styles.listSubtitle}>{new Date(deg.workout_date).toLocaleDateString()}</Text>
            </View>
            <View style={styles.degRow}>
              <View>
                <Text style={styles.degLabel}>Meilleur</Text>
                <Text style={styles.degValue}>{(deg.best_time_ms / 1000).toFixed(2)}s</Text>
              </View>
              <View>
                <Text style={styles.degLabel}>Pire</Text>
                <Text style={styles.degValue}>{(deg.worst_time_ms / 1000).toFixed(2)}s</Text>
              </View>
              <View>
                <Text style={styles.degLabel}>DǸgradation</Text>
                <Text style={[styles.degValue, { color: deg.degradation_percentage > 10 ? theme.colors.error : theme.colors.success }]}>
                  +{deg.degradation_percentage}%
                </Text>
              </View>
            </View>
          </View>
        ))
      )}

      {/* SECTION 3: RECORDS PERSONNELS */}
      <Text style={styles.sectionTitle}>Records (Course)</Text>
      {runPrs.length === 0 ? (
        <Text style={styles.emptyText}>Aucun record piste enregistrǸ.</Text>
      ) : (
        runPrs.map((pr, i) => (
          <View key={i} style={styles.prCard}>
            <Feather name="award" size={18} color="#F59E0B" />
            <Text style={styles.prMain}>{pr.actual_distance_m}m</Text>
            <Text style={styles.prResult}>{pr.best_time_ms ? (pr.best_time_ms / 1000).toFixed(2) + 's' : '-'}</Text>
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Records (Musculation)</Text>
      {strengthPrs.length === 0 ? (
        <Text style={styles.emptyText}>Aucun record muscu enregistrǸ.</Text>
      ) : (
        strengthPrs.map((pr, i) => (
          <View key={i} style={styles.prCard}>
            <Feather name="award" size={18} color="#8B5CF6" />
            <Text style={styles.prMain}>{pr.actual_reps || '?'} Reps</Text>
            <Text style={styles.prResult}>{pr.max_weight_kg} kg</Text>
          </View>
        ))
      )}

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, paddingBottom: 40 },
  
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginTop: 24, marginBottom: 12 },
  emptyText: { color: theme.colors.textMuted, fontStyle: 'italic', fontSize: 14 },
  
  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  kpiCard: { flex: 1, backgroundColor: theme.colors.surface, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border },
  kpiValue: { fontSize: 24, fontWeight: 'bold', color: theme.colors.text, marginTop: 8, marginBottom: 4 },
  kpiLabel: { fontSize: 12, color: theme.colors.textSecondary },

  listCard: { backgroundColor: theme.colors.surface, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 12 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  listTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  listSubtitle: { fontSize: 12, color: theme.colors.textMuted },
  degRow: { flexDirection: 'row', justifyContent: 'space-between' },
  degLabel: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 4 },
  degValue: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },

  prCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 8, gap: 12 },
  prMain: { flex: 1, fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  prResult: { fontSize: 18, fontWeight: 'bold', color: theme.colors.accent }
});
