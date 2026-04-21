import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../../src/core/theme';
import { useAuthStore } from '../../src/store/authStore';
import { ProfileAvatar } from '../../src/shared/components/ProfileAvatar';
import { Button } from '../../src/shared/components/Button';
import { Card } from '../../src/shared/components/Card';
import { GlassView } from '../../src/shared/components/GlassView';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Button 
          title="RETOUR" 
          onPress={() => router.back()} 
          variant="ghost" 
          style={styles.backBtn}
          textStyle={styles.backBtnText}
        />
        <Text style={styles.headerTitle}>MON PROFIL</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileInfo}>
          <ProfileAvatar size={100} />
          <Text style={styles.name}>{user?.name || 'Coach SprintFlow'}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>COACH SPRINT ÉLITE</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <GlassView style={styles.statCard}>
            <Text style={styles.statLabel}>ATHLÈTES</Text>
            <Text style={styles.statValue}>12</Text>
          </GlassView>
          <GlassView style={styles.statCard}>
            <Text style={styles.statLabel}>SÉANCES</Text>
            <Text style={styles.statValue}>148</Text>
          </GlassView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PARAMÈTRES</Text>
          <Card style={styles.settingItem}>
            <Text style={styles.settingLabel}>Notifications</Text>
            <Text style={styles.settingValue}>Activées</Text>
          </Card>
          <Card style={styles.settingItem}>
            <Text style={styles.settingLabel}>Mode Élite</Text>
            <Text style={styles.settingValue}>Activé</Text>
          </Card>
        </View>

        <View style={styles.footer}>
          <Button 
            title="DÉCONNEXION" 
            onPress={handleLogout}
            variant="outline"
            style={styles.logoutBtn}
            textStyle={styles.logoutText}
          />
          <Text style={styles.version}>VERSION 3.0.0 ELITE</Text>
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
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: theme.typography.fontWeights.bold as any,
    letterSpacing: 2,
  },
  backBtn: {
    paddingHorizontal: 0,
  },
  backBtnText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  scrollContent: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxxl,
  },
  name: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: theme.typography.fontWeights.bold as any,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
  },
  badge: {
    backgroundColor: theme.colors.accentMuted,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  badgeText: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: theme.typography.fontWeights.bold as any,
    letterSpacing: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xxxl,
  },
  statCard: {
    flex: 1,
    padding: theme.spacing.lg,
    alignItems: 'center',
    minWidth: 140,
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: theme.typography.fontWeights.bold as any,
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    color: theme.colors.accent,
    fontSize: 24,
    fontWeight: theme.typography.fontWeights.bold as any,
  },
  section: {
    width: '100%',
    marginBottom: theme.spacing.xxxl,
  },
  sectionTitle: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: theme.typography.fontWeights.bold as any,
    letterSpacing: 1.5,
    marginBottom: theme.spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  settingLabel: {
    color: theme.colors.text,
    fontSize: 14,
  },
  settingValue: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: theme.typography.fontWeights.medium as any,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  logoutBtn: {
    width: '100%',
    borderColor: 'rgba(255, 69, 58, 0.3)',
  },
  logoutText: {
    color: theme.colors.error,
  },
  version: {
    color: theme.colors.textMuted,
    fontSize: 10,
    marginTop: theme.spacing.xl,
    letterSpacing: 1,
  },
});
