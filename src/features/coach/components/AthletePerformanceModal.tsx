import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { workoutService } from '../../../services/workoutService';

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
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: theme.colors.border,
              paddingTop: Math.max(insets.top, 12) + 8,
            },
          ]}
        >
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeButton, { backgroundColor: theme.colors.surfaceLight }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="x" size={20} color={theme.colors.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              Performances
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              {athleteName || 'Athlète'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={loadHistory}
            style={[styles.closeButton, { backgroundColor: theme.colors.surfaceLight }]}
          >
            <Feather name="refresh-cw" size={16} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterPill,
              {
                backgroundColor: selectedFilter === 'all' ? theme.colors.accent : theme.colors.surfaceLight,
              },
            ]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text
              style={[
                styles.filterPillText,
                { color: selectedFilter === 'all' ? '#FFF' : theme.colors.textSecondary },
              ]}
            >
              Toutes ({workouts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              {
                backgroundColor: selectedFilter === 'completed' ? theme.colors.success : theme.colors.surfaceLight,
              },
            ]}
            onPress={() => setSelectedFilter('completed')}
          >
            <Text
              style={[
                styles.filterPillText,
                { color: selectedFilter === 'completed' ? '#FFF' : theme.colors.textSecondary },
              ]}
            >
              Réalisées ({workouts.filter(w => w.status === 'completed').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              {
                backgroundColor: selectedFilter === 'pending' ? theme.colors.warning : theme.colors.surfaceLight,
              },
            ]}
            onPress={() => setSelectedFilter('pending')}
          >
            <Text
              style={[
                styles.filterPillText,
                { color: selectedFilter === 'pending' ? '#FFF' : theme.colors.textSecondary },
              ]}
            >
              En attente ({workouts.filter(w => w.status === 'pending').length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Chargement des performances...
            </Text>
          </View>
        ) : filteredWorkouts.length === 0 ? (
          <View style={styles.center}>
            <Feather name="activity" size={48} color={theme.colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Aucun résultat</Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              Cet athlète n'a pas encore saisi de chronos ou données pour cette catégorie.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredWorkouts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const dateStr = item.date_prevue
                ? new Date(item.date_prevue).toLocaleDateString('fr-FR', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })
                : 'Date N/A';

              const isCompleted = item.status === 'completed';
              const efforts = item.athlete_efforts || [];

              return (
                <View
                  style={[
                    styles.workoutCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: isCompleted ? theme.colors.success + '40' : theme.colors.border,
                    },
                  ]}
                >
                  {/* Header de la séance */}
                  <View style={styles.workoutHeader}>
                    <View style={styles.workoutHeaderLeft}>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: isCompleted ? theme.colors.success + '20' : theme.colors.warning + '20',
                          },
                        ]}
                      >
                        <Feather
                          name={isCompleted ? 'check-circle' : 'clock'}
                          size={12}
                          color={isCompleted ? theme.colors.success : theme.colors.warning}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: isCompleted ? theme.colors.success : theme.colors.warning },
                          ]}
                        >
                          {isCompleted ? 'RÉALISÉE' : 'PLANIFIÉE'}
                        </Text>
                      </View>
                      <Text style={[styles.workoutDate, { color: theme.colors.textSecondary }]}>
                        {dateStr}
                      </Text>
                    </View>
                    <Text style={[styles.workoutTitle, { color: theme.colors.text }]}>
                      {item.type_seance}
                    </Text>
                  </View>

                  {/* Tableau des Chronos / Séries réelles */}
                  {efforts.length > 0 ? (
                    <View style={[styles.effortsContainer, { backgroundColor: theme.colors.surfaceLight }]}>
                      <Text style={[styles.effortsHeaderTitle, { color: theme.colors.textMuted }]}>
                        RÉSULTATS SAISIS PAR L'ATHLÈTE
                      </Text>
                      {efforts.map((effort: any, idx: number) => {
                        const plannedTime = formatTime(effort.planned_time_ms);
                        const actualTime = formatTime(effort.actual_time_ms) || effort.actual_extra?.chrono || null;
                        const plannedW = effort.planned_weight_kg ? `${effort.planned_weight_kg}kg` : null;
                        const actualW = effort.actual_weight_kg ? `${effort.actual_weight_kg}kg` : null;
                        const plannedReps = effort.planned_reps ? `${effort.planned_reps} reps` : null;
                        const actualReps = effort.actual_reps ? `${effort.actual_reps} reps` : null;
                        const plannedDist = effort.planned_distance_m ? `${effort.planned_distance_m}m` : null;
                        const actualDist = effort.actual_distance_m ? `${effort.actual_distance_m}m` : null;

                        const plannedSummary = [plannedTime, plannedW, plannedReps, plannedDist].filter(Boolean).join(' - ');
                        const actualSummary = [actualTime, actualW, actualReps, actualDist].filter(Boolean).join(' - ');

                        return (
                          <View key={effort.id || idx} style={styles.effortRow}>
                            <View style={styles.effortSetBadge}>
                              <Text style={styles.effortSetText}>Série {effort.set_order || idx + 1}</Text>
                            </View>

                            <View style={styles.effortDetails}>
                              {plannedSummary ? (
                                <Text style={[styles.plannedText, { color: theme.colors.textMuted }]}>
                                  Prévu : {plannedSummary}
                                </Text>
                              ) : null}
                              <Text style={[styles.actualText, { color: actualSummary ? theme.colors.accent : theme.colors.textSecondary }]}>
                                Réalisé : {actualSummary || 'Effectué sans mesure'}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : isCompleted ? (
                    <View style={[styles.noEffortsBox, { backgroundColor: theme.colors.surfaceLight }]}>
                      <Text style={[styles.noEffortsText, { color: theme.colors.textSecondary }]}>
                        Séance validée par l'athlète sans détails de chronos spécifiques.
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
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  workoutCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  workoutHeader: {
    marginBottom: 12,
  },
  workoutHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  workoutDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  workoutTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  effortsContainer: {
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  effortsHeaderTitle: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  effortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  effortSetBadge: {
    backgroundColor: '#3B82F620',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  effortSetText: {
    color: '#3B82F6',
    fontSize: 11,
    fontWeight: '700',
  },
  effortDetails: {
    flex: 1,
  },
  plannedText: {
    fontSize: 11,
  },
  actualText: {
    fontSize: 13,
    fontWeight: '600',
  },
  noEffortsBox: {
    padding: 10,
    borderRadius: 8,
  },
  noEffortsText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
});
