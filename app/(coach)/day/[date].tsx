import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../src/core/theme';
import { Header } from '../../../src/shared/components/Header';
import { workoutService } from '../../../src/services/workoutService';
import { useAuthStore } from '../../../src/store/authStore';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { WorkoutCard } from '../../../src/shared/components/WorkoutCard';
import { WorkoutDetailModal } from '../../../src/features/calendar/components/WorkoutDetailModal';
import { RunWorkoutBuilder } from '../../../src/features/calendar/components/RunWorkoutBuilder';
import { StrengthWorkoutBuilder } from '../../../src/features/calendar/components/StrengthWorkoutBuilder';
import { StairsWorkoutBuilder } from '../../../src/features/calendar/components/StairsWorkoutBuilder';
import { RestDayBuilder } from '../../../src/features/calendar/components/RestDayBuilder';
import { TechnicalWorkoutBuilder } from '../../../src/features/calendar/components/TechnicalWorkoutBuilder';
import { CompetitionBuilder } from '../../../src/features/calendar/components/CompetitionBuilder';
import { periodService } from '../../../src/services/periodService';
import { TrainingPeriod } from '../../../src/types/period';
import { getWorkoutColor } from '../../../src/shared/components/MonthlyCalendar';
import { useCoachStore } from '../../../src/store/coach/coachStore';

