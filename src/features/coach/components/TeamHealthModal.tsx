import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../core/theme';
import { useCoachStore } from '../../../store/coach/coachStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const TeamHealthModal = ({ visible, onClose }: Props) => {
  const { teamMembers, teamCheckIns } = useCoachStore();
  const [expandedAthleteId, setExpandedAthleteId] = useState<string | null>(null);

  const calculateScore = (ci: any) => {
    if (!ci) return null;
    if (ci.health_score !== undefined && ci.health_score !== null) return Math.round(ci.health_score).toString();
    return null;
  };

  const getScoreColor = (scoreStr: string | null) => {
    if (!scoreStr) return theme.colors.textMuted;
    const s = parseFloat(scoreStr);
    if (s >= 80) return theme.colors.success;
    if (s >= 50) return '#F59E0B'; // Orange
    return theme.colors.error;
  };

  const getMetricColor = (value: number, invert: boolean = false) => {
    const normalized = invert ? (6 - value) : value; 
    if (normalized >= 4) return theme.colors.success;
    if (normalized >= 3) return theme.colors.warning;
    return theme.colors.error;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: theme.colors.background }]}>
          
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="activity" size={18} color={theme.colors.accent} />
              <Text style={[styles.title, { color: theme.colors.text }]}>Santé de l'équipe</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            {teamMembers.length === 0 ? (
              <Text style={styles.emptyText}>Aucun athlète dans l'équipe.</Text>
            ) : (
              teamMembers.map(athlete => {
                const checkIn = teamCheckIns.find(ci => ci.athlete_id === athlete.user_id);
                const score = calculateScore(checkIn);
                const scoreColor = getScoreColor(score);
                const isExpanded = expandedAthleteId === athlete.user_id;

                return (
                  <View key={athlete.user_id} style={[styles.athleteCard, isExpanded && styles.athleteCardExpanded]}>
                    <TouchableOpacity 
                      style={styles.athleteRow}
                      activeOpacity={0.7}
                      onPress={() => setExpandedAthleteId(isExpanded ? null : athlete.user_id)}
                    >
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {athlete.profile?.first_name?.charAt(0)}{athlete.profile?.last_name?.charAt(0)}
                        </Text>
                      </View>
                      <View style={styles.athleteInfo}>
                        <Text style={[styles.athleteName, { color: theme.colors.text }]}>
                          {athlete.profile?.full_name}
                        </Text>
                        <Text style={styles.athleteStatus}>
                          {checkIn ? 'Check-in complété' : 'Pas de check-in aujourd\'hui'}
                        </Text>
                      </View>
                      
                      <View style={styles.scoreContainer}>
                        {score ? (
                          <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '20' }]}>
                            <Text style={[styles.scoreText, { color: scoreColor }]}>{score}</Text>
                          </View>
                        ) : (
                          <View style={[styles.scoreBadge, { backgroundColor: theme.colors.surfaceLight }]}>
                            <Text style={[styles.scoreText, { color: theme.colors.textMuted }]}>-</Text>
                          </View>
                        )}
                        <Feather 
                          name={isExpanded ? "chevron-up" : "chevron-down"} 
                          size={20} 
                          color={theme.colors.textMuted} 
                          style={{ marginLeft: 8 }}
                        />
                      </View>
                    </TouchableOpacity>

                    {/* Détails du Check-in (Expandable) */}
                    {isExpanded && (
                      <View style={styles.detailsContainer}>
                        {!checkIn ? (
                          <Text style={styles.noDataText}>L'athlète n'a pas encore rempli son formulaire ce matin.</Text>
                        ) : (
                          <View style={styles.metricsGrid}>
                            <View style={styles.metricItem}>
                              <Feather name="moon" size={16} color={getMetricColor(checkIn.sleep_quality)} />
                              <Text style={styles.metricLabel}>Sommeil</Text>
                              <Text style={[styles.metricValue, { color: getMetricColor(checkIn.sleep_quality) }]}>{checkIn.sleep_quality}/5</Text>
                            </View>

                            <View style={styles.metricItem}>
                              <Feather name="battery" size={16} color={getMetricColor(checkIn.energy)} />
                              <Text style={styles.metricLabel}>Énergie</Text>
                              <Text style={[styles.metricValue, { color: getMetricColor(checkIn.energy) }]}>{checkIn.energy}/5</Text>
                            </View>

                            <View style={styles.metricItem}>
                              <Feather name="wind" size={16} color={getMetricColor(checkIn.stress_level, true)} />
                              <Text style={styles.metricLabel}>Stress</Text>
                              <Text style={[styles.metricValue, { color: getMetricColor(checkIn.stress_level, true) }]}>{checkIn.stress_level}/5</Text>
                            </View>

                            <View style={styles.metricItem}>
                              <Feather name="activity" size={16} color={getMetricColor(checkIn.pain_level, true)} />
                              <Text style={styles.metricLabel}>Douleur</Text>
                              <Text style={[styles.metricValue, { color: getMetricColor(checkIn.pain_level, true) }]}>{checkIn.pain_level}/5</Text>
                            </View>

                            <View style={styles.metricItem}>
                              <Feather name="target" size={16} color={getMetricColor(checkIn.muscle_soreness, true)} />
                              <Text style={styles.metricLabel}>Courbatures</Text>
                              <Text style={[styles.metricValue, { color: getMetricColor(checkIn.muscle_soreness, true) }]}>{checkIn.muscle_soreness}/5</Text>
                            </View>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '90%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  closeBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center'
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    marginTop: 40,
  },
  athleteCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  athleteCardExpanded: {
    borderColor: theme.colors.accent + '50',
  },
  athleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: theme.colors.textSecondary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  athleteInfo: {
    flex: 1,
  },
  athleteName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  athleteStatus: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scoreText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  detailsContainer: {
    padding: 16,
    paddingTop: 0,
    backgroundColor: theme.colors.surface,
  },
  noDataText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  metricItem: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  metricLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 6,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
  }
});
