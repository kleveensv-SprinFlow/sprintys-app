import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../../src/core/theme';
import { useAuthStore } from '../../src/store/authStore';
import { ProfileAvatar } from '../../src/shared/components/ProfileAvatar';
import { Button } from '../../src/shared/components/Button';
import { GlassView } from '../../src/shared/components/GlassView';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  // Mocking detailed info as requested (no DB change)
  const [firstName, ...lastNameParts] = (user?.name || 'Coach SprintFlow').split(' ');
  const lastName = lastNameParts.join(' ');
  const specialty = 'COACH SPRINT ÉLITE';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backBtn}
        >
          <Text style={styles.backBtnText}>RETOUR</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PROFIL</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            <ProfileAvatar size={120} />
            <View style={styles.onlineBadge} />
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionLabel}>INFORMATIONS PERSONNELLES</Text>
          <GlassView style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>PRÉNOM</Text>
              <Text style={styles.infoValue}>{firstName}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>NOM</Text>
              <Text style={styles.infoValue}>{lastName || 'FLOW'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>SPÉCIALITÉ</Text>
              <Text style={styles.infoValue}>{specialty}</Text>
            </View>
          </GlassView>
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.sectionLabel}>PERFORMANCES</Text>
          <View style={styles.statsGrid}>
            <GlassView style={styles.statCard}>
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>ATHLÈTES</Text>
            </GlassView>
            <GlassView style={styles.statCard}>
              <Text style={styles.statNumber}>148</Text>
              <Text style={styles.statLabel}>SÉANCES</Text>
            </GlassView>
          </View>
        </View>

        <View style={styles.logoutSection}>
          <Button 
            title="DÉCONNEXION" 
            onPress={handleLogout}
            variant="outline"
            style={styles.logoutBtn}
            textStyle={styles.logoutText}
          />
          <Text style={styles.version}>SPRINTFLOW V3.0.0 ELITE EDITION</Text>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: theme.typography.fontWeights.bold as any,
    letterSpacing: 2,
    color: theme.colors.accent,
  },
  backBtn: {
    paddingVertical: 8,
  },
  backBtnText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.fontWeights.medium as any,
    letterSpacing: 1,
  },
  scrollContent: {
    padding: theme.spacing.xl,
    paddingBottom: 100,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxxl,
  },
  avatarWrapper: {
    position: 'relative',
    padding: 4,
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    borderRadius: 70,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CD964',
    borderWidth: 3,
    borderColor: theme.colors.background,
  },
  infoSection: {
    marginBottom: theme.spacing.xxxl,
  },
  sectionLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: theme.typography.fontWeights.bold as any,
    letterSpacing: 1.5,
    marginBottom: theme.spacing.lg,
    marginLeft: 4,
  },
  infoCard: {
    padding: theme.spacing.xl,
    borderRadius: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: theme.typography.fontWeights.medium as any,
  },
  infoValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: theme.typography.fontWeights.bold as any,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: theme.spacing.md,
  },
  statsSection: {
    marginBottom: theme.spacing.xxxl,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderRadius: 24,
  },
  statNumber: {
    color: theme.colors.accent,
    fontSize: 28,
    fontWeight: theme.typography.fontWeights.bold as any,
    marginBottom: 4,
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 8,
    fontWeight: theme.typography.fontWeights.bold as any,
    letterSpacing: 1,
  },
  logoutSection: {
    marginTop: theme.spacing.xl,
    alignItems: 'center',
  },
  logoutBtn: {
    width: '100%',
    borderColor: 'rgba(255, 69, 58, 0.3)',
    borderRadius: 16,
    height: 56,
  },
  logoutText: {
    color: theme.colors.error,
    fontWeight: theme.typography.fontWeights.bold as any,
    letterSpacing: 1,
  },
  version: {
    color: theme.colors.textMuted,
    fontSize: 9,
    marginTop: theme.spacing.xl,
    letterSpacing: 2,
    opacity: 0.5,
  },
});
