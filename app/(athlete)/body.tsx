import React from 'react';
import { ScrollView, StyleSheet, View, Text, SafeAreaView } from 'react-native';
import { BodyMetricsForm } from '../../src/features/body/components/BodyMetricsForm';
import { WeightChart } from '../../src/features/body/components/WeightChart';
import { BodyHistoryList } from '../../src/features/body/components/BodyHistoryList';
import { theme } from '../../src/core/theme';
import { useAuthStore } from '../../src/store/authStore';
import { useBodyStore } from '../../src/store/bodyStore';

export default function BodyScreen() {
  const { user } = useAuthStore();
  const { loadMetrics } = useBodyStore();

  React.useEffect(() => {
    if (user) loadMetrics(user.id);
  }, [user]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.welcome}>ÉVOLUTION PHYSIQUE</Text>
          <Text style={styles.title}>Composition</Text>
        </View>

        <WeightChart />
        <BodyMetricsForm />
        <BodyHistoryList />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.xl,
  },
  header: {
    marginBottom: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
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
});
