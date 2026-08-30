import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../src/core/theme';
import { useAuthStore } from '../../src/store/authStore';
import { useCoachStore } from '../../src/store/coach/coachStore';
import { CoachWeatherCard } from '../../src/features/coach/components/CoachWeatherCard';
import { BroadcastModal } from '../../src/features/coach/components/BroadcastModal';
import { SprintyLogo } from '../../src/shared/components/SprintyLogo';
import { TeamHealthModal } from '../../src/features/coach/components/TeamHealthModal';

export default function CoachDashboardScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { teams, teamMembers, pendingMembers, teamCheckIns, fetchTeamCheckIns } = useCoachStore();
  
  const [broadcastVisible, setBroadcastVisible] = useState(false);
  const [teamHealthVisible, setTeamHealthVisible] = useState(false);

  useEffect(() => {
    // Fetch les check-ins d'aujourd'hui pour l'équipe active
    if (teams.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      fetchTeamCheckIns(teams[0].id, today);
    }
  }, [teams, teamMembers]);

  // Calcul du radar de santé
  const athletesWithCheckIn = teamCheckIns.map(ci => ci.athlete_id);
  const athletesWithoutCheckIn = teamMembers.filter(m => !athletesWithCheckIn.includes(m.user_id));
  const alerts = teamCheckIns.filter(ci => ci.energy <= 2 || ci.pain_level >= 3);

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

        {/* Résumé express */}
        <View style={styles.statsRow}>
          <TouchableOpacity 
            style={[styles.statCard, { flex: 2, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}
            activeOpacity={0.8}
            onPress={() => setTeamHealthVisible(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 8 }}>
              <Feather name="activity" size={24} color={healthColor} />
              <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
            </View>
            <Text style={[styles.statValue, { color: healthColor }]}>{avgHealthStr}</Text>
            <Text style={styles.statLabel}>Santé du groupe</Text>
          </TouchableOpacity>
          
          <View style={{ width: 16 }} />
          
          <TouchableOpacity 
            style={[styles.statCard, { flex: 1, backgroundColor: theme.colors.surface, borderColor: pendingMembers.length > 0 ? theme.colors.warning : theme.colors.border, borderWidth: 1 }]}
            onPress={() => router.push('/(coach)/group')}
          >
            <Feather name="bell" size={24} color={pendingMembers.length > 0 ? theme.colors.warning : theme.colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={[styles.statValue, { color: pendingMembers.length > 0 ? theme.colors.warning : theme.colors.text }]}>
              {pendingMembers.length}
            </Text>
            <Text style={styles.statLabel}>En attente</Text>
          </TouchableOpacity>
        </View>

        {/* Météo Coach */}
        <CoachWeatherCard />

        {/* Séance du Jour (Aperçu) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>SÉANCE DU JOUR</Text>
        </View>
        <TouchableOpacity 
          style={styles.sessionCard}
          activeOpacity={0.8}
          onPress={() => router.push('/(coach)/calendar')}
        >
          <View style={styles.sessionCardHeader}>
            <View style={styles.sessionBadge}>
              <Text style={styles.sessionBadgeText}>VITESSE MAX</Text>
            </View>
            <Text style={styles.sessionDuration}>
              <Feather name="clock" size={12} color={theme.colors.textMuted} /> 1h30
            </Text>
          </View>
          <Text style={styles.sessionCardTitle}>Départ Block & Puissance</Text>
          <Text style={styles.sessionCardDesc}>Échauffement 30', Gammes, 4x30m, 3x60m intensité max. Récup totale.</Text>
          <View style={styles.sessionCardFooter}>
            <Text style={styles.sessionCardAction}>Modifier la séance</Text>
            <Feather name="chevron-right" size={16} color={theme.colors.accent} />
          </View>
        </TouchableOpacity>

        {/* Radar de Santé */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>RADAR DE SANTÉ</Text>
        </View>

        {teamMembers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Ajoute des athlètes pour voir leur état de forme.</Text>
          </View>
        ) : (
          <View style={styles.radarContainer}>
            {alerts.length > 0 && (
              <View style={[styles.radarCard, { borderColor: theme.colors.error + '50' }]}>
                <View style={[styles.radarIcon, { backgroundColor: theme.colors.error + '20' }]}>
                  <Feather name="alert-triangle" size={20} color={theme.colors.error} />
                </View>
                <View style={styles.radarTextContainer}>
                  <Text style={styles.radarTitle}>{alerts.length} athlète(s) en alerte</Text>
                  <Text style={styles.radarDesc}>Niveau d'énergie faible ou douleur signalée aujourd'hui.</Text>
                </View>
              </View>
            )}

            {athletesWithoutCheckIn.length > 0 && (
              <View style={[styles.radarCard, { borderColor: theme.colors.border }]}>
                <View style={[styles.radarIcon, { backgroundColor: theme.colors.surfaceLight }]}>
                  <Feather name="clock" size={20} color={theme.colors.textSecondary} />
                </View>
                <View style={styles.radarTextContainer}>
                  <Text style={styles.radarTitle}>{athletesWithoutCheckIn.length} manquant(s)</Text>
                  <Text style={styles.radarDesc}>N'ont pas encore fait leur check-in ce matin.</Text>
                </View>
              </View>
            )}

            {alerts.length === 0 && athletesWithoutCheckIn.length === 0 && (
              <View style={[styles.radarCard, { borderColor: theme.colors.success + '50' }]}>
                <View style={[styles.radarIcon, { backgroundColor: theme.colors.success + '20' }]}>
                  <Feather name="check" size={20} color={theme.colors.success} />
                </View>
                <View style={styles.radarTextContainer}>
                  <Text style={styles.radarTitle}>Équipe en pleine forme</Text>
                  <Text style={styles.radarDesc}>Tous les athlètes ont fait leur check-in et vont bien.</Text>
                </View>
              </View>
            )}
          </View>
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
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: 'bold',
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
    padding: 20,
    borderRadius: 20,
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
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
  },
  radarContainer: {
    gap: 12,
  },
  radarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
  },
  radarIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  radarTextContainer: {
    flex: 1,
  },
  radarTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  radarDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  }
});
