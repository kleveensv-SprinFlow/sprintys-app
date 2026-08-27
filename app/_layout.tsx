import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../src/store/authStore';
import { SprintyFeedback } from '../src/features/sprinty/SprintyFeedback';

export default function RootLayout() {
  const { user, pendingEmail, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isVerifyScreen = segments[1] === 'verify-email';

    setTimeout(() => {
      if (pendingEmail && !isVerifyScreen) {
        router.replace({
          pathname: '/(auth)/verify-email',
          params: { email: pendingEmail }
        });
      } else if (!user && !pendingEmail && !inAuthGroup) {
        router.replace('/login');
      } else if (user && inAuthGroup) {
        // Redirect based on role
        if (user.role === 'coach') {
          router.replace('/(coach)');
        } else {
          router.replace('/(athlete)');
        }
      }
    }, 0);
  }, [user, pendingEmail, segments, isLoading]);

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
