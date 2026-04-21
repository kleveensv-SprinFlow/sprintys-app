import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../src/store/authStore';
import { SprintyFeedback } from '../src/features/sprinty/SprintyFeedback';

export default function RootLayout() {
  const { user, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    setTimeout(() => {
      if (!user && !inAuthGroup) {
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
  }, [user, segments, isLoading]);

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
