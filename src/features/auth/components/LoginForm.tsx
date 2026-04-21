import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Card } from '../../../shared/components/Card';
import { useAuthStore } from '../../../store/authStore';
import { theme } from '../../../core/theme';
import { useRouter } from 'expo-router';

export const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    await login(email, password);
  };

  return (
    <Card variant="glass" style={styles.card}>
      <Text style={styles.title}>Connexion</Text>
      <Text style={styles.subtitle}>Accédez à votre dashboard de performance</Text>
      
      <Input
        label="Email"
        placeholder="votre@email.com"
        value={email}
        onChangeText={(val) => { setEmail(val); clearError(); }}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <Input
        label="Mot de passe"
        placeholder="••••••••"
        value={password}
        onChangeText={(val) => { setPassword(val); clearError(); }}
        secureTextEntry
      />

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Button
        title="Se connecter"
        onPress={handleLogin}
        loading={isLoading}
        style={styles.button}
      />

      <TouchableOpacity 
        onPress={() => router.push('/signup')}
        style={styles.signupLink}
      >
        <Text style={styles.signupText}>
          Pas encore de compte ? <Text style={styles.signupTextBold}>S'inscrire</Text>
        </Text>
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: theme.typography.fontWeights.bold as any,
    marginBottom: 4,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginBottom: theme.spacing.xl,
  },
  button: {
    marginTop: theme.spacing.md,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  signupLink: {
    marginTop: theme.spacing.xl,
    alignItems: 'center',
  },
  signupText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  signupTextBold: {
    color: theme.colors.accent,
    fontWeight: theme.typography.fontWeights.bold as any,
  },
});
