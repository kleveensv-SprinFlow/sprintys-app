import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, ActivityIndicator, View, Text } from 'react-native';
import { useCoachStore } from '../../../store/coach/coachStore';
import { AthleteCard } from './AthleteCard';
import { AthletePerformanceModal } from './AthletePerformanceModal';
import { theme } from '../../../core/theme';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ManagedAthlete } from '../types';

export const AthleteList: React.FC = React.memo(() => {
  const { athletes, isLoading, fetchAthletes } = useCoachStore();
  const [selectedAthlete, setSelectedAthlete] = useState<ManagedAthlete | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchAthletes();
  }, []);

  const handleOpenPerformance = (athlete: ManagedAthlete) => {
    setSelectedAthlete(athlete);
    setModalVisible(true);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  if (athletes.length === 0) {
    return (
      <EmptyState 
        title="Aucun athlète" 
        message="Votre liste d'athlètes est vide. Commencez par inviter vos sportifs pour planifier leurs séances." 
      />
    );
  }

  return (
    <>
      <FlatList
        data={athletes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AthleteCard athlete={item} onOpenPerformance={handleOpenPerformance} />
        )}
        contentContainerStyle={styles.list}
        ListHeaderComponent={() => (
          <Text style={styles.listHeader}>{athletes.length} ATHLÈTES ACTIFS</Text>
        )}
      />

      <AthletePerformanceModal
        visible={modalVisible}
        athleteId={selectedAthlete?.id || null}
        athleteName={selectedAthlete?.name || null}
        onClose={() => setModalVisible(false)}
      />
    </>
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

