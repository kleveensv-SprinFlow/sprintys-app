import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore, UserRole, SignupData } from '../../../store/authStore';
import { useTheme } from '../../../core/theme';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { StepRole } from './steps/StepRole';
import { StepIdentity } from './steps/StepIdentity';
import { StepDiscipline } from './steps/StepDiscipline';
import { StepPhysical } from './steps/StepPhysical';
import { StepObjective } from './steps/StepObjective';
import { StepCoachGroup } from './steps/StepCoachGroup';
import { StepAccount } from './steps/StepAccount';

interface RegisterMultiStepProps {
  onSwitchToLogin?: () => void;
}

export const RegisterMultiStep: React.FC<RegisterMultiStepProps> = ({ onSwitchToLogin }) => {
  const theme = useTheme();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<SignupData>>({
    role: 'athlete',
    firstName: '',
    lastName: '',
    disciplines: [],
    subgroups: [],
  });

  const { signup, isLoading, error } = useAuthStore();
  const router = useRouter();

  const isCoach = formData.role === 'coach';
  const totalSteps = isCoach ? 4 : 6;

  const updateData = (newData: Partial<SignupData>) => {
    if (newData.role && newData.role !== formData.role) {
      setStep(1);
    }
    setFormData(prev => ({ ...prev, ...newData }));
  };

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleLoginPress = () => {
    if (onSwitchToLogin) {
      onSwitchToLogin();
    } else {
      router.push('/(auth)/login');
    }
  };

  const handleSignup = async () => {
    if (!formData.email || !formData.pass || !formData.firstName || !formData.lastName) return;

    const res = await signup({
      email: formData.email,
      pass: formData.pass,
      firstName: formData.firstName,
      lastName: formData.lastName,
      role: formData.role as UserRole,
      gender: formData.gender as 'homme' | 'femme',
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

  return (
    <View style={styles.container}>
      {/* Animated Dynamic Progress Bar */}
      <View style={styles.progressHeader}>
        <View style={styles.progressTextRow}>
          <Text style={[styles.stepLabel, { color: theme.colors.textSecondary }]}>
            Étape <Text style={[styles.stepLabelBold, { color: theme.colors.accent }]}>{step}</Text> sur {totalSteps}
          </Text>
          <Text style={[styles.progressPercent, { color: theme.colors.textMuted }]}>
            {Math.round((step / totalSteps) * 100)}%
          </Text>
        </View>
        <View style={[styles.progressBarBackground, { backgroundColor: theme.colors.border }]}>
          <LinearGradient
            colors={['#0026AE', '#00DCFD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBarFill, { width: `${(step / totalSteps) * 100}%` }]}
          />
        </View>
      </View>

      <View style={styles.stepContainer}>
        {renderStep()}

        {error && <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>}

        {step === 1 && (
          <TouchableOpacity
            onPress={handleLoginPress}
            style={styles.loginLink}
            activeOpacity={0.7}
          >
            <Text style={[styles.loginText, { color: theme.colors.textSecondary }]}>
              Déjà un compte ? <Text style={[styles.loginTextBold, { color: theme.colors.accent }]}>Se connecter</Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  progressHeader: {
    marginBottom: 20,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  stepLabelBold: {
    fontWeight: '800',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarBackground: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  stepContainer: {
    width: '100%',
  },
  errorText: {
    fontSize: 13,
    marginTop: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  loginLink: {
    marginTop: 22,
    alignItems: 'center',
    paddingVertical: 8,
  },
  loginText: {
    fontSize: 14,
  },
  loginTextBold: {
    fontWeight: '700',
  },
});
