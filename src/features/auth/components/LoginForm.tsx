import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Card } from '../../../shared/components/Card';
import { useAuthStore } from '../../../store/authStore';
import { useTheme } from '../../../core/theme';
import { useRouter } from 'expo-router';

export const LoginForm = () => {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    await login(email, password);
  };

  return (
    <Card variant="glass" style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Connexion</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Accédez à votre dashboard de performance</Text>
      
      <View style={styles.form}>
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
      </View>

      {error && <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>}

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
        <Text style={[styles.signupText, { color: theme.colors.textSecondary }]}>
          Pas encore de compte ? <Text style={[styles.signupTextBold, { color: theme.colors.accent }]}>S'inscrire</Text>
        </Text>
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 24, // Softer radius like the new design
    padding: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 32,
    textAlign: 'center',
  },
  form: {
    gap: 16,
    marginBottom: 24,
  },
  button: {
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  signupLink: {
    marginTop: 32,
    alignItems: 'center',
  },
  signupText: {
    fontSize: 15,
  },
  signupTextBold: {
    fontWeight: '700',
  },
});
