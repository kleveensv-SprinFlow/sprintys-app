import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { workoutService } from '../../../services/workoutService';
import { FeedbackHost } from '../../../shared/feedback/FeedbackHost';
import { glassCard } from '../../../core/glass';
import { IconButton } from '../../../shared/components/IconButton';
import { SegmentedControl } from '../../../shared/components/SegmentedControl';
import { EmptyState } from '../../../shared/components/EmptyState';
import { SkeletonCard } from '../../../shared/components/Skeleton';
import { GlassSheen } from '../../../shared/components/GlassSheen';

interface AthletePerformanceModalProps {
  visible: boolean;
  athleteId: string | null;
  athleteName: string | null;
  onClose: () => void;
}

export const AthletePerformanceModal: React.FC<AthletePerformanceModalProps> = ({
  visible,
  athleteId,
  athleteName,
  onClose,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'completed' | 'pending'>('all');

  useEffect(() => {
    if (visible && athleteId) {
      loadHistory();
    }
  }, [visible, athleteId]);

  const loadHistory = async () => {
    if (!athleteId) return;
    setLoading(true);
    try {
      const data = await workoutService.fetchAthletePerformanceHistory(athleteId);
      setWorkouts(data || []);
    } catch (err) {
      console.error('Error loading athlete performance history:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkouts = workouts.filter((w) => {
    if (selectedFilter === 'completed') return w.status === 'completed';
    if (selectedFilter === 'pending') return w.status === 'pending';
    return true;
  });

  const formatTime = (ms?: number | null) => {
    if (!ms) return null;
    return `${(ms / 1000).toFixed(2)} s`;
  };

  const completedCount = workouts.filter((w) => w.status === 'completed').length;
  const pendingCount = workouts.filter((w) => w.status === 'pending').length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FeedbackHost />
      <View style={[styles.container, { backgroundColor: theme.colors.backdrop }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 4 }]}>
          <IconButton icon="x" accessibilityLabel="Fermer" onPress={onClose} />

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
              Performances
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {athleteName || 'Athlète'}
            </Text>
          </View>

          <IconButton icon="refresh-cw" accessibilityLabel="Actualiser" onPress={loadHistory} disabled={loading} />
        </View>

        {/* Filters */}
        <SegmentedControl
          style={styles.filters}
          options={[
            { key: 'all' as const, label: `Toutes · ${workouts.length}` },
            { key: 'completed' as const, label: `Réalisées · ${completedCount}` },
            { key: 'pending' as const, label: `À venir · ${pendingCount}` },
          ]}
          value={selectedFilter}
          onChange={setSelectedFilter}
        />

        {/* Content */}
        {loading ? (
          <View style={styles.listContainer}>
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
          </View>
        ) : filteredWorkouts.length === 0 ? (
          <EmptyState
            icon="activity"
            title="Aucun résultat"
            message="Cet athlète n’a pas encore saisi de chronos ou de données pour cette catégorie."
          />
        ) : (
          <FlatList
            data={filteredWorkouts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContainer, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const dateStr = item.date_prevue
                ? new Date(item.date_prevue).toLocaleDateString('fr-FR', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })
                : 'Date inconnue';

              const isCompleted = item.status === 'completed';
              const efforts = item.athlete_efforts || [];
              const statusColor = isCompleted ? theme.colors.success : theme.colors.warning;

              return (
                <View style={glassCard}>
                  <GlassSheen radius={22} />
                  {/* Header de la séance */}
                  <View style={styles.workoutHeader}>
                    <View style={styles.workoutHeaderLeft}>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)' },
                        ]}
                      >
                        <Feather name={isCompleted ? 'check-circle' : 'clock'} size={12} color={statusColor} />
                        <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                          {isCompleted ? 'Réalisée' : 'Planifiée'}
                        </Text>
                      </View>
                      <Text style={[styles.workoutDate, { color: theme.colors.textSecondary }]}>{dateStr}</Text>
                    </View>
                    <Text style={[styles.workoutTitle, { color: theme.colors.text }]}>{item.type_seance}</Text>
                  </View>

                  {/* Tableau des Chronos / Séries réelles */}
                  {efforts.length > 0 ? (
                    <View style={[styles.effortsContainer, { backgroundColor: theme.colors.glassFill }]}>
                      <Text style={[styles.effortsHeaderTitle, { color: theme.colors.textSecondary }]}>
                        Résultats saisis par l’athlète
                      </Text>
                      {efforts.map((effort: any, idx: number) => {
                        const plannedTime = formatTime(effort.planned_time_ms);
                        const actualTime = formatTime(effort.actual_time_ms) || effort.actual_extra?.chrono || null;
                        const plannedW = effort.planned_weight_kg ? `${effort.planned_weight_kg} kg` : null;
                        const actualW = effort.actual_weight_kg ? `${effort.actual_weight_kg} kg` : null;
                        const plannedReps = effort.planned_reps ? `${effort.planned_reps} rép.` : null;
                        const actualReps = effort.actual_reps ? `${effort.actual_reps} rép.` : null;
                        const plannedDist = effort.planned_distance_m ? `${effort.planned_distance_m} m` : null;
                        const actualDist = effort.actual_distance_m ? `${effort.actual_distance_m} m` : null;

                        const plannedSummary = [plannedTime, plannedW, plannedReps, plannedDist].filter(Boolean).join(' · ');
                        const actualSummary = [actualTime, actualW, actualReps, actualDist].filter(Boolean).join(' · ');

                        return (
                          <View key={effort.id || idx} style={styles.effortRow}>
                            <View style={styles.effortSetBadge}>
                              <Text style={[styles.effortSetText, { color: theme.colors.sprintyBlue }]}>
                                Série {effort.set_order || idx + 1}
                              </Text>
                            </View>

                            <View style={styles.effortDetails}>
                              {plannedSummary ? (
                                <Text style={[styles.plannedText, { color: theme.colors.textMuted }]}>
                                  Prévu : {plannedSummary}
                                </Text>
                              ) : null}
                              <Text
                                style={[
                                  styles.actualText,
                                  { color: actualSummary ? theme.colors.sprintyBlue : theme.colors.textSecondary },
                                ]}
                              >
                                Réalisé : {actualSummary || 'effectué sans mesure'}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : isCompleted ? (
                    <View style={[styles.noEffortsBox, { backgroundColor: theme.colors.glassFill }]}>
                      <Text style={[styles.noEffortsText, { color: theme.colors.textSecondary }]}>
                        Séance validée par l’athlète, sans chronos détaillés.
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 1,
  },
  filters: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  workoutHeader: {
    marginBottom: 12,
  },
  workoutHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  workoutDate: {
    fontSize: 13,
    fontWeight: '500',
  },
  workoutTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  effortsContainer: {
    borderRadius: 14,
    borderCurve: 'continuous',
    padding: 12,
    gap: 10,
  },
  effortsHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  effortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  effortSetBadge: {
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderCurve: 'continuous',
  },
  effortSetText: {
    fontSize: 12,
    fontWeight: '700',
  },
  effortDetails: {
    flex: 1,
  },
  plannedText: {
    fontSize: 12,
  },
  actualText: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  noEffortsBox: {
    padding: 12,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  noEffortsText: {
    fontSize: 13,
  },
});
