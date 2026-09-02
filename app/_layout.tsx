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
        // Prevent coach from accessing athlete routes
        router.replace('/(coach)');
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

