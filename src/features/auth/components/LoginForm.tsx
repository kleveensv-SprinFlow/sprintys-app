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
    try {
      await login(email, password);
    } catch (err) {
      // L'erreur est déjà gérée par le store
    }
  };

  return (
    <Card variant="glass" style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }] as any}>
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

        <View style={styles.passwordContainer}>
          <Input
            label="Mot de passe"
            placeholder="••••••••"
            value={password}
            onChangeText={(val) => { setPassword(val); clearError(); }}
            secureTextEntry
          />
          <TouchableOpacity style={styles.forgotPasswordLink}>
            <Text style={[styles.forgotPasswordText, { color: theme.colors.accent }]}>Mot de passe oublié ?</Text>
          </TouchableOpacity>
        </View>
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
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  form: {
    gap: 12,
    marginBottom: 20,
  },
  passwordContainer: {
    // Allows positioning the forgot password link nicely
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '500',
  },
  button: {
    marginTop: 4,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  signupLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  signupText: {
    fontSize: 14,
  },
  signupTextBold: {
    fontWeight: '700',
  },
});
