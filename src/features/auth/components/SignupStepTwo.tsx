import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { theme } from '../../../core/theme';

interface Props {
  data: any;
  updateData: (val: any) => void;
  onBack: () => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export const SignupStepTwo: React.FC<Props> = ({ data, updateData, onBack, onSubmit, isLoading }) => {
  const isValid = data.name && data.goal;

  return (
    <View>
      <Text style={styles.stepTitle}>Profil Athlète</Text>
      <Text style={styles.stepSubtitle}>Étape 2 sur 2</Text>

      <Input
        label="Nom complet"
        placeholder="Prénom Nom"
        value={data.name}
        onChangeText={(val) => updateData({ name: val })}
      />

      <Input
        label="Objectif principal"
        placeholder="ex: Marathon, Sprint 100m, Perte de gras..."
        value={data.goal}
        onChangeText={(val) => updateData({ goal: val })}
      />

      <Button
        title="Créer mon compte"
        onPress={onSubmit}
        loading={isLoading}
        disabled={!isValid}
        style={styles.button}
      />

      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>Retour</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  stepTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: theme.typography.fontWeights.bold as any,
    marginBottom: 2,
  },
  stepSubtitle: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: theme.typography.fontWeights.bold as any,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.xl,
  },
  button: {
    marginTop: theme.spacing.md,
  },
  backButton: {
    marginTop: theme.spacing.lg,
    alignItems: 'center',
  },
  backText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
});
