import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { theme } from '../../../core/theme';
import { UserRole } from '../../../store/authStore';

interface Props {
  data: any;
  updateData: (val: any) => void;
  onBack: () => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export const SignupStepTwo: React.FC<Props> = ({ data, updateData, onBack, onSubmit, isLoading }) => {
  const isValid = data.name && data.role;

  const roles: { label: string; value: UserRole }[] = [
    { label: 'ATHLÈTE', value: 'athlete' },
    { label: 'COACH', value: 'coach' },
  ];

  return (
    <View>
      <Text style={styles.stepTitle}>Votre Profil</Text>
      <Text style={styles.stepSubtitle}>Étape 2 sur 2</Text>

      <Input
        label="Nom complet"
        placeholder="Prénom Nom"
        value={data.name}
        onChangeText={(val) => updateData({ name: val })}
      />

      <Text style={styles.label}>Je suis un :</Text>
      <View style={styles.roleContainer}>
        {roles.map((r) => (
          <TouchableOpacity
            key={r.value}
            onPress={() => updateData({ role: r.value })}
            style={[
              styles.roleButton,
              data.role === r.value && styles.roleButtonActive
            ]}
          >
            <Text style={[
              styles.roleText,
              data.role === r.value && styles.roleTextActive
            ]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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
  label: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginBottom: theme.spacing.sm,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  roleButton: {
    flex: 1,
    height: 48,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  roleButtonActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentMuted,
  },
  roleText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: theme.typography.fontWeights.bold as any,
    letterSpacing: 1,
  },
  roleTextActive: {
    color: theme.colors.accent,
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
