import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Card } from '../../../shared/components/Card';
import { SignupStepOne } from './SignupStepOne';
import { SignupStepTwo } from './SignupStepTwo';
import { useAuthStore } from '../../../store/authStore';
import { theme } from '../../../core/theme';
import { useRouter } from 'expo-router';

export const RegisterMultiStep = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'athlete', // Default
  });

  const { signup, isLoading, error } = useAuthStore();
  const router = useRouter();

  const updateData = (newData: any) => {
    setFormData(prev => ({ ...prev, ...newData }));
  };

  const handleSignup = async () => {
    await signup(
      formData.email, 
      formData.password, 
      formData.name, 
      formData.role as any
    );
  };

  return (
    <Card variant="glass" style={styles.card}>
      {step === 1 ? (
        <SignupStepOne 
          data={formData} 
          updateData={updateData} 
          onNext={() => setStep(2)} 
        />
      ) : (
        <SignupStepTwo 
          data={formData} 
          updateData={updateData} 
          onBack={() => setStep(1)} 
          onSubmit={handleSignup}
          isLoading={isLoading}
        />
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity 
        onPress={() => router.push('/login')}
        style={styles.loginLink}
      >
        <Text style={styles.loginText}>
          Déjà un compte ? <Text style={styles.loginTextBold}>Se connecter</Text>
        </Text>
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  loginLink: {
    marginTop: theme.spacing.xl,
    alignItems: 'center',
  },
  loginText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  loginTextBold: {
    color: theme.colors.accent,
    fontWeight: theme.typography.fontWeights.bold as any,
  },
});
