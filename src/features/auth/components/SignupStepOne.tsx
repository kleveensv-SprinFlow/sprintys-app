import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { theme } from '../../../core/theme';

interface Props {
  data: any;
  updateData: (val: any) => void;
  onNext: () => void;
}

export const SignupStepOne: React.FC<Props> = ({ data, updateData, onNext }) => {
  const isValid = data.email && data.password && data.password.length >= 6;

  return (
    <View>
      <Text style={styles.stepTitle}>Identifiants</Text>
      <Text style={styles.stepSubtitle}>Étape 1 sur 2</Text>

      <Input
        label="Email"
        placeholder="votre@email.com"
        value={data.email}
        onChangeText={(val) => updateData({ email: val })}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Input
        label="Mot de passe"
        placeholder="6 caractères minimum"
        value={data.password}
        onChangeText={(val) => updateData({ password: val })}
        secureTextEntry
      />

      <Button
        title="Continuer"
        onPress={onNext}
        disabled={!isValid}
        style={styles.button}
      />
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
});
