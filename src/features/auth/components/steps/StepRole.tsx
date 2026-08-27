import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../../core/theme';
import { Button } from '../../../../shared/components/Button';

export const StepRole = ({ data, updateData, onNext }: any) => {
  const theme = useTheme();

  const RoleCard = ({ role, title, desc, emoji }: any) => {
    const isSelected = data.role === role;
    return (
      <TouchableOpacity
        style={[
          styles.roleCard,
          {
            backgroundColor: isSelected ? theme.colors.accentMuted : theme.colors.background,
            borderColor: isSelected ? theme.colors.accent : theme.colors.border
          }
        ]}
        onPress={() => updateData({ role })}
      >
        <Text style={styles.emoji}>{emoji}</Text>
        <View style={styles.roleTextContainer}>
          <Text style={[styles.roleTitle, { color: theme.colors.text }]}>{title}</Text>
          <Text style={[styles.roleDesc, { color: theme.colors.textSecondary }]}>{desc}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Comment allez-vous utiliser BioAthlete ?</Text>

      <View style={styles.cardsContainer}>
        <RoleCard
          role="athlete"
          title="Athlète"
          desc="Suivez vos entraînements et performances."
          emoji="🏃"
        />
        <RoleCard
          role="coach"
          title="Coach"
          desc="Suivez et accompagnez vos athlètes."
          emoji="🧑‍🏫"
        />
      </View>

      <Button title="Continuer" onPress={onNext} style={styles.button} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 32,
    textAlign: 'center',
  },
  cardsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
  },
  emoji: {
    fontSize: 32,
    marginRight: 16,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  roleDesc: {
    fontSize: 14,
  },
  button: {
    marginTop: 'auto',
  }
});
