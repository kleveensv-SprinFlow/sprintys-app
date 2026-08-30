import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '../../../src/core/theme';
import { Feather } from '@expo/vector-icons';
import { checkInService, CheckInData } from '../../../src/services/checkInService';
import { useCoachStore } from '../../../src/store/coach/coachStore';

export default function AthleteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const { teamMembers } = useCoachStore();
  // Find athlete profile from the new store structure
  const athleteMember = teamMembers.find(m => m.user_id === id);
  const profile = athleteMember?.profile;

  const [latestCheckIn, setLatestCheckIn] = useState<CheckInData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadCheckIn(id);
    }
  }, [id]);

  const loadCheckIn = async (athleteId: string) => {
    setIsLoading(true);
    try {
      const history = await checkInService.fetchRecentCheckIns(athleteId, 1);
      if (history.length > 0) {
        setLatestCheckIn(history[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!profile) return <View style={styles.center}><Text style={styles.errorText}>Athlète non trouvé</Text></View>;

  const renderScoreBar = (label: string, score: number | undefined, icon: string, color: string) => {
    const validScore = score || 0;
    return (
      <View style={styles.scoreRow}>
        <View style={styles.scoreLabelRow}>
          <Feather name={icon as any} size={16} color={theme.colors.textSecondary} />
          <Text style={styles.scoreLabel}>{label}</Text>
        </View>
        <View style={styles.scoreBarBg}>
          <View style={[styles.scoreBarFill, { width: `${validScore}%`, backgroundColor: color }]} />
        </View>
        <Text style={[styles.scoreValue, { color }]}>{Math.round(validScore)}/100</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>{profile.full_name || 'Athlète'}</Text>
          <Text style={styles.subtitle}>Détail et Forme du jour</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* CHECK-IN SECTION */}
        <Text style={styles.sectionTitle}>CHECK-IN DU JOUR</Text>
        
        {isLoading ? (
          <ActivityIndicator color={theme.colors.accent} style={{ marginVertical: 30 }} />
        ) : !latestCheckIn ? (
          <View style={styles.emptyCard}>
            <Feather name="clock" size={32} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>Aucun Check-In aujourd'hui</Text>
          </View>
        ) : (
          <View style={styles.checkInCard}>
            {/* Global Score */}
            <View style={styles.globalScoreHeader}>
              <Text style={styles.globalScoreTitle}>Readiness Score</Text>
              <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(latestCheckIn.health_score) + '20' }]}>
                <Text style={[styles.scoreBadgeText, { color: getScoreColor(latestCheckIn.health_score) }]}>
                  {latestCheckIn.health_score} %
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Subscores */}
            {renderScoreBar('Sommeil', latestCheckIn.sleep_score, 'moon', '#3b82f6')}
            {renderScoreBar('Physique', latestCheckIn.physical_score, 'activity', getScoreColor(latestCheckIn.physical_score || 0))}
            {renderScoreBar('Mental', latestCheckIn.mental_score, 'smile', '#8b5cf6')}

            {/* Pains details */}
            {latestCheckIn.pains && latestCheckIn.pains.length > 0 && (
              <View style={styles.painsContainer}>
                <Text style={styles.painsTitle}>Douleurs signalées :</Text>
                {latestCheckIn.pains.map((pain, idx) => (
                  <View key={idx} style={styles.painItem}>
                    <View style={styles.painItemHeader}>
                      <View style={[styles.dot, { backgroundColor: getScoreColor(100 - (pain.intensity * 10)) }]} />
                      <Text style={styles.painName}>{pain.muscle_name} {pain.side ? `(${pain.side})` : ''}</Text>
                      <Text style={styles.painIntensity}>{pain.intensity}/10</Text>
                    </View>
                    <Text style={styles.painType}>{pain.type}</Text>
                    {pain.comment && <Text style={styles.painComment}>"{pain.comment}"</Text>}
                  </View>
                ))}
              </View>
            )}
            
            {/* Cycle menstruel */}
            {latestCheckIn.menstruation && (
              <View style={styles.menstruationAlert}>
                <Feather name="droplet" size={16} color={theme.colors.error} />
                <Text style={styles.menstruationText}>En période de règles</Text>
              </View>
            )}
          </View>
        )}

        {/* ACTIONS */}
        <Text style={styles.sectionTitle}>ACTIONS</Text>
        <TouchableOpacity style={styles.actionBtn}>
          <Feather name="message-circle" size={20} color={theme.colors.accent} />
          <Text style={styles.actionBtnText}>Envoyer un message</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Feather name="calendar" size={20} color={theme.colors.accent} />
          <Text style={styles.actionBtnText}>Assigner une séance</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

function getScoreColor(score: number) {
  if (score >= 70) return theme.colors.success;
  if (score >= 40) return theme.colors.warning;
  return theme.colors.error;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: theme.colors.error, fontSize: 16 },
  
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  backBtn: { padding: 8, marginLeft: -8, marginRight: 12 },
  headerText: { flex: 1 },
  title: { color: theme.colors.text, fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: theme.colors.textSecondary, fontSize: 13 },
  
  scrollContent: { padding: 20 },
  sectionTitle: {
    color: theme.colors.textMuted, fontSize: 12, fontWeight: 'bold',
    letterSpacing: 1.5, marginBottom: 16, marginTop: 8
  },

  emptyCard: {
    backgroundColor: theme.colors.surface, padding: 30, borderRadius: 16,
    alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, marginBottom: 24
  },
  emptyText: { color: theme.colors.textSecondary, marginTop: 12, fontSize: 15 },

  checkInCard: {
    backgroundColor: theme.colors.surface, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: theme.colors.border, marginBottom: 32
  },
  globalScoreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  globalScoreTitle: { color: theme.colors.text, fontSize: 18, fontWeight: 'bold' },
  scoreBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  scoreBadgeText: { fontWeight: 'bold', fontSize: 16 },
  
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 20 },

  scoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  scoreLabelRow: { flexDirection: 'row', alignItems: 'center', width: 90, gap: 8 },
  scoreLabel: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600' },
  scoreBarBg: { flex: 1, height: 8, backgroundColor: theme.colors.surfaceLight, borderRadius: 4, marginHorizontal: 12 },
  scoreBarFill: { height: 8, borderRadius: 4 },
  scoreValue: { width: 45, textAlign: 'right', fontSize: 13, fontWeight: 'bold' },

  painsContainer: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.border },
  painsTitle: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: 'bold', marginBottom: 12 },
  painItem: { backgroundColor: theme.colors.surfaceLight, padding: 12, borderRadius: 12, marginBottom: 8 },
  painItemHeader: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  painName: { color: theme.colors.text, fontSize: 15, fontWeight: 'bold', flex: 1 },
  painIntensity: { color: theme.colors.textMuted, fontSize: 13, fontWeight: 'bold' },
  painType: { color: theme.colors.warning, fontSize: 13, marginTop: 4, marginLeft: 16 },
  painComment: { color: theme.colors.textSecondary, fontSize: 13, fontStyle: 'italic', marginTop: 8, marginLeft: 16 },

  menstruationAlert: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.error + '15',
    padding: 12, borderRadius: 12, marginTop: 16, gap: 8, borderWidth: 1, borderColor: theme.colors.error + '30'
  },
  menstruationText: { color: theme.colors.error, fontWeight: 'bold', fontSize: 14 },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface,
    padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border, gap: 12
  },
  actionBtnText: { color: theme.colors.text, fontSize: 16, fontWeight: '600' }
});
