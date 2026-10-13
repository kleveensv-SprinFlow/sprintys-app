import React, { useLayoutEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore, UserRole, SignupData } from '../../../store/authStore';
import { theme } from '../../../core/theme';

import { StepRole } from './steps/StepRole';
import { StepIdentity } from './steps/StepIdentity';
import { StepPhysical } from './steps/StepPhysical';
import { StepCoachGroup } from './steps/StepCoachGroup';
import { StepAccount } from './steps/StepAccount';
import { toISODate } from '../../../legal/age';

interface RegisterMultiStepProps {
  onSwitchToLogin?: () => void;
}

const TOTAL_STEPS = 4;

export const RegisterMultiStep: React.FC<RegisterMultiStepProps> = ({ onSwitchToLogin }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<SignupData>>({
    role: 'athlete',
    firstName: '',
    lastName: '',
    subgroups: [],
  });

  const { signup, isLoading, error, clearError } = useAuthStore();
  const router = useRouter();

  // Progress bar grows smoothly; each step slides in from the direction of travel
  const progress = useRef(new Animated.Value(1)).current;
  const enter = useRef(new Animated.Value(1)).current;
  const direction = useRef(1);

  // Layout effect: reset before paint so the new step never flashes at full opacity
  useLayoutEffect(() => {
    Animated.timing(progress, {
      toValue: step,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [step]);

  const isCoach = formData.role === 'coach';

  const updateData = (newData: Partial<SignupData>) => {
    if (newData.role && newData.role !== formData.role) setStep(1);
    setFormData((prev) => ({ ...prev, ...newData }));
  };

  const go = (delta: 1 | -1) => {
    direction.current = delta;
    clearError();
    setStep((s) => Math.min(TOTAL_STEPS, Math.max(1, s + delta)));
  };

  const handleLoginPress = () => {
    clearError();
    if (onSwitchToLogin) onSwitchToLogin();
    else router.push('/(auth)/login');
  };

  const handleSignup = async () => {
    if (!formData.email || !formData.pass || !formData.firstName || !formData.lastName) return;

    const res = await signup({
      email: formData.email,
      pass: formData.pass,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      role: formData.role as UserRole,
      gender: formData.gender as 'homme' | 'femme',
      disciplines: formData.disciplines,
      height: formData.height ? Number(formData.height) : undefined,
      weight: formData.weight ? Number(formData.weight) : undefined,
      objective: formData.objective,
      groupName: formData.groupName,
      subgroups: formData.subgroups,
      dateOfBirth: formData.dob ? toISODate(formData.dob) : undefined,
      consents: [
        ...(formData.acceptedTerms ? (['terms'] as const) : []),
        ...(formData.role !== 'coach' && formData.acceptedHealth ? (['health_profile'] as const) : []),
      ],
    });

    if (res.success) {
      if (res.requiresVerification) {
        router.push({ pathname: '/(auth)/verify-email', params: { email: formData.email } });
      } else {
        router.replace('/');
      }
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <StepRole data={formData} updateData={updateData} onNext={() => go(1)} />;
      case 2:
        return <StepIdentity data={formData} updateData={updateData} onNext={() => go(1)} onBack={() => go(-1)} />;
      case 3:
        return isCoach ? (
          <StepCoachGroup data={formData} updateData={updateData} onNext={() => go(1)} onBack={() => go(-1)} />
        ) : (
          <StepPhysical data={formData} updateData={updateData} onNext={() => go(1)} onBack={() => go(-1)} />
        );
      case 4:
        return (
          <StepAccount
            data={formData}
            updateData={updateData}
            onSubmit={handleSignup}
            onBack={() => go(-1)}
            isLoading={isLoading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressHeader}>
        <Text style={styles.stepLabel}>
          Étape <Text style={styles.stepLabelBold}>{step}</Text> sur {TOTAL_STEPS}
        </Text>
        <View style={styles.track}>
          <Animated.View
            style={[
              styles.fill,
              { width: progress.interpolate({ inputRange: [0, TOTAL_STEPS], outputRange: ['0%', '100%'] }) },
            ]}
          />
        </View>
      </View>

      <Animated.View
        key={step}
        style={{
          opacity: enter,
          transform: [
            { translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [18 * direction.current, 0] }) },
          ],
        }}
      >
        {renderStep()}
      </Animated.View>

      {!!error && (
        <View style={styles.notice}>
          <Feather name="alert-circle" size={16} color={theme.colors.error} />
          <Text style={styles.noticeText}>{error}</Text>
        </View>
      )}

      {step === 1 && (
        <Pressable onPress={handleLoginPress} style={styles.loginLink} hitSlop={8}>
          <Text style={styles.loginText}>
            Déjà un compte ? <Text style={styles.loginTextBold}>Connecte-toi</Text>
          </Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  progressHeader: { marginBottom: 18, gap: 8 },
  stepLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  stepLabelBold: { fontWeight: '800', color: theme.colors.sprintyBlue },
  track: { height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: theme.colors.glassFill },
  fill: { height: '100%', borderRadius: 2, backgroundColor: theme.colors.sprintyBlue },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 14,
  },
  noticeText: { flex: 1, fontSize: 14, color: theme.colors.text },
  loginLink: { marginTop: 18, alignItems: 'center', paddingVertical: 4 },
  loginText: { fontSize: 14, color: theme.colors.textSecondary },
  loginTextBold: { fontWeight: '700', color: theme.colors.sprintyBlue },
});