const MONTH_NAMES_FULL = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];
const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export default function CoachDayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuthStore();

  const [workouts, setWorkouts] = useState<any[]>([]);
  const [activePeriod, setActivePeriod] = useState<TrainingPeriod | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [builderType, setBuilderType] = useState<'none' | 'hybrid' | 'strength' | 'escalier' | 'repos' | 'technique' | 'competition'>('none');
  const [builderTitle, setBuilderTitle] = useState('');
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [editingWorkout, setEditingWorkout] = useState<any>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [showAddOptions, setShowAddOptions] = useState(false);

  const { teams, fetchTeams, fetchSubgroups, fetchTeamMembers } = useCoachStore();

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    if (teams.length > 0) {
      const activeTeamId = teams[0].id;
      fetchSubgroups(activeTeamId);
      fetchTeamMembers(activeTeamId);
    }
  }, [teams, fetchSubgroups, fetchTeamMembers]);

  const dateString = date as string;

  let parsedDate = new Date();
  let formattedTitle = 'Chargement...';

  if (dateString && typeof dateString === 'string' && dateString.includes('-')) {
    const [yearStr, monthStr, dayStr] = dateString.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1;
    const day = parseInt(dayStr);

    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      parsedDate = new Date(year, month, day);

      const dayName = DAY_NAMES[parsedDate.getDay()] || '';
      const dayNum = parsedDate.getDate() || '';
      const monthName = MONTH_NAMES_FULL[parsedDate.getMonth()] || '';

      formattedTitle = `${dayName} ${dayNum} ${monthName}`.trim();
    } else {
      formattedTitle = 'Date invalide';
    }
  } else {
    formattedTitle = 'Date invalide';
  }

  const navigateDay = useCallback((direction: number) => {
    if (isNaN(parsedDate.getTime())) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDate = new Date(parsedDate);
    newDate.setDate(newDate.getDate() + direction);
    const yyyy = newDate.getFullYear();
    const mm = String(newDate.getMonth() + 1).padStart(2, '0');
    const dd = String(newDate.getDate()).padStart(2, '0');
    router.replace(`/(coach)/day/${yyyy}-${mm}-${dd}`);
  }, [parsedDate, router]);

  const fetchDayWorkouts = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      // 1. Fetch workouts for the date
      const data = await workoutService.fetchWorkoutsForDate(user.id, parsedDate, 'coach');
      const seen = new Set<string>();
      const dedupedWorkouts: any[] = [];
      for (const w of (data || [])) {
        const key = w.group_assignment_id || w.id;
        if (!seen.has(key)) {
          seen.add(key);
          dedupedWorkouts.push(w);
        }
      }
      setWorkouts(dedupedWorkouts);

      // 2. Fetch coach periods to check if the day is in an active training phase
      const year = parsedDate.getFullYear();
      const month = parsedDate.getMonth();
      const periods = await periodService.fetchPeriodsForMonth(user.id, year, month, 'coach');
      const dateIso = `${year}-${String(month + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;
      const foundPeriod = (periods || []).find((p: TrainingPeriod) => dateIso >= p.start_date && dateIso <= p.end_date);
      setActivePeriod(foundPeriod || null);
    } catch (error) {
      console.error('Error fetching day workouts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, dateString]);

  useEffect(() => {
    fetchDayWorkouts();
  }, [fetchDayWorkouts]);

  const handleSaveWorkout = useCallback(() => {
    setBuilderType('none');
    setEditingWorkout(null);
    fetchDayWorkouts();
  }, [fetchDayWorkouts]);

  const handleDeleteWorkout = useCallback(async (w: any) => {
    if (!w?.id) return;
    setIsLoading(true);
    try {
      await workoutService.deleteWorkout(w.id, w.group_assignment_id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsDetailModalVisible(false);
      setSelectedWorkout(null);
      await fetchDayWorkouts();
    } catch (error) {
      console.error('Error deleting workout:', error);
      Alert.alert('Erreur', 'Impossible de supprimer la séance.');
    } finally {
      setIsLoading(false);
    }
  }, [fetchDayWorkouts]);

  const handleEditWorkout = useCallback((w: any) => {
    if (!w) return;
    setIsDetailModalVisible(false);
    setSelectedWorkout(null);
    setEditingWorkout(w);

    const type = (w.type_seance || '').toLowerCase();
    if (type.includes('escalier')) {
      setBuilderType('escalier');
    } else if (type.includes('muscu') || type.includes('force') || type.includes('strength')) {
      setBuilderType('strength');
    } else if (type.includes('repos')) {
      setBuilderType('repos');
    } else if (type.includes('technique')) {
      setBuilderType('technique');
    } else {
      setBuilderType('hybrid');
    }
  }, []);

  const openBuilder = useCallback((type: 'hybrid' | 'strength' | 'escalier' | 'repos' | 'technique' | 'competition', defaultTitle: string = '') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEditingWorkout(null);
    setBuilderTitle(defaultTitle);
    setBuilderType(type);
    setShowAddOptions(false);
  }, []);

  const CREATION_OPTIONS = [
    {
      id: 'muscu',
      title: 'Musculation',
      subtitle: 'Charges, séries & rep.',
      icon: 'barbell-outline' as any,
      color: '#6366F1',
      type: 'strength' as const,
    },
    {
      id: 'course',
      title: 'Course & Sprint',
      subtitle: 'Vitesse, lactique & chronos',
      icon: 'stopwatch-outline' as any,
      color: '#EF4444',
      type: 'hybrid' as const,
    },
    {
      id: 'technique',
      title: 'Séance Technique',
      subtitle: 'Blocks, haies & virages',
      icon: 'git-merge-outline' as any,
      color: '#10B981',
      type: 'technique' as const,
    },
    {
      id: 'escalier',
      title: 'Escalier',
      subtitle: 'Puissance & fréquence',
      icon: 'stats-chart-outline' as any,
      color: '#8B5CF6',
      type: 'escalier' as const,
    },
    {
      id: 'repos',
      title: 'Jour de repos',
      subtitle: 'Récupération & soins',
      icon: 'cafe-outline' as any,
      color: '#64748B',
      type: 'repos' as const,
    },
    {
      id: 'competition',
      title: 'Compétition',
      subtitle: 'Meeting & épreuves',
      icon: 'trophy-outline' as any,
      color: '#F59E0B',
      type: 'competition' as const,
    },
  ];

  const getSummaryText = () => {
    if (workouts.length === 0) return 'Aucune séance';
    const countText = `${workouts.length} Séance${workouts.length > 1 ? 's' : ''}`;
    const types = workouts.map(w => w.type_seance).filter(Boolean);
    const uniqueTypes = Array.from(new Set(types));
    if (uniqueTypes.length > 0) {
      return `${countText} • ${uniqueTypes.join(' + ')}`;
    }
    return countText;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Planning"
        showBackButton
        onBackPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.back();
        }}
      />

      {/* Date Navigator */}
      <View style={[styles.navigatorContainer, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigateDay(-1)} style={styles.navButton}>
          <Feather name="chevron-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.navDateBlock}>
          <Text style={[styles.navigatorDate, { color: theme.colors.text }]}>
            {formattedTitle}
          </Text>
          {activePeriod && (
            <View style={[styles.activePeriodBadge, { backgroundColor: activePeriod.color + '15', borderColor: activePeriod.color + '40' }]}>
              <View style={[styles.activePeriodDot, { backgroundColor: activePeriod.color }]} />
              <Text style={[styles.activePeriodText, { color: activePeriod.color }]} numberOfLines={1}>
                {activePeriod.name}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => navigateDay(1)} style={styles.navButton}>
          <Feather name="chevron-right" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
          </View>
        ) : workouts.length === 0 ? (
          <View style={styles.emptyWrapper}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Planifier une séance</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                Choisissez le type d'entraînement pour cette date
              </Text>
            </View>

            {/* Grille sportive 2 colonnes */}
            <View style={styles.gridContainer}>
              {CREATION_OPTIONS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.gridCard,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                  onPress={() => openBuilder(item.type, item.title)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.gridIconBox, { backgroundColor: item.color + '15' }]}>
                    <Ionicons name={item.icon} size={24} color={item.color} />
                  </View>
                  <Text style={[styles.gridOptionTitle, { color: theme.colors.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.gridOptionSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Quick Action Sprinty IA */}
            <TouchableOpacity
              style={[
                styles.sprintyQuickActionCard,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.accent + '30' },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push({
                  pathname: '/(coach)/chat' as any,
                  params: {
                    initialPrompt: `Propose-moi une séance d'entraînement optimisée pour le ${formattedTitle}${activePeriod ? ` dans le cadre du cycle « ${activePeriod.name} »` : ''}.`,
                  },
                });
              }}
              activeOpacity={0.8}
            >
              <View style={styles.sprintyIconBadge}>
                <Feather name="zap" size={18} color="#0069E8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sprintyCardTitle}>Sprinty IA — Générateur</Text>
                <Text style={[styles.sprintyCardSubtitle, { color: theme.colors.textSecondary }]}>
                  Créer une séance sur mesure pour le {formattedTitle}
                </Text>
              </View>
              <Feather name="arrow-right" size={18} color="#0069E8" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.workoutsContainer}>
            {/* Header info léger */}
            <View style={styles.sessionCountHeader}>
              <Text style={styles.sessionCountText}>
                {workouts.length} séance{workouts.length > 1 ? 's' : ''} programmée{workouts.length > 1 ? 's' : ''}
              </Text>
            </View>

            {/* Workouts List / Timeline propre */}
            <View style={styles.timelineWrapper}>
              {workouts.length > 1 && (
                <View style={[styles.absoluteTimelineLine, { backgroundColor: theme.colors.border }]} />
              )}
              {workouts.map((w, i) => {
                const typeColor = getWorkoutColor(w.type_seance);
                let summary = w.description ? (w.description.substring(0, 60) + (w.description.length > 60 ? '...' : '')) : '';
                if (w.exercises && Array.isArray(w.exercises) && w.exercises.length > 0) {
                  summary = `${w.exercises.length} exercice${w.exercises.length > 1 ? 's' : ''}`;
                } else if (w.type_seance?.toLowerCase().includes('technique')) {
                  if (w.measures?.technical_notes && Array.isArray(w.measures.technical_notes) && w.measures.technical_notes.length > 0) {
                    const count = w.measures.technical_notes.length;
                    const targets = Array.from(new Set(w.measures.technical_notes.map((n: any) => n.targetName))).filter(Boolean).join(', ');
                    summary = `${count} consigne${count > 1 ? 's' : ''}${targets ? ` (${targets})` : ''}`;
                  } else {
                    summary = 'Consignes techniques';
                  }
                }

                return (
                  <View key={w.id || i} style={styles.timelineRow}>
                    {workouts.length > 1 && (
                      <View style={styles.timelineDotContainer}>
                        <View style={[styles.timelineDot, { backgroundColor: typeColor, borderColor: theme.colors.background }]} />
                      </View>
                    )}
                    <View style={[styles.timelineContent, workouts.length === 1 && { paddingLeft: 0 }]}>
                      <WorkoutCard
                        title={w.type_seance}
                        status={w.status}
                        summary={summary}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedWorkout(w);
                          setIsDetailModalVisible(true);
                        }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Bouton Unique Principal "＋ Planifier" */}
            {!showAddOptions ? (
              <TouchableOpacity
                style={[styles.primaryPlanBtn, { ...theme.shadows.soft }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowAddOptions(true);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.planIconWrap}>
                  <Feather name="plus" size={18} color="#0069E8" />
                </View>
                <Text style={styles.planBtnText}>Planifier un entraînement</Text>
                <Feather name="chevron-down" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ) : (
              <View style={[styles.emptyWrapper, { marginTop: 10 }]}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Ajouter une séance</Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                    Choisissez le type d'entraînement
                  </Text>
                </View>
                <View style={styles.gridContainer}>
                  {CREATION_OPTIONS.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.gridCard,
                        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                      ]}
                      onPress={() => openBuilder(item.type, item.title)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.gridIconBox, { backgroundColor: item.color + '15' }]}>
                        <Ionicons name={item.icon} size={24} color={item.color} />
                      </View>
                      <Text style={[styles.gridOptionTitle, { color: theme.colors.text }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[styles.gridOptionSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={{ alignItems: 'center', marginTop: 14, paddingVertical: 10 }}
                  onPress={() => setShowAddOptions(false)}
                >
                  <Text style={{ color: theme.colors.textSecondary, fontWeight: '700', fontSize: 14 }}>Fermer</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* === Builder Modals === */}
      <RunWorkoutBuilder
        visible={builderType === 'hybrid'}
        date={parsedDate}
        initialWorkout={editingWorkout}
        onClose={() => {
          setBuilderType('none');
          setEditingWorkout(null);
        }}
        onSave={handleSaveWorkout}
      />
      <StrengthWorkoutBuilder
        visible={builderType === 'strength'}
        date={parsedDate}
        initialWorkout={editingWorkout}
        onClose={() => {
          setBuilderType('none');
          setEditingWorkout(null);
        }}
        onSave={handleSaveWorkout}
      />
      <StairsWorkoutBuilder
        visible={builderType === 'escalier'}
        date={parsedDate}
        initialWorkout={editingWorkout}
        onClose={() => {
          setBuilderType('none');
          setEditingWorkout(null);
        }}
        onSave={handleSaveWorkout}
      />
      <RestDayBuilder
        visible={builderType === 'repos'}
        date={parsedDate}
        initialWorkout={editingWorkout}
        onClose={() => {
          setBuilderType('none');
          setEditingWorkout(null);
        }}
        onSave={handleSaveWorkout}
      />
      <TechnicalWorkoutBuilder
        visible={builderType === 'technique'}
        date={parsedDate}
        initialWorkout={editingWorkout}
        onClose={() => {
          setBuilderType('none');
          setEditingWorkout(null);
        }}
        onSave={handleSaveWorkout}
      />
      <CompetitionBuilder
        visible={builderType === 'competition'}
        date={parsedDate}
        initialWorkout={editingWorkout}
        onClose={() => {
          setBuilderType('none');
          setEditingWorkout(null);
        }}
        onSave={handleSaveWorkout}
      />

      <WorkoutDetailModal
        visible={isDetailModalVisible}
        workout={selectedWorkout}
        onClose={() => {
          setIsDetailModalVisible(false);
          setSelectedWorkout(null);
        }}
        onDelete={handleDeleteWorkout}
        onEdit={handleEditWorkout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navigatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  navButton: {
    padding: 8,
  },
  navDateBlock: {
    alignItems: 'center',
    gap: 4,
  },
  navigatorDate: {
    fontSize: 18,
    fontWeight: '700',
  },
  activePeriodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  activePeriodDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activePeriodText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 80,
  },
  centerContainer: {
    paddingTop: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },

  // Session Count Header
  sessionCountHeader: {
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  sessionCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Timeline
  timelineWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  absoluteTimelineLine: {
    position: 'absolute',
    left: 11,
    top: 24,
    bottom: 24,
    width: 2,
    borderRadius: 1,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineDotContainer: {
    width: 24,
    alignItems: 'center',
    paddingTop: 45, // roughly center of standard WorkoutCard
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    zIndex: 2,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 12,
  },

  // Empty State - Athletic 2x3 Grid
  emptyWrapper: {
    paddingTop: 8,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  gridCard: {
    width: '48%',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  gridIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  gridOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  gridOptionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },

  // Quick Action Sprinty IA
  sprintyQuickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    marginTop: 18,
    shadowColor: '#0069E8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  sprintyIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 105, 232, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sprintyCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0069E8',
  },
  sprintyCardSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },

  // Workouts List
  workoutsContainer: {
    gap: 0,
  },

  // Primary Plan Button (Bouton Unique Élégant)
  primaryPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 22,
    marginTop: 6,
  },
  planIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 105, 232, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  planBtnText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
});
