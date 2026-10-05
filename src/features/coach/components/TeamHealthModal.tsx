import React, { useState, useMemo } from 'react';
import { Database } from '../../../types/supabase';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { theme } from '../../../core/theme';
import { useCoachStore } from '../../../store/coach/coachStore';
import { EmptyState } from '../../../shared/components/EmptyState';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const TeamHealthModal = ({ visible, onClose }: Props) => {
  const { teamMembers, teamCheckIns, subgroups } = useCoachStore();
  const [expandedAthleteId, setExpandedAthleteId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'completed' | 'pending'>('all');

  const calculateScore = (ci: Database['public']['Tables']['check_ins']['Row'] | null | undefined) => {
    if (!ci) return null;
    if (ci.health_score !== undefined && ci.health_score !== null) return Math.round(ci.health_score);
    return null;
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return { text: theme.colors.textMuted, bg: '#F1F5F9', border: '#E2E8F0' };
    if (score >= 70) return { text: '#059669', bg: '#ECFDF5', border: '#A7F3D0' };
    if (score >= 40) return { text: '#D97706', bg: '#FFFBEB', border: '#FDE68A' };
    return { text: '#DC2626', bg: '#FEF2F2', border: '#FECACA' };
  };

  const getMetricBadge = (value: number | null, invert: boolean = false) => {
    if (value === null || value === undefined) return { label: '-', color: theme.colors.textMuted };
    const normalized = invert ? (6 - value) : value;
    if (normalized >= 4) return { label: 'Optimal', color: '#059669' };
    if (normalized >= 3) return { label: 'Modéré', color: '#D97706' };
    return { label: 'Alerte', color: '#DC2626' };
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
    if (summary.avgScore === null) {
      return { text: 'En attente de check-ins', color: '#64748B', bg: '#F1F5F9' };
    }
    if (summary.avgScore >= 70) {
      return { text: 'Forme globale excellente', color: '#059669', bg: '#ECFDF5' };
    }
    if (summary.avgScore >= 40) {
      return { text: 'Vigilance fatigue modérée', color: '#D97706', bg: '#FFFBEB' };
    }
    return { text: 'Récupération critique requise', color: '#DC2626', bg: '#FEF2F2' };
  }, [summary.avgScore]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Backdrop touch to close */}
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} activeOpacity={1} />

        <View style={styles.sheetContainer}>
          {/* Sheet Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.sheetHandle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleGroup}>
              <View style={styles.headerIconWrap}>
                <Feather name="activity" size={18} color="#0F172A" />
              </View>
              <View>
                <Text style={styles.title}>Santé de l'équipe</Text>
                <Text style={styles.subtitle}>
                  {summary.total} athlète{summary.total > 1 ? 's' : ''} · {summary.completedCount} check-in{summary.completedCount > 1 ? 's' : ''} aujourd'hui
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Feather name="x" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Overview Readiness Banner - Modern Clean */}
            <View style={styles.summaryBanner}>
              <View style={styles.summaryTopRow}>
                <View>
                  <Text style={styles.summaryLabel}>READINESS GLOBAL</Text>
                  {summary.avgScore !== null ? (
                    <Text style={styles.summaryScore}>{summary.avgScore}%</Text>
                  ) : (
                    <Text style={[styles.summaryScoreEmpty, { color: theme.colors.textSecondary }]}>En attente</Text>
                  )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: globalStatus.bg }]}>
                  <View style={[styles.statusDot, { backgroundColor: globalStatus.color }]} />
                  <Text style={[styles.statusText, { color: globalStatus.color }]}>
                    {globalStatus.text}
                  </Text>
                </View>
              </View>

              {/* Progress bar team checkins */}
              <View style={styles.progressBarBg}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { 
                      width: summary.total > 0 ? `${(summary.completedCount / summary.total) * 100}%` : '0%',
                      backgroundColor: summary.completedCount > 0 ? '#10B981' : 'transparent' 
                    }
                  ]} 
                />
              </View>

              <View style={styles.summaryStatsRow}>
                <View style={styles.miniStatItem}>
                  <Feather name="check-circle" size={13} color={summary.completedCount > 0 ? '#059669' : '#94A3B8'} />
                  <Text style={styles.miniStatText}>
                    <Text style={styles.miniStatBold}>{summary.completedCount}</Text>/{summary.total} check-ins
                  </Text>
                </View>
                <View style={styles.miniStatDivider} />
                <View style={styles.miniStatItem}>
                  <Feather name="moon" size={13} color="#6366F1" />
                  <Text style={styles.miniStatText}>
                    Sommeil : <Text style={styles.miniStatBold}>{summary.avgSleep ? `${summary.avgSleep}h` : '-'}</Text>
                  </Text>
                </View>
                <View style={styles.miniStatDivider} />
                <View style={styles.miniStatItem}>
                  <Feather name="battery-charging" size={13} color="#F59E0B" />
                  <Text style={styles.miniStatText}>
                    Fatigue : <Text style={styles.miniStatBold}>{summary.avgFatigue ? `${summary.avgFatigue}/5` : '-'}</Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* Filter Tabs */}
            <View style={styles.tabsRow}>
              <TouchableOpacity
                style={[styles.tabButton, activeFilter === 'all' && styles.tabButtonActive]}
                onPress={() => setActiveFilter('all')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, activeFilter === 'all' && styles.tabTextActive]}>
                  Tous ({summary.total})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeFilter === 'completed' && styles.tabButtonActive]}
                onPress={() => setActiveFilter('completed')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, activeFilter === 'completed' && styles.tabTextActive]}>
                  Remplis ({summary.completedCount})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeFilter === 'pending' && styles.tabButtonActive]}
                onPress={() => setActiveFilter('pending')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, activeFilter === 'pending' && styles.tabTextActive]}>
                  En attente ({summary.pendingCount})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Athletes Cards */}
            {filteredMembers.length === 0 ? (
              <View style={styles.emptyWrap}>
                <EmptyState
                  title={activeFilter === 'completed' ? 'Aucun check-in rempli' : 'Aucun athlète en attente'}
                  message={activeFilter === 'completed' ? "Les check-ins complétés s'afficheront ici au fil de la matinée." : "Tous les athlètes de l'équipe ont complété leur check-in !"}
                />
              </View>
            ) : (
              filteredMembers.map(athlete => {
                const checkIn = teamCheckIns.find(ci => ci.athlete_id === athlete.user_id);
                const score = calculateScore(checkIn);
                const scoreTheme = getScoreColor(score);
                const isExpanded = expandedAthleteId === athlete.user_id;
                const subgroup = subgroups.find(sg => sg.id === athlete.subgroup_id);

                const athleteName = athlete.profile?.full_name || `${athlete.profile?.first_name || ''} ${athlete.profile?.last_name || ''}`.trim() || 'Athlète';
                const initials = (
                  (athlete.profile?.first_name?.charAt(0) || athlete.profile?.full_name?.charAt(0) || 'A') +
                  (athlete.profile?.last_name?.charAt(0) || '')
                ).toUpperCase();

                const painsList = Array.isArray(checkIn?.pains) ? checkIn.pains : [];

                return (
                  <View key={athlete.user_id} style={[styles.athleteCard, isExpanded && styles.athleteCardActive]}>
                    <TouchableOpacity
                      style={styles.athleteRow}
                      activeOpacity={0.7}
                      onPress={() => setExpandedAthleteId(isExpanded ? null : athlete.user_id)}
                    >
                      {/* Avatar */}
                      {athlete.profile?.avatar_url ? (
                        <Image source={{ uri: athlete.profile.avatar_url }} style={styles.avatarImg} />
                      ) : (
                        <View style={styles.avatarFallback}>
                          {initials ? (
                            <Text style={styles.avatarText}>{initials}</Text>
                          ) : (
                            <Ionicons name="person" size={18} color="#94A3B8" />
                          )}
                        </View>
                      )}

                      {/* Athlete info : Nom entier + sous-titre hiérarchisé */}
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
                              { backgroundColor: checkIn ? '#10B981' : '#CBD5E1' },
                            ]}
                          />
                          <Text style={styles.athleteStatus}>
                            {checkIn ? 'Check-in validé' : 'En attente'}
                          </Text>
                        </View>
                        {/* Alerte Douleur Visible Immédiatement sans dérouler */}
                        {painsList.length > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                            <Feather name="alert-circle" size={12} color="#DC2626" style={{ marginRight: 4 }} />
                            <Text style={{ fontSize: 12, color: '#DC2626', fontWeight: '600' }} numberOfLines={1}>
                              {painsList.map((p: any) => `${p.muscle_name || p.muscle_id} (${p.intensity}/10)`).join(', ')}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Score Badge ou statut d'attente (Fin du faux bouton avec tiret) */}
                      <View style={styles.scoreContainer}>
                        {score !== null ? (
                          <View
                            style={[
                              styles.scoreBadge,
                              { backgroundColor: scoreTheme.bg, borderColor: scoreTheme.border },
                            ]}
                          >
                            <Text style={[styles.scoreText, { color: scoreTheme.text }]}>
                              {score}%
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.pendingBadge}>
                            <Feather name="clock" size={12} color="#94A3B8" />
                            <Text style={styles.pendingBadgeText}>Attente</Text>
                          </View>
                        )}
                        <Feather
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color="#94A3B8"
                          style={{ marginLeft: 6 }}
                        />
                      </View>
                    </TouchableOpacity>

                    {/* Expandable Details */}
                    {isExpanded && (
                      <View style={styles.detailsContainer}>
                        {!checkIn ? (
                          <View style={styles.pendingCheckinBox}>
                            <Feather name="clock" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                            <Text style={styles.noDataText}>
                              Cet athlète n'a pas encore rempli son formulaire ce matin.
                            </Text>
                          </View>
                        ) : (
                          <View>
                            {/* Pains alert if present */}
                            {painsList.length > 0 && (
                              <View style={styles.painsBanner}>
                                <Feather name="alert-triangle" size={16} color="#DC2626" style={{ marginTop: 2, marginRight: 8 }} />
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.painsBannerTitle}>
                                    {painsList.length} douleur{painsList.length > 1 ? 's' : ''} signalée{painsList.length > 1 ? 's' : ''}
                                  </Text>
                                  <Text style={styles.painsBannerText}>
                                    {painsList.map((p: any) => p.muscle_name || p.muscle_id || p).join(', ')}
                                  </Text>
                                </View>
                              </View>
                            )}

                            {/* 5 Core Metrics */}
                            <View style={styles.metricsGrid}>
                              {/* Sommeil */}
                              <View style={styles.metricCard}>
                                <View style={styles.metricCardHeader}>
                                  <Feather name="moon" size={14} color="#6366F1" />
                                  <Text style={styles.metricCardTitle}>Sommeil</Text>
                                </View>
                                <Text style={styles.metricMainVal}>
                                  {checkIn.sleep_hours != null ? `${checkIn.sleep_hours}h` : '-'}
                                </Text>
                                <Text style={styles.metricSubVal}>
                                  Qualité : {checkIn.sleep_quality != null ? `${checkIn.sleep_quality}/5` : '-'}
                                </Text>
                              </View>

                              {/* Fatigue */}
                              <View style={styles.metricCard}>
                                <View style={styles.metricCardHeader}>
                                  <Feather name="battery" size={14} color="#F59E0B" />
                                  <Text style={styles.metricCardTitle}>Fatigue</Text>
                                </View>
                                <Text style={styles.metricMainVal}>
                                  {checkIn.fatigue_level != null ? `${checkIn.fatigue_level}/5` : '-'}
                                </Text>
                                <Text
                                  style={[
                                    styles.metricBadgeLabel,
                                    { color: getMetricBadge(checkIn.fatigue_level, true).color },
                                  ]}
                                >
                                  {getMetricBadge(checkIn.fatigue_level, true).label}
                                </Text>
                              </View>

                              {/* Stress */}
                              <View style={styles.metricCard}>
                                <View style={styles.metricCardHeader}>
                                  <Feather name="zap" size={14} color="#EC4899" />
                                  <Text style={styles.metricCardTitle}>Stress</Text>
                                </View>
                                <Text style={styles.metricMainVal}>
                                  {checkIn.stress_level != null ? `${checkIn.stress_level}/5` : '-'}
                                </Text>
                                <Text
                                  style={[
                                    styles.metricBadgeLabel,
                                    { color: getMetricBadge(checkIn.stress_level, true).color },
                                  ]}
                                >
                                  {getMetricBadge(checkIn.stress_level, true).label}
                                </Text>
                              </View>

                              {/* Physique */}
                              <View style={styles.metricCard}>
                                <View style={styles.metricCardHeader}>
                                  <Feather name="activity" size={14} color="#10B981" />
                                  <Text style={styles.metricCardTitle}>Physique</Text>
                                </View>
                                <Text style={styles.metricMainVal}>
                                  {checkIn.physical_score != null ? `${checkIn.physical_score}/5` : '-'}
                                </Text>
                                <Text
                                  style={[
                                    styles.metricBadgeLabel,
                                    { color: getMetricBadge(checkIn.physical_score, true).color },
                                  ]}
                                >
                                  {getMetricBadge(checkIn.physical_score, true).label}
                                </Text>
                              </View>

                              {/* Mental */}
                              <View style={styles.metricCard}>
                                <View style={styles.metricCardHeader}>
                                  <Feather name="target" size={14} color="#0EA5E9" />
                                  <Text style={styles.metricCardTitle}>Mental</Text>
                                </View>
                                <Text style={styles.metricMainVal}>
                                  {checkIn.mental_score != null ? `${checkIn.mental_score}/5` : '-'}
                                </Text>
                                <Text
                                  style={[
                                    styles.metricBadgeLabel,
                                    { color: getMetricBadge(checkIn.mental_score).color },
                                  ]}
                                >
                                  {getMetricBadge(checkIn.mental_score).label}
                                </Text>
                              </View>
                            </View>

                            {/* Sleep schedule note if available */}
                            {(checkIn.bedtime || checkIn.wakeup_time) && (
                              <View style={styles.sleepScheduleRow}>
                                <Feather name="clock" size={12} color="#94A3B8" />
                                <Text style={styles.sleepScheduleText}>
                                  Couché : {checkIn.bedtime || '-'} · Réveil : {checkIn.wakeup_time || '-'}
                                </Text>
                              </View>
                            )}
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
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    minHeight: '65%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
    overflow: 'hidden',
  },
  handleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  summaryBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  summaryScore: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  summaryScoreEmpty: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#F1F5F9',
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
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
  },
  summaryStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  miniStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniStatText: {
    fontSize: 12,
    color: '#64748B',
  },
  miniStatBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  miniStatDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#E2E8F0',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 3,
    marginBottom: 16,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 11,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  emptyWrap: {
    paddingVertical: 20,
  },
  athleteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  athleteCardActive: {
    borderWidth: 1.5,
    borderColor: '#0069E8',
  },
  athleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: '#F1F5F9',
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#0F172A',
    fontWeight: '700',
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
    color: '#0F172A',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  subgroupPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  subgroupText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  statusIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  athleteStatus: {
    fontSize: 12,
    color: '#64748B',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreBadge: {
    minWidth: 46,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
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
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  detailsContainer: {
    padding: 14,
    paddingTop: 0,
    backgroundColor: '#FFFFFF',
  },
  pendingCheckinBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noDataText: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  painsBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 12,
  },
  painsBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 2,
  },
  painsBannerText: {
    fontSize: 12,
    color: '#991B1B',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    minWidth: '28%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  metricCardTitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  metricMainVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  metricSubVal: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  metricBadgeLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  sleepScheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  sleepScheduleText: {
    fontSize: 11,
    color: '#94A3B8',
  },
});
