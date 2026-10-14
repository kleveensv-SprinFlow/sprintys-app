import { Stack, useRouter, useSegments, useGlobalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/store/authStore';
import { useConsentStore } from '../src/store/consentStore';
import { requiredConsents } from '../src/legal/consents';
import { useTheme } from '../src/core/theme';
import { FeedbackHost } from '../src/shared/feedback/FeedbackHost';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppErrorScreen } from '../src/shared/components/AppErrorScreen';
import { OfflineBanner } from '../src/shared/components/OfflineBanner';
import { AIConsentSheet } from '../src/features/legal/AIConsentSheet';
import { TourOverlay } from '../src/features/onboarding/TourOverlay';
import { useOnboardingStore } from '../src/store/onboardingStore';
import { useEntitlementStore } from '../src/store/entitlementStore';
import { syncPurchasesUser } from '../src/services/purchases';
import { PaywallSheet } from '../src/features/billing/PaywallSheet';

/** Any screen that crashes while rendering shows a friendly retry screen instead of a blank one. */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  return <AppErrorScreen error={error} retry={retry} />;
}

export default function RootLayout() {
  const theme = useTheme();
  const isDark = theme.isDark;
  const { user, pendingEmail, isLoading, isInitialized, initializeAuth } = useAuthStore();
  const segments = useSegments();
  const params = useGlobalSearchParams<{ readonly?: string }>();
  const router = useRouter();
  const consents = useConsentStore((s) => s.active);
  const consentsFor = useConsentStore((s) => s.loadedFor);
  const inTeam = useConsentStore((s) => s.inTeam);

  useEffect(() => {
    initializeAuth();
  }, []);

  // Plan of the signed-in account, and its store purchases (never blocks the app)
  useEffect(() => {
    const id = user?.id ?? null;
    syncPurchasesUser(id);
    if (id) useEntitlementStore.getState().refresh(id);
  }, [user?.id]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && useAuthStore.getState().user?.id) useEntitlementStore.getState().refresh();
    });
    return () => sub.remove();
  }, []);

  // Consents of the signed-in account (required ones gate the app)
  useEffect(() => {
    if (user?.id && consentsFor !== user.id) useConsentStore.getState().load(user.id, user.role);
  }, [user?.id, consentsFor]);

  const consentsReady = !!user && consentsFor === user.id && !!consents;
  const missingConsents = consentsReady
    ? requiredConsents(user!.role, inTeam).some((t) => !consents!.has(t)) || !user!.dateOfBirth
    : false;

  // Welcome tour: once per account, as soon as the app is usable (existing users get it once too)
  const inAppArea = segments[0] === '(athlete)' || segments[0] === '(coach)';
  useEffect(() => {
    if (user?.id && consentsReady && !missingConsents && inAppArea) useOnboardingStore.getState().checkAuto(user.id);
  }, [user?.id, consentsReady, missingConsents, inAppArea]);

  useEffect(() => {
    if (isLoading || !isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isVerifyScreen = (segments as string[])[1] === 'verify-email';
    const isCompleteScreen = (segments as string[])[1] === 'complete-profile';
    const isCallbackRoute = segments[0] === 'auth';

    // Legal texts are readable from anywhere, signed in or not
    if (isCallbackRoute || segments[0] === 'legal') return;

    if (user && consentsReady && missingConsents) {
      if (!isCompleteScreen) router.replace('/(auth)/complete-profile');
      return;
    }
    if (user && isCompleteScreen && !consentsReady) return;

    if (pendingEmail && !isVerifyScreen) {
      router.replace({
        pathname: '/(auth)/verify-email',
        params: { email: pendingEmail }
      });
    } else if (!user && !pendingEmail && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user) {
      // Stricter routing: even if not in auth group, force correct role segment
      const isCoachRoute = segments[0] === '(coach)';
      const isAthleteRoute = segments[0] === '(athlete)';
      
      if (inAuthGroup) {
        if (user.role === 'coach') {
          router.replace('/(coach)');
        } else {
          router.replace('/(athlete)');
        }
      } else if (user.role === 'athlete' && isCoachRoute) {
        // Prevent athlete from accessing coach routes
        router.replace('/(athlete)');
      } else if (user.role === 'coach' && isAthleteRoute) {
        const readingNutrition = (segments as string[])[1] === 'nutrition' && params.readonly === 'true';
        if (!readingNutrition) router.replace('/(coach)');
      }
    }
  }, [user, pendingEmail, segments, params.readonly, isLoading, isInitialized, consentsReady, missingConsents]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.backdrop, theme.colors.backdrop]}
        style={StyleSheet.absoluteFill}
      />
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="auth/callback" options={{ animation: 'fade' }} />
        <Stack.Screen name="auth/reset-password" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(athlete)" />
        <Stack.Screen name="(coach)" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="index" />
        <Stack.Screen name="legal/[doc]" options={{ presentation: 'modal' }} />
      </Stack>
      <OfflineBanner />
      <TourOverlay />
      <PaywallSheet />
      <AIConsentSheet />
      <FeedbackHost />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDF1F7' }
});



