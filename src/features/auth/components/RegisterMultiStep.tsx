import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card } from '../../../shared/components/Card';
import { useAuthStore, UserRole, SignupData } from '../../../store/authStore';
import { useTheme } from '../../../core/theme';
import { useRouter } from 'expo-router';

import { StepRole } from './steps/StepRole';
import { StepIdentity } from './steps/StepIdentity';
import { StepDiscipline } from './steps/StepDiscipline';
import { StepPhysical } from './steps/StepPhysical';
import { StepObjective } from './steps/StepObjective';
import { StepCoachGroup } from './steps/StepCoachGroup';
import { StepAccount } from './steps/StepAccount';

export const RegisterMultiStep = () => {
  const theme = useTheme();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<SignupData>>({
    role: 'athlete',
    disciplines: [],
    subgroups: [],
  });

  const { signup, isLoading, error } = useAuthStore();
  const router = useRouter();

  const isCoach = formData.role === 'coach';
  const totalSteps = isCoach ? 4 : 6;

  const updateData = (newData: Partial<SignupData>) => {
    setFormData(prev => ({ ...prev, ...newData }));
  };

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSignup = async () => {
    if (!formData.email || !formData.pass || !formData.firstName || !formData.lastName) return;

    const res = await signup({
      email: formData.email,
      pass: formData.pass,
      firstName: formData.firstName,
      lastName: formData.lastName,
      role: formData.role as UserRole,
      disciplines: formData.disciplines,
      height: formData.height ? Number(formData.height) : undefined,
      weight: formData.weight ? Number(formData.weight) : undefined,
      objective: formData.objective,
      groupName: formData.groupName,
      subgroups: formData.subgroups,
    });

    if (res.success) {
      if (res.requiresVerification) {
        router.push({
          pathname: '/(auth)/verify-email',
          params: { email: formData.email }
        });
      } else {
        router.replace('/');
      }
    }
  };

  const renderStep = () => {
    if (isCoach) {
      switch (step) {
        case 1:
          return <StepRole data={formData} updateData={updateData} onNext={handleNext} />;
        case 2:
          return <StepIdentity data={formData} updateData={updateData} onNext={handleNext} onBack={handleBack} />;
        case 3:
          return <StepCoachGroup data={formData} updateData={updateData} onNext={handleNext} onBack={handleBack} />;
        case 4:
          return <StepAccount
                    data={formData}
                    updateData={updateData}
                    onSubmit={handleSignup}
                    onBack={handleBack}
                    isLoading={isLoading}
                 />;
        default:
          return null;
      }
    } else {
      switch (step) {
        case 1:
          return <StepRole data={formData} updateData={updateData} onNext={handleNext} />;
        case 2:
          return <StepIdentity data={formData} updateData={updateData} onNext={handleNext} onBack={handleBack} />;
        case 3:
          return <StepDiscipline data={formData} updateData={updateData} onNext={handleNext} onBack={handleBack} />;
        case 4:
          return <StepPhysical data={formData} updateData={updateData} onNext={handleNext} onBack={handleBack} />;
        case 5:
          return <StepObjective data={formData} updateData={updateData} onNext={handleNext} onBack={handleBack} />;
        case 6:
          return <StepAccount
                    data={formData}
                    updateData={updateData}
                    onSubmit={handleSignup}
                    onBack={handleBack}
                    isLoading={isLoading}
                 />;
        default:
          return null;
      }
    }
  };

  const dots = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <Card variant="glass" style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
         {dots.map(i => (
           <View
             key={i}
             style={[
               styles.progressDot,
               { backgroundColor: i <= step ? theme.colors.accent : theme.colors.border }
             ]}
           />
         ))}
      </View>

      <View style={styles.stepContainer}>
        {renderStep()}

        {error && <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>}

        {step === 1 && (
          <TouchableOpacity
            onPress={() => router.push('/login')}
            style={styles.loginLink}
          >
            <Text style={[styles.loginText, { color: theme.colors.textSecondary }]}>
              Déjà un compte ? <Text style={[styles.loginTextBold, { color: theme.colors.accent }]}>Se connecter</Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    flex: 1, // Let it expand up to its container
    maxHeight: '85%', // Prevent it from going off screen
    borderRadius: 24, // softer edges like the image
    padding: 24,
  },
  stepContainer: {
    flex: 1, // This is crucial for nested ScrollViews to work inside it
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  progressDot: {
    height: 4,
    width: 24,
    borderRadius: 2,
  },
  errorText: {
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  loginLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
  },
  loginTextBold: {
    fontWeight: '700',
  },
});
