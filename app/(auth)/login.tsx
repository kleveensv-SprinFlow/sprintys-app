import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { colors } from '../../src/shared/theme/colors';
import { typography } from '../../src/shared/theme/typography';
import { Input } from '../../src/shared/components/ui/Input';
import { Button } from '../../src/shared/components/ui/Button';
import { Card } from '../../src/shared/components/ui/Card';
import { supabase } from '../../src/services/supabase';
import { translateAuthError } from '../../src/features/auth/utils/authErrors';
import { Toast } from '../../src/shared/components/ui/Toast';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setError(translateAuthError(error));
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {error && <Toast message={error} type="error" onHide={() => setError(null)} />}
      
      <View style={styles.content}>
        <Text style={styles.title}>Sprintflow</Text>
        <Text style={styles.subtitle}>Heureux de te revoir !</Text>
        
        <Card style={styles.card}>
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
            placeholder="••••••••" 
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Button 
            title="Se connecter" 
            onPress={handleLogin} 
            loading={loading}
            style={styles.button}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Pas encore de compte ? </Text>
            <Link href="/(auth)/signup" asChild>
              <Text style={styles.link}>S'inscrire</Text>
            </Link>
          </View>
        </Card>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: typography.sizes.xxxl,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 32,
    marginTop: 8,
  },
  card: {
    padding: 24,
  },
  button: {
    marginTop: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: colors.textMuted,
  },
  link: {
    color: colors.primary,
    fontWeight: 'bold',
  },
});
