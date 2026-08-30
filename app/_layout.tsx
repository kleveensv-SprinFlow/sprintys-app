import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../src/store/authStore';
import { SprintyFeedback } from '../src/features/sprinty/SprintyFeedback';

export default function RootLayout() {
  const { user, pendingEmail, isLoading, isInitialized, initializeAuth } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    if (isLoading || !isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isVerifyScreen = (segments as string[])[1] === 'verify-email';

    if (pendingEmail && !isVerifyScreen) {
      router.replace({
        pathname: '/(auth)/verify-email',
        params: { email: pendingEmail }
      });
    } else if (!user && !pendingEmail && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Redirect based on role
      if (user.role === 'coach') {
        router.replace('/(coach)');
      } else {
        router.replace('/(athlete)');
      }
    }
  }, [user, pendingEmail, segments, isLoading, isInitialized]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(athlete)" />
        <Stack.Screen name="(coach)" />
        <Stack.Screen name="index" />
      </Stack>
      <SprintyFeedback />
    </>
  );
}

