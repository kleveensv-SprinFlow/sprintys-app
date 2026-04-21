import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Link } from 'expo-router';
import { colors } from '../../src/shared/theme/colors';
import { Card } from '../../src/shared/components/ui/Card';
import { Toast } from '../../src/shared/components/ui/Toast';
import { SignupStepOne } from '../../src/features/auth/components/SignupStepOne';
import { SignupStepTwo } from '../../src/features/auth/components/SignupStepTwo';
import { supabase } from '../../src/services/supabase';
import { translateAuthError } from '../../src/features/auth/utils/authErrors';
import { Text } from 'react-native';

export default function SignupScreen() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async () => {
    setLoading(true);
    setError(null);
    
    // We pass the name in User Metadata
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name,
        }
      }
    });

    if (error) {
      setError(translateAuthError(error));
      setLoading(false);
    } else {
      // Automatic login usually happens after signup unless email confirmation is required.
      // The session will update in useAuthStore automatically.
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {error && <Toast message={error} type="error" onHide={() => setError(null)} />}
      
      <View style={styles.content}>
        <Card style={styles.card}>
          {step === 1 ? (
            <SignupStepOne 
              email={email} 
              setEmail={setEmail} 
              password={password} 
              setPassword={setPassword} 
              onNext={() => setStep(2)} 
            />
          ) : (
            <SignupStepTwo 
              name={name} 
              setName={setName} 
              onBack={() => setStep(1)} 
              onSubmit={handleSignup} 
              loading={loading}
            />
          )}

          {step === 1 && (
            <View style={styles.footer}>
              <Text style={styles.footerText}>Déjà un compte ? </Text>
              <Link href="/(auth)/login" asChild>
                <Text style={styles.link}>Se connecter</Text>
              </Link>
            </View>
          )}
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
  card: {
    padding: 24,
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
