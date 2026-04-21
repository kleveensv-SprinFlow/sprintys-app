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

    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/login');
    } else if (user && inAuthGroup) {
      // Redirect to main app if authenticated
      router.replace('/');
    }
  }, [user, segments, isLoading]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ title: 'Home' }} />
      </Stack>
      <SprintyFeedback />
    </>
  );
}
