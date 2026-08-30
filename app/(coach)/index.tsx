import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../src/core/theme';
import { useAuthStore } from '../../src/store/authStore';
import { ProfileAvatar } from '../../src/shared/components/ProfileAvatar';
import { GlassView } from '../../src/shared/components/GlassView';

export default function CoachDashboardScreen() {
  const { user } = useAuthStore();
  const router = useRouter();

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
          <GlassView style={styles.statCard}>
            <Feather name="activity" size={24} color={theme.colors.success} style={{ marginBottom: 8 }} />
            <Text style={styles.statValue}>85%</Text>
            <Text style={styles.statLabel}>Forme Globale</Text>
          </GlassView>
          <View style={{ width: 16 }} />
          <GlassView style={styles.statCard}>
            <Feather name="users" size={24} color={theme.colors.accent} style={{ marginBottom: 8 }} />
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Athlètes actifs</Text>
          </GlassView>
        </View>

        {/* Section Alertes / Attention requise */}
        <Text style={styles.sectionTitle}>ATTENTION REQUISE</Text>
        <GlassView style={styles.alertCard}>
          <View style={styles.alertIcon}>
            <Feather name="alert-triangle" size={20} color={theme.colors.error} />
          </View>
          <View style={styles.alertTextContainer}>
            <Text style={styles.alertTitle}>2 athlètes fatigués</Text>
            <Text style={styles.alertDesc}>Leur check-in matinal indique un niveau d'énergie faible.</Text>
          </View>
          <Feather name="chevron-right" size={20} color={theme.colors.textMuted} />
        </GlassView>
        
        <GlassView style={[styles.alertCard, { borderColor: theme.colors.warning + '50' }]}>
          <View style={[styles.alertIcon, { backgroundColor: theme.colors.warning + '20' }]}>
            <Feather name="info" size={20} color={theme.colors.warning} />
          </View>
          <View style={styles.alertTextContainer}>
            <Text style={styles.alertTitle}>3 demandes en attente</Text>
            <Text style={styles.alertDesc}>De nouveaux athlètes veulent rejoindre ton groupe.</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(coach)/group')}>
            <Feather name="chevron-right" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </GlassView>

        {/* Actions Rapides */}
        <Text style={styles.sectionTitle}>ACTIONS RAPIDES</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(coach)/calendar')}>
            <View style={styles.actionIconWrapper}>
              <Feather name="plus-circle" size={24} color={theme.colors.accent} />
            </View>
            <Text style={styles.actionText}>Créer une{'\n'}séance</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(coach)/group')}>
            <View style={[styles.actionIconWrapper, { backgroundColor: theme.colors.success + '20' }]}>
              <Feather name="users" size={24} color={theme.colors.success} />
            </View>
            <Text style={styles.actionText}>Gérer le{'\n'}groupe</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(coach)/chat')}>
            <View style={[styles.actionIconWrapper, { backgroundColor: theme.colors.primary + '20' }]}>
              <Feather name="message-square" size={24} color={theme.colors.primary} />
            </View>
            <Text style={styles.actionText}>Message{'\n'}global</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
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
    marginBottom: 30,
    marginTop: 10,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 20,
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 16,
    marginTop: 10,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.error + '50',
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.error + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  alertTextContainer: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  alertDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    paddingVertical: 20,
    paddingHorizontal: 10,
    borderRadius: 20,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
