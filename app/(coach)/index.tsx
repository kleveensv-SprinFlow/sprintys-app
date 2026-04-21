import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { theme } from '../../src/core/theme';
import { Card } from '../../src/shared/components/Card';
import { Button } from '../../src/shared/components/Button';
import { useAuthStore } from '../../src/store/authStore';

export default function CoachDashboard() {
  const { logout, user } = useAuthStore();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>DASHBOARD COACH</Text>
        <Text style={styles.title}>Bienvenue, {user?.name}</Text>
      </View>

      <View style={styles.content}>
        <Card variant="glass" style={styles.card}>
          <Text style={styles.cardTitle}>Vue d'ensemble</Text>
          <Text style={styles.cardText}>
            Vous n'avez pas encore d'athlètes sous votre supervision.
          </Text>
          <Button
            title="INVITER UN ATHLÈTE"
            onPress={() => {}}
            variant="outline"
            style={styles.btn}
          />
        </Card>
      </View>

      <View style={styles.footer}>
        <Button
          title="DÉCONNEXION"
          onPress={logout}
          variant="ghost"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.xl,
    paddingTop: theme.spacing.xxl,
  },
  welcome: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: theme.typography.fontWeights.bold as any,
    letterSpacing: 2,
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: theme.typography.fontWeights.bold as any,
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: theme.spacing.xl,
  },
  card: {
    padding: theme.spacing.lg,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: theme.typography.fontWeights.bold as any,
    marginBottom: 8,
  },
  cardText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginBottom: theme.spacing.lg,
  },
  btn: {
    marginTop: theme.spacing.sm,
  },
  footer: {
    padding: theme.spacing.xl,
  },
});
