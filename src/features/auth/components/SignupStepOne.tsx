import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { colors } from '../../../shared/theme/colors';

interface Props {
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  onNext: () => void;
}

export const SignupStepOne: React.FC<Props> = ({ email, setEmail, password, setPassword, onNext }) => {
  const isValid = email.includes('@') && password.length >= 6;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Créer un compte</Text>
      <Text style={styles.subtitle}>Commençons par tes identifiants (1/2)</Text>
      
      <Input 
        label="Email" 
        placeholder="ton@email.com" 
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <Input 
        label="Mot de passe" 
        placeholder="Au moins 6 caractères" 
        value={password}
        onChangeText={setPassword}
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
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 24,
  },
  button: {
    marginTop: 16,
  },
});
