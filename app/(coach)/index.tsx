import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../src/core/theme';
import { useAuthStore } from '../../src/store/authStore';
import { useCoachStore } from '../../src/store/coach/coachStore';
import { supabase } from '../../src/services/supabase';
import { CoachWeatherCard } from '../../src/features/coach/components/CoachWeatherCard';
import { BroadcastModal } from '../../src/features/coach/components/BroadcastModal';
import { SprintyLogo } from '../../src/shared/components/SprintyLogo';
import { TeamHealthModal } from '../../src/features/coach/components/TeamHealthModal';

export default function CoachDashboardScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { teams, teamMembers, pendingMembers, teamCheckIns, fetchTeamCheckIns, fetchAllPendingRequests } = useCoachStore();
  
  const [broadcastVisible, setBroadcastVisible] = useState(false);
  const [teamHealthVisible, setTeamHealthVisible] = useState(false);
  const [todayWorkouts, setTodayWorkouts] = useState<any[]>([]);
  const auraAnim = useRef(new Animated.Value(0.1)).current;

  useEffect(() => {
    // Fetch les check-ins d'aujourd'hui pour l'équipe active
    if (teams.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      fetchTeamCheckIns(teams[0].id, today);
      fetchAllPendingRequests();
      
      // Fetch workouts planned for today
      (async () => {
        const start = new Date(today);
        const end = new Date(today);
        end.setDate(end.getDate() + 1);

        const { data } = await supabase
          .from('workouts')
          .select('*')
          .eq('team_id', teams[0].id)
          .gte('date_prevue', start.toISOString())
          .lt('date_prevue', end.toISOString())
          .order('date_prevue', { ascending: true });
        
        if (data) setTodayWorkouts(data);
      })();
    }
  }, [teams, teamMembers]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(auraAnim, {
          toValue: 0.35,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(auraAnim, {
          toValue: 0.1,
          duration: 2500,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [auraAnim]);

  // Moyenne de santé du groupe
  const getGroupHealth = () => {
    if (teamCheckIns.length === 0) return null;
    let sum = 0;
    teamCheckIns.forEach(ci => {
      const score = (ci.sleep_quality + ci.energy + (6 - ci.stress_level) + (6 - ci.pain_level) + (6 - ci.muscle_soreness)) / 5;
      sum += score;
    });
    return sum / teamCheckIns.length;
  };

  const avgHealth = getGroupHealth();
  const avgHealthStr = avgHealth ? `${avgHealth.toFixed(1)} / 5` : 'N/A';
  const healthColor = avgHealth === null ? theme.colors.textMuted : avgHealth >= 4.0 ? theme.colors.success : avgHealth >= 3.0 ? theme.colors.warning : theme.colors.error;

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER COACH */}
      <View style={styles.header}>
        {/* Left: Annonce */}
        <TouchableOpacity onPress={() => setBroadcastVisible(true)} style={[styles.iconButton, { backgroundColor: theme.colors.surfaceLight }]}>
          <Feather name="mic" size={24} color={theme.colors.text} />
        </TouchableOpacity>

        {/* Center: Logo */}
        <SprintyLogo width={120} height={40} />

        {/* Right: Profil */}
        <TouchableOpacity onPress={() => router.push('/(coach)/profile')} style={[styles.iconButton, { backgroundColor: theme.colors.surfaceLight }]}>
          <Feather name="user" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.welcomeText}>Bonjour, Coach {user?.firstName || user?.name?.split(' ')[0]}</Text>

        {/* Santé du Groupe (Breathing Aura) */}
        <View style={styles.statsRow}>
          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, overflow: 'hidden' }]}
            activeOpacity={0.9}
            onPress={() => setTeamHealthVisible(true)}
          >
            <Animated.View style={[
              StyleSheet.absoluteFillObject, 
              { backgroundColor: healthColor, opacity: auraAnim }
            ]} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="activity" size={20} color={healthColor} />
                <Text style={styles.statLabel}>SANTÉ DU GROUPE</Text>
              </View>
              <Feather name="chevron-right" size={20} color={theme.colors.textMuted} />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{avgHealthStr}</Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 4, fontWeight: '500' }}>
              {avgHealth !== null ? (avgHealth >= 4 ? 'Excellente forme globale' : avgHealth >= 3 ? 'Fatigue modérée - Vigilance' : 'Récupération critique requise') : 'En attente de données'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Météo Coach */}
        <CoachWeatherCard />

        {/* Séance du Jour (Aperçu) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>SÉANCES DU JOUR</Text>
        </View>
        
        {todayWorkouts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="calendar" size={24} color={theme.colors.textMuted} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>Aucune séance planifiée pour aujourd'hui.</Text>
            <TouchableOpacity onPress={() => router.push('/(coach)/calendar')} style={{ marginTop: 16 }}>
              <Text style={{ color: theme.colors.accent, fontWeight: 'bold' }}>Aller au calendrier</Text>
            </TouchableOpacity>
          </View>
        ) : (
          todayWorkouts.map((workout, index) => (
            <TouchableOpacity 
              key={workout.id || index}
              style={styles.sessionCard}
              activeOpacity={0.8}
              onPress={() => router.push('/(coach)/calendar')}
            >
              <View style={styles.sessionCardHeader}>
                <View style={[styles.sessionBadge, { backgroundColor: workout.type_seance === 'musculation' ? '#3B82F620' : '#F59E0B20' }]}>
                  <Text style={[styles.sessionBadgeText, { color: workout.type_seance === 'musculation' ? '#3B82F6' : '#F59E0B' }]}>
                    {workout.type_seance.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.sessionDuration}>
                  <Feather name="clock" size={12} color={theme.colors.textMuted} /> {
                    (() => {
                      const d = new Date(workout.date_prevue);
                      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                    })()
                  }
                </Text>
              </View>
              <Text style={styles.sessionCardTitle}>{workout.type_seance}</Text>
              {workout.description && (
                <Text style={styles.sessionCardDesc} numberOfLines={2}>{workout.description}</Text>
              )}
              <View style={styles.sessionCardFooter}>
                <Text style={styles.sessionCardAction}>Voir la séance</Text>
                <Feather name="chevron-right" size={16} color={theme.colors.accent} />
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <BroadcastModal 
        visible={broadcastVisible}
        onClose={() => setBroadcastVisible(false)}
      />
      <TeamHealthModal 
        visible={teamHealthVisible}
        onClose={() => setTeamHealthVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
    marginTop: 10,
  },
  content: {
    paddingHorizontal: 24,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 10,
    marginTop: 10,
  },
  statCard: {
    flex: 1,
    padding: 24,
    borderRadius: 20,
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 40,
    fontWeight: '900',
    color: theme.colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  sectionHeader: {
    marginTop: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  sessionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
  },
  sessionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionBadge: {
    backgroundColor: theme.colors.error + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sessionBadgeText: {
    color: theme.colors.error,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  sessionDuration: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  sessionCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  sessionCardDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  sessionCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 16,
  },
  sessionCardAction: {
    flex: 1,
    color: theme.colors.accent,
    fontWeight: '600',
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  }
});
