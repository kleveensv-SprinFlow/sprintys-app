import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../src/core/theme';
import { useAuthStore } from '../../src/store/authStore';
import { useCoachStore } from '../../src/store/coach/coachStore';
import { ProfileAvatar } from '../../src/shared/components/ProfileAvatar';
import { CoachWeatherCard } from '../../src/features/coach/components/CoachWeatherCard';
import { BroadcastModal } from '../../src/features/coach/components/BroadcastModal';

export default function CoachDashboardScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { teams, teamMembers, pendingMembers, teamCheckIns, fetchTeamCheckIns } = useCoachStore();
  
  const [broadcastVisible, setBroadcastVisible] = useState(false);

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.welcome}>ESPACE COACH</Text>
          <Text style={styles.title}>Salut, {user?.firstName || user?.name?.split(' ')[0]}</Text>
        </View>
        <ProfileAvatar onPress={() => router.push('/(coach)/profile')} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Résumé express */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}>
            <Feather name="users" size={24} color={theme.colors.accent} style={{ marginBottom: 8 }} />
            <Text style={styles.statValue}>{teamMembers.length}</Text>
            <Text style={styles.statLabel}>Athlètes actifs</Text>
          </View>
          <View style={{ width: 16 }} />
          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: pendingMembers.length > 0 ? theme.colors.warning : theme.colors.border, borderWidth: 1 }]}
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

      {/* FAB - Bouton d'annonce Mégaphone */}
      <TouchableOpacity 
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => setBroadcastVisible(true)}
      >
        <Feather name="mic" size={24} color="#FFF" />
      </TouchableOpacity>

      <BroadcastModal 
        visible={broadcastVisible}
        onClose={() => setBroadcastVisible(false)}
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
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcome: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 4,
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
  },
  fab: {
    position: 'absolute',
    bottom: 90, // au-dessus de la tabbar
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  }
});
