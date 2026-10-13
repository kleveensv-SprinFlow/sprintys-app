import { Stack, useRouter, useSegments, useGlobalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/store/authStore';
import { useTheme } from '../src/core/theme';
import { SprintyFeedback } from '../src/features/sprinty/SprintyFeedback';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppErrorScreen } from '../src/shared/components/AppErrorScreen';
import { OfflineBanner } from '../src/shared/components/OfflineBanner';

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

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    if (isLoading || !isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isVerifyScreen = (segments as string[])[1] === 'verify-email';
    const isCallbackRoute = segments[0] === 'auth';

    if (isCallbackRoute) return;

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
  }, [user, pendingEmail, segments, params.readonly, isLoading, isInitialized]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.backdrop, theme.colors.backdrop]}
        style={StyleSheet.absoluteFill}
      />
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(athlete)" />
        <Stack.Screen name="(coach)" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="index" />
      </Stack>
      <SprintyFeedback />
      <OfflineBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDF1F7' }
});



