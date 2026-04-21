import React, { useEffect } from 'react';
import { FlatList, StyleSheet, ActivityIndicator, View, Text } from 'react-native';
import { useCoachStore } from '../../../store/coachStore';
import { AthleteCard } from './AthleteCard';
import { theme } from '../../../core/theme';

export const AthleteList: React.FC = React.memo(() => {
  const { athletes, isLoading, fetchAthletes } = useCoachStore();

  useEffect(() => {
    fetchAthletes();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <FlatList
      data={athletes}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <AthleteCard athlete={item} />}
      contentContainerStyle={styles.list}
      ListHeaderComponent={() => (
        <Text style={styles.listHeader}>{athletes.length} ATHLÈTES ACTIFS</Text>
      )}
    />
  );
});

const styles = StyleSheet.create({
  list: {
    paddingVertical: theme.spacing.lg,
  },
  listHeader: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: theme.typography.fontWeights.bold as any,
    letterSpacing: 1,
    marginBottom: theme.spacing.md,
  },
  center: {
    padding: theme.spacing.xxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
