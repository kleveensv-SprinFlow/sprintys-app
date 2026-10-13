import React, { useState, useMemo } from 'react';
import { Database } from '../../../types/supabase';
import { View, Text, StyleSheet, Modal, ScrollView, Image, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../core/theme';
import { glassCard } from '../../../core/glass';
import { useCoachStore } from '../../../store/coach/coachStore';
import { EmptyState } from '../../../shared/components/EmptyState';
import { IconButton } from '../../../shared/components/IconButton';
import { PressableScale } from '../../../shared/components/PressableScale';
import { SegmentedControl } from '../../../shared/components/SegmentedControl';
import { Skeleton, SkeletonCard } from '../../../shared/components/Skeleton';
import { FeedbackHost } from '../../../shared/feedback/FeedbackHost';

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Filter = 'all' | 'completed' | 'pending';

/**
 * Form levels. `text` is a darker shade of the semantic token so labels stay readable
 * on light tints; `dot` is the token itself (dots, bars, icons).
 */
type Tone = { text: string; dot: string; bg: string };
const TONES: Record<'good' | 'warn' | 'bad' | 'none', Tone> = {
  good: { text: '#059669', dot: theme.colors.success, bg: 'rgba(16, 185, 129, 0.12)' },
  warn: { text: '#B45309', dot: theme.colors.warning, bg: 'rgba(245, 158, 11, 0.14)' },
  bad: { text: '#DC2626', dot: theme.colors.error, bg: 'rgba(239, 68, 68, 0.1)' },
  none: { text: theme.colors.textSecondary, dot: theme.colors.textMuted, bg: theme.colors.glassFill },
};
/** Sleep keeps its own semantic color (indigo) across the app. */
const SLEEP_COLOR = '#6366F1';
const BLUE_TINT = 'rgba(0, 105, 232, 0.08)';

export const TeamHealthModal = ({ visible, onClose }: Props) => {
  const { teamMembers, teamCheckIns, subgroups, isLoading } = useCoachStore();
  const [expandedAthleteId, setExpandedAthleteId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<Filter>('all');

  const calculateScore = (ci: Database['public']['Tables']['check_ins']['Row'] | null | undefined) => {
    if (!ci) return null;
    if (ci.health_score !== undefined && ci.health_score !== null) return Math.round(ci.health_score);
    return null;
  };

  const getScoreTone = (score: number | null): Tone => {
    if (score === null) return TONES.none;
    if (score >= 70) return TONES.good;
    if (score >= 40) return TONES.warn;
    return TONES.bad;
  };

  const formatCleanTime = (timeStr?: string | null): string => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}h${parts[1]}`;
    }
    return timeStr;
  };

  const getSleepQualityLabel = (q?: number | null) => {
    if (q === null || q === undefined) return '-';
    if (q >= 5) return '5/5 · Réparateur';
    if (q >= 4) return '4/5 · Bon';
    if (q >= 3) return '3/5 · Correct';
    if (q >= 2) return '2/5 · Agité';
    return '1/5 · Mauvais';
  };

  const getEnergyLabel = (fatigue?: number | null): { text: string; tone: Tone } => {
    if (fatigue === null || fatigue === undefined) return { text: '-', tone: TONES.none };
    const energy = 6 - fatigue;
    if (energy >= 5) return { text: 'En feu (5/5)', tone: TONES.good };
    if (energy >= 4) return { text: 'En forme (4/5)', tone: TONES.good };
    if (energy >= 3) return { text: 'Correct (3/5)', tone: TONES.warn };
    if (energy >= 2) return { text: 'Fatigué (2/5)', tone: TONES.bad };
    return { text: 'Épuisé (1/5)', tone: TONES.bad };
  };

  const getStressLabel = (stress?: number | null): { text: string; tone: Tone } => {
    if (stress === null || stress === undefined) return { text: '-', tone: TONES.none };
    if (stress <= 1) return { text: 'Très serein', tone: TONES.good };
    if (stress === 2) return { text: 'Serein (2/5)', tone: TONES.good };
    if (stress === 3) return { text: 'Modéré (3/5)', tone: TONES.warn };
    if (stress === 4) return { text: 'Sous tension (4/5)', tone: TONES.bad };
    return { text: 'Très stressé (5/5)', tone: TONES.bad };
  };

  const getFormRecommendation = (score?: number | null) => {
    if (score === null || score === undefined) return 'En attente';
    if (score >= 80) return 'Pleine intensité';
    if (score >= 60) return 'Séance normale';
    if (score >= 40) return 'Adapter la charge';
    return 'Récupération';
  };

  // Team summary statistics
  const summary = useMemo(() => {
    const total = teamMembers.length;
    let completedCount = 0;
    let totalScore = 0;
    let scoreCount = 0;
    let totalSleep = 0;
    let sleepCount = 0;
    let totalFatigue = 0;
    let fatigueCount = 0;

    teamMembers.forEach(m => {
      const ci = teamCheckIns.find(c => c.athlete_id === m.user_id);
      if (ci) {
        completedCount++;
        if (ci.health_score != null) {
          totalScore += ci.health_score;
          scoreCount++;
        }
        if (ci.sleep_hours != null) {
          totalSleep += ci.sleep_hours;
          sleepCount++;
        }
        if (ci.fatigue_level != null) {
          totalFatigue += ci.fatigue_level;
          fatigueCount++;
        }
      }
    });

    const avgScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : null;
    const avgSleep = sleepCount > 0 ? (totalSleep / sleepCount).toFixed(1) : null;
    const avgFatigue = fatigueCount > 0 ? (totalFatigue / fatigueCount).toFixed(1) : null;

    return {
      total,
      completedCount,
      pendingCount: total - completedCount,
      avgScore,
      avgSleep,
      avgFatigue,
    };
  }, [teamMembers, teamCheckIns]);

  const filteredMembers = useMemo(() => {
    return teamMembers.filter(m => {
      const ci = teamCheckIns.find(c => c.athlete_id === m.user_id);
      if (activeFilter === 'completed') return !!ci;
      if (activeFilter === 'pending') return !ci;
      return true;
    });
  }, [teamMembers, teamCheckIns, activeFilter]);

  const globalStatus = useMemo(() => {
    if (summary.avgScore === null) return { text: 'En attente des check-ins', tone: TONES.none };
    if (summary.avgScore >= 70) return { text: 'Forme globale excellente', tone: TONES.good };
    if (summary.avgScore >= 40) return { text: 'Vigilance fatigue', tone: TONES.warn };
    return { text: 'Récupération nécessaire', tone: TONES.bad };
  }, [summary.avgScore]);

  const showSkeleton = isLoading && teamMembers.length === 0;

  const filterOptions: { key: Filter; label: string }[] = [
    { key: 'all', label: `Tous (${summary.total})` },
    { key: 'completed', label: `Remplis (${summary.completedCount})` },
    { key: 'pending', label: `En attente (${summary.pendingCount})` },
  ];

  const renderList = () => {
    if (showSkeleton) {
      return (
        <View>
          <SkeletonCard avatar lines={1} />
          <SkeletonCard avatar lines={1} />
          <SkeletonCard avatar lines={1} />
        </View>
      );
    }

    if (teamMembers.length === 0) {
      return (
        <EmptyState
          icon="users"
          title="Aucun athlète dans l’équipe"
          message="Invite tes athlètes pour suivre leur forme au quotidien."
          compact
        />
      );
    }

    if (filteredMembers.length === 0) {
      return activeFilter === 'completed' ? (
        <EmptyState
          icon="clock"
          title="Aucun check-in rempli"
          message="Les check-ins de tes athlètes s’afficheront ici au fil de la matinée."
          compact
        />
      ) : (
        <EmptyState
          icon="check-circle"
          title="Tout le monde a répondu"
          message="Tous les athlètes de l’équipe ont rempli leur check-in aujourd’hui."
          compact
        />
      );
    }

    return filteredMembers.map(athlete => {
      const checkIn = teamCheckIns.find(ci => ci.athlete_id === athlete.user_id);
      const score = calculateScore(checkIn);
      const scoreTone = getScoreTone(score);
      const isExpanded = expandedAthleteId === athlete.user_id;
      const subgroup = subgroups.find(sg => sg.id === athlete.subgroup_id);

      const athleteName =
        athlete.profile?.full_name ||
        `${athlete.profile?.first_name || ''} ${athlete.profile?.last_name || ''}`.trim() ||
        'Athlète';
      const initials = (
        (athlete.profile?.first_name?.charAt(0) || athlete.profile?.full_name?.charAt(0) || 'A') +
        (athlete.profile?.last_name?.charAt(0) || '')
      ).toUpperCase();

      const painsList = Array.isArray(checkIn?.pains) ? checkIn.pains : [];

      return (
        <View key={athlete.user_id} style={[glassCard, styles.athleteCard, isExpanded && styles.athleteCardActive]}>
          <PressableScale
            haptic="selection"
            activeScale={0.99}
            style={styles.athleteRow}
            onPress={() => setExpandedAthleteId(isExpanded ? null : athlete.user_id)}
            accessibilityRole="button"
            accessibilityState={{ expanded: isExpanded }}
            accessibilityLabel={`${athleteName}, ${score !== null ? `forme ${score} %` : 'check-in en attente'}`}
          >
            {athlete.profile?.avatar_url ? (
              <Image source={{ uri: athlete.profile.avatar_url }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}

            <View style={styles.athleteInfo}>
              <Text style={styles.athleteName} numberOfLines={1} ellipsizeMode="tail">
                {athleteName}
              </Text>

              <View style={styles.metaRow}>
                {subgroup && (
                  <View style={styles.subgroupPill}>
                    <Text style={styles.subgroupText}>{subgroup.name}</Text>
                  </View>
                )}
                <View
                  style={[
                    styles.statusIndicatorDot,
                    { backgroundColor: checkIn ? theme.colors.success : theme.colors.textMuted },
                  ]}
                />
                <Text style={styles.athleteStatus}>{checkIn ? 'Check-in validé' : 'En attente'}</Text>
              </View>

              {/* Douleurs visibles sans dérouler */}
              {painsList.length > 0 && (
                <View style={styles.painInline}>
                  <Feather name="alert-circle" size={12} color={TONES.bad.text} />
                  <Text style={styles.painInlineText} numberOfLines={1}>
                    {painsList.map((p: any) => `${p.muscle_name || p.muscle_id} (${p.intensity}/10)`).join(', ')}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.scoreContainer}>
              {score !== null ? (
                <View style={[styles.scoreBadge, { backgroundColor: scoreTone.bg }]}>
                  <Text style={[styles.scoreText, { color: scoreTone.text }]}>{score}%</Text>
                </View>
              ) : (
                <View style={styles.pendingBadge}>
                  <Feather name="clock" size={12} color={theme.colors.textSecondary} />
                  <Text style={styles.pendingBadgeText}>En attente</Text>
                </View>
              )}
              <Feather
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={theme.colors.textMuted}
                style={styles.chevron}
              />
            </View>
          </PressableScale>

          {isExpanded && (
            <View style={styles.detailsContainer}>
              {!checkIn ? (
                <View style={styles.pendingCheckinBox}>
                  <Feather name="clock" size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.noDataText}>
                    Cet athlète n’a pas encore rempli son check-in aujourd’hui.
                  </Text>
                </View>
              ) : (
                <View>
                  {painsList.length > 0 && (
                    <View style={styles.painsBanner}>
                      <Feather name="alert-triangle" size={16} color={TONES.bad.text} style={styles.painsBannerIcon} />
                      <View style={styles.flex}>
                        <Text style={styles.painsBannerTitle}>
                          {painsList.length} douleur{painsList.length > 1 ? 's' : ''} signalée{painsList.length > 1 ? 's' : ''}
                        </Text>
                        <Text style={styles.painsBannerText}>
                          {painsList.map((p: any) => p.muscle_name || p.muscle_id || p).join(', ')}
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.metricsGrid}>
                    <View style={styles.metricsRow}>
                      {/* Sommeil */}
                      <View style={styles.metricTile}>
                        <View style={styles.metricHeader}>
                          <Feather name="moon" size={14} color={SLEEP_COLOR} />
                          <Text style={styles.metricTitle}>Sommeil</Text>
                        </View>
                        <Text style={styles.metricBigVal}>
                          {checkIn.sleep_hours != null ? `${checkIn.sleep_hours}h` : '-'}
                        </Text>
                        <Text style={styles.metricSubText}>{getSleepQualityLabel(checkIn.sleep_quality)}</Text>
                        {(checkIn.bedtime || checkIn.wakeup_time) && (
                          <View style={styles.sleepTimeBadge}>
                            <Feather name="clock" size={10} color={SLEEP_COLOR} />
                            <Text style={styles.sleepTimeBadgeText}>
                              {formatCleanTime(checkIn.bedtime)} → {formatCleanTime(checkIn.wakeup_time)}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Énergie & mental */}
                      {(() => {
                        const energy = getEnergyLabel(checkIn.fatigue_level);
                        const stress = getStressLabel(checkIn.stress_level);
                        return (
                          <View style={styles.metricTile}>
                            <View style={styles.metricHeader}>
                              <Feather name="zap" size={14} color={theme.colors.warning} />
                              <Text style={styles.metricTitle}>Énergie & mental</Text>
                            </View>
                            <View style={[styles.pillBadge, { backgroundColor: energy.tone.bg }]}>
                              <Text style={[styles.pillBadgeText, { color: energy.tone.text }]}>{energy.text}</Text>
                            </View>
                            <Text style={[styles.metricSubText, styles.metricSubSpaced]}>
                              Stress : <Text style={[styles.metricSubStrong, { color: stress.tone.text }]}>{stress.text}</Text>
                            </Text>
                            {checkIn.mental_score != null && (
                              <Text style={[styles.metricSubText, styles.metricSubTight]}>
                                Indice mental : {Math.round(checkIn.mental_score)}%
                              </Text>
                            )}
                          </View>
                        );
                      })()}
                    </View>

                    <View style={styles.metricsRow}>
                      {/* Physique & douleurs */}
                      {(() => {
                        const physicalTone =
                          checkIn.physical_score != null ? getScoreTone(checkIn.physical_score) : TONES.good;
                        return (
                          <View style={styles.metricTile}>
                            <View style={styles.metricHeader}>
                              <Feather name="activity" size={14} color={physicalTone.dot} />
                              <Text style={styles.metricTitle}>Physique</Text>
                            </View>
                            <Text style={[styles.metricBigVal, { color: physicalTone.text }]}>
                              {checkIn.physical_score != null ? `${Math.round(checkIn.physical_score)}%` : '-'}
                            </Text>
                            {painsList.length === 0 ? (
                              <View style={[styles.pillBadge, { backgroundColor: TONES.good.bg }]}>
                                <Feather name="shield" size={11} color={TONES.good.text} />
                                <Text style={[styles.pillBadgeText, { color: TONES.good.text }]}>Aucune douleur</Text>
                              </View>
                            ) : (
                              <View style={[styles.pillBadge, { backgroundColor: TONES.bad.bg }]}>
                                <Feather name="alert-circle" size={11} color={TONES.bad.text} />
                                <Text style={[styles.pillBadgeText, { color: TONES.bad.text }]}>
                                  {painsList.length} douleur{painsList.length > 1 ? 's' : ''}
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })()}

                      {/* Forme & séance conseillée */}
                      <View style={styles.metricTile}>
                        <View style={styles.metricHeader}>
                          <Feather name="target" size={14} color={scoreTone.dot} />
                          <Text style={styles.metricTitle}>Forme</Text>
                        </View>
                        <Text style={[styles.metricBigVal, { color: scoreTone.text }]}>
                          {score != null ? `${score}%` : '-'}
                        </Text>
                        <View style={[styles.pillBadge, { backgroundColor: scoreTone.bg }]}>
                          <Text style={[styles.pillBadgeText, { color: scoreTone.text }]}>
                            {getFormRecommendation(score)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      );
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <FeedbackHost />
      <View style={styles.overlay}>
        {/* Toucher le fond ferme la feuille */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" />

        <View style={styles.sheetContainer}>
          <View style={styles.handleContainer}>
            <View style={styles.sheetHandle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <IconButton icon="x" onPress={onClose} accessibilityLabel="Fermer" />
            <View style={styles.headerTitleGroup}>
              <Text style={styles.title} numberOfLines={1}>
                Forme de l’équipe
              </Text>
              {showSkeleton ? (
                <Skeleton width={150} height={12} style={styles.subtitleSkeleton} />
              ) : (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {summary.total} athlète{summary.total > 1 ? 's' : ''} · {summary.completedCount} check-in
                  {summary.completedCount > 1 ? 's' : ''} aujourd’hui
                </Text>
              )}
            </View>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Synthèse de forme */}
            {showSkeleton ? (
              <View style={[glassCard, styles.summaryBanner]}>
                <Skeleton width="40%" height={12} />
                <Skeleton width="30%" height={28} style={styles.skeletonGap} />
                <Skeleton height={6} radius={3} style={styles.skeletonGap} />
                <Skeleton width="80%" height={12} style={styles.skeletonGap} />
              </View>
            ) : (
              <View style={[glassCard, styles.summaryBanner]}>
                <View style={styles.summaryTopRow}>
                  <View style={styles.flexShrink}>
                    <Text style={styles.summaryLabel}>Forme moyenne</Text>
                    {summary.avgScore !== null ? (
                      <Text style={[styles.summaryScore, { color: globalStatus.tone.text }]}>{summary.avgScore}%</Text>
                    ) : (
                      <Text style={styles.summaryScoreEmpty}>En attente</Text>
                    )}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: globalStatus.tone.bg }]}>
                    <View style={[styles.statusDot, { backgroundColor: globalStatus.tone.dot }]} />
                    <Text style={[styles.statusText, { color: globalStatus.tone.text }]} numberOfLines={1}>
                      {globalStatus.text}
                    </Text>
                  </View>
                </View>

                {/* Progression des check-ins */}
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: summary.total > 0 ? `${(summary.completedCount / summary.total) * 100}%` : '0%',
                        backgroundColor: summary.completedCount > 0 ? theme.colors.success : 'transparent',
                      },
                    ]}
                  />
                </View>

                <View style={styles.summaryStatsRow}>
                  <View style={styles.miniStatItem}>
                    <Feather
                      name="check-circle"
                      size={13}
                      color={summary.completedCount > 0 ? theme.colors.success : theme.colors.textMuted}
                    />
                    <Text style={styles.miniStatText}>
                      <Text style={styles.miniStatBold}>{summary.completedCount}</Text>/{summary.total} check-ins
                    </Text>
                  </View>
                  <View style={styles.miniStatDivider} />
                  <View style={styles.miniStatItem}>
                    <Feather name="moon" size={13} color={SLEEP_COLOR} />
                    <Text style={styles.miniStatText}>
                      <Text style={styles.miniStatBold}>{summary.avgSleep ? `${summary.avgSleep}h` : '-'}</Text> sommeil
                    </Text>
                  </View>
                  <View style={styles.miniStatDivider} />
                  <View style={styles.miniStatItem}>
                    <Feather name="battery-charging" size={13} color={theme.colors.warning} />
                    <Text style={styles.miniStatText}>
                      <Text style={styles.miniStatBold}>{summary.avgFatigue ? `${summary.avgFatigue}/5` : '-'}</Text> fatigue
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Filtres */}
            {!showSkeleton && teamMembers.length > 0 && (
              <SegmentedControl options={filterOptions} value={activeFilter} onChange={setActiveFilter} style={styles.tabs} />
            )}

            {renderList()}

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: theme.colors.backdrop,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderCurve: 'continuous',
    maxHeight: '92%',
    minHeight: '65%',
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 24,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 10,
  },
  sheetHandle: {
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.15)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.hairline,
  },
  headerTitleGroup: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  headerSpacer: {
    width: 38,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  subtitleSkeleton: {
    marginTop: 5,
  },
  scrollContent: {
    padding: 16,
  },
  flex: {
    flex: 1,
  },
  flexShrink: {
    flexShrink: 1,
  },
  skeletonGap: {
    marginTop: 12,
  },
  summaryBanner: {
    marginBottom: 16,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  summaryScore: {
    fontSize: 32,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: -0.8,
  },
  summaryScoreEmpty: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginTop: 4,
    color: theme.colors.textSecondary,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: theme.colors.glassFill,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderCurve: 'continuous',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.hairline,
  },
  miniStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  miniStatText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  miniStatBold: {
    fontWeight: '700',
    color: theme.colors.text,
  },
  miniStatDivider: {
    width: 1,
    height: 16,
    backgroundColor: theme.colors.hairline,
  },
  tabs: {
    marginBottom: 16,
  },
  athleteCard: {
    padding: 0,
    marginBottom: 10,
    overflow: 'hidden',
  },
  athleteCardActive: {
    borderColor: theme.colors.sprintyBlue,
    borderTopColor: theme.colors.sprintyBlue,
    borderBottomColor: theme.colors.sprintyBlue,
  },
  athleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    minHeight: 72,
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: theme.colors.glassFill,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BLUE_TINT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: theme.colors.sprintyBlue,
    fontWeight: '800',
    fontSize: 15,
  },
  athleteInfo: {
    flex: 1,
    marginRight: 8,
    justifyContent: 'center',
  },
  athleteName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  subgroupPill: {
    backgroundColor: theme.colors.glassFill,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  subgroupText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  statusIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  athleteStatus: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  painInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  painInlineText: {
    flex: 1,
    fontSize: 12,
    color: TONES.bad.text,
    fontWeight: '600',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevron: {
    marginLeft: 6,
  },
  scoreBadge: {
    minWidth: 48,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontWeight: '800',
    fontSize: 13,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.glassFill,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  detailsContainer: {
    padding: 14,
    paddingTop: 0,
  },
  pendingCheckinBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.glassFill,
    padding: 12,
    borderRadius: 14,
    borderCurve: 'continuous',
  },
  noDataText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  painsBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: TONES.bad.bg,
    padding: 12,
    borderRadius: 14,
    borderCurve: 'continuous',
    marginBottom: 12,
  },
  painsBannerIcon: {
    marginTop: 1,
    marginRight: 8,
  },
  painsBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TONES.bad.text,
    marginBottom: 2,
  },
  painsBannerText: {
    fontSize: 13,
    color: theme.colors.text,
  },
  metricsGrid: {
    gap: 10,
    marginTop: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricTile: {
    flex: 1,
    backgroundColor: theme.colors.glassFill,
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 12,
    justifyContent: 'space-between',
    minHeight: 100,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metricTitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '700',
  },
  metricBigVal: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
    marginVertical: 2,
  },
  metricSubText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  metricSubSpaced: {
    marginTop: 6,
  },
  metricSubTight: {
    marginTop: 2,
  },
  metricSubStrong: {
    fontWeight: '700',
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderCurve: 'continuous',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sleepTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  sleepTimeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: SLEEP_COLOR,
  },
  bottomSpacer: {
    height: 40,
  },
});
