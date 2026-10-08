import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../src/core/theme';
import { useAuthStore } from '../../src/store/authStore';
import { useCoachStore } from '../../src/store/coach/coachStore';
import { supabase } from '../../src/services/supabase';
import { workoutService } from '../../src/services/workoutService';
import { WeatherCard } from '../../src/shared/components/WeatherCard';
import { BroadcastModal } from '../../src/features/coach/components/BroadcastModal';
import { SprintyLogo } from '../../src/shared/components/SprintyLogo';
import { TeamHealthModal } from '../../src/features/coach/components/TeamHealthModal';
import { HeaderProfileAvatar } from '../../src/shared/components/HeaderProfileAvatar';

export default function CoachDashboardScreen() {
  const todayStr = (() => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  })();
  const { user } = useAuthStore();
  const router = useRouter();
  const { teams, teamMembers, pendingMembers, teamCheckIns, fetchTeamCheckIns, fetchAllPendingRequests } = useCoachStore();
  
  const [broadcastVisible, setBroadcastVisible] = useState(false);
  const [teamHealthVisible, setTeamHealthVisible] = useState(false);
  const [todayWorkouts, setTodayWorkouts] = useState<any[]>([]);

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

        const data = await workoutService.fetchWorkoutsForDate(user!.id, start, 'coach', teams[0].id);
        
        if (data) setTodayWorkouts(data);
      })();
    }
  }, [teams, teamMembers]);

  // Moyenne de santé du groupe
  const getGroupHealth = () => {
    if (teamCheckIns.length === 0) return null;
    let sum = 0;
    let count = 0;
    teamCheckIns.forEach(ci => {
      if (ci.health_score != null) {
        sum += ci.health_score;
        count++;
      }
    });
    return count > 0 ? sum / count : null;
  };

  const avgHealth = getGroupHealth();
  const avgHealthStr = avgHealth ? `${Math.round(avgHealth)}%` : 'N/A';
  const healthColor = avgHealth === null ? theme.colors.textMuted : avgHealth >= 70 ? theme.colors.success : avgHealth >= 40 ? '#F59E0B' : theme.colors.error;

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

        {/* Right: Profil Avatar (Photo or Instagram-style placeholder) */}
        <HeaderProfileAvatar
          avatarUrl={user?.avatarUrl}
          onPress={() => router.push('/(coach)/profile')}
          size={44}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.welcomeText}>Bonjour, Coach {user?.firstName || user?.name?.split(' ')[0]}</Text>

        {/* Santé du Groupe (Carte Épurée Apple Fitness) */}
        <View style={styles.statsRow}>
          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: theme.colors.surface, ...theme.shadows.soft }]}
            activeOpacity={0.9}
            onPress={() => setTeamHealthVisible(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.microStatusDot, { backgroundColor: healthColor }]} />
                <Text style={styles.statLabel}>SANTÉ DU GROUPE</Text>
              </View>
              <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{avgHealthStr}</Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 4, fontWeight: '500' }}>
              {avgHealth !== null ? (avgHealth >= 70 ? 'Excellente forme globale' : avgHealth >= 40 ? 'Fatigue modérée - Vigilance' : 'Récupération critique requise') : 'En attente de données'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Météo Coach */}
        <WeatherCard />

        {/* Séance du Jour (Aperçu) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>SÉANCES DU JOUR</Text>
        </View>
        
        {todayWorkouts.length === 0 ? (
          <View style={[styles.emptyCard, { ...theme.shadows.soft }]}>
            <Feather name="calendar" size={24} color={theme.colors.textMuted} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>Aucune séance planifiée pour aujourd'hui.</Text>
            <TouchableOpacity onPress={() => router.push('/(coach)/day/' + todayStr)} style={{ marginTop: 16 }}>
              <Text style={{ color: (theme.colors as any).sprintyBlue || theme.colors.accent, fontWeight: '700' }}>Aller au calendrier</Text>
            </TouchableOpacity>
          </View>
        ) : (
          todayWorkouts.map((workout, index) => (
            <TouchableOpacity 
              key={workout.id || index}
              style={[styles.sessionCard, { ...theme.shadows.soft }]}
              activeOpacity={0.8}
              onPress={() => router.push('/(coach)/day/' + (workout.date_prevue ? workout.date_prevue.split('T')[0] : todayStr))}
            >
              <View style={styles.sessionCardHeader}>
                <View style={[styles.sessionBadge, { backgroundColor: workout.type_seance === 'musculation' ? 'rgba(0, 105, 232, 0.08)' : 'rgba(245, 158, 11, 0.1)' }]}>
                  <Text style={[styles.sessionBadgeText, { color: workout.type_seance === 'musculation' ? ((theme.colors as any).sprintyBlue || '#0069E8') : '#F59E0B' }]}>
                    {(workout.type_seance || 'Séance').toUpperCase()}
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
                <Feather name="chevron-right" size={16} color={(theme.colors as any).sprintyBlue || theme.colors.accent} />
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
    paddingTop: 8,
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
    padding: 22,
    borderRadius: 22,
    alignItems: 'flex-start',
  },
  microStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statValue: {
    fontSize: 40,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 2,
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  sectionHeader: {
    marginTop: 12,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  sessionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
  },
  sessionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sessionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sessionDuration: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  sessionCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
    textTransform: 'capitalize',
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
    paddingTop: 12,
  },
  sessionCardAction: {
    flex: 1,
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    padding: 28,
    borderRadius: 22,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  }
});




