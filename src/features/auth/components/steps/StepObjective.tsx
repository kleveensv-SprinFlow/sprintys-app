import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../../core/theme';
import { Button } from '../../../../shared/components/Button';

const OBJECTIVES = [
  { id: 'perf', emoji: '🏆', text: 'Améliorer mes performances' },
  { id: 'comp', emoji: '⚡', text: 'Préparer mes compétitions' },
  { id: 'prog', emoji: '📈', text: 'Suivre ma progression' },
  { id: 'goal', emoji: '🎯', text: 'Atteindre un objectif précis' }
];

export const StepObjective = ({ data, updateData, onNext, onBack }: any) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Quel est votre objectif principal ?</Text>

      <View style={styles.list}>
        {OBJECTIVES.map(obj => {
          const isSelected = data.objective === obj.text;
          return (
            <TouchableOpacity
              key={obj.id}
              style={[
                styles.option,
                {
                  backgroundColor: isSelected ? theme.colors.accentMuted : theme.colors.background,
                  borderColor: isSelected ? theme.colors.accent : theme.colors.border
                }
              ]}
              onPress={() => updateData({ objective: obj.text })}
            >
              <Text style={styles.emoji}>{obj.emoji}</Text>
              <Text style={[styles.optionText, { color: theme.colors.text }]}>{obj.text}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Button title="Retour" variant="outline" onPress={onBack} style={styles.halfBtn} />
        <Button title="Continuer" onPress={onNext} disabled={!data.objective} style={styles.halfBtn} />
      </View>
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
  list: {
    gap: 12,
    marginBottom: 32,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
  },
  emoji: {
    fontSize: 24,
    marginRight: 16,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 'auto',
  },
  halfBtn: {
    flex: 1,
  }
});
