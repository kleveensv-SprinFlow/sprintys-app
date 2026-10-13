import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../src/services/supabase';
import { useAuthStore, translateAuthError } from '../../src/store/authStore';
import { theme } from '../../src/core/theme';
import { glassCard } from '../../src/core/glass';
import { GlowBackground } from '../../src/shared/components/GlowBackground';
import { GlassSheen } from '../../src/shared/components/GlassSheen';
import { Button } from '../../src/shared/components/Button';

const LINK_ERRORS: Record<string, string> = {
  otp_expired: 'Ce lien a expiré. Demande-en un nouveau depuis l’écran de connexion.',
  access_denied: 'La connexion a été annulée ou refusée.',
};

/**
 * Landing route for deep links coming back from Supabase:
 * Google sign-in, e-mail confirmation and password recovery (type=recovery).
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const incomingUrl = Linking.useURL();
  const { reloadProfile } = useAuthStore();
  const processedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const finish = async () => {
      try {
        await reloadProfile();
      } catch {
        // the root layout falls back to the login screen
      }
      useAuthStore.setState({ isLoading: false, isInitialized: true });
      if (isMounted) router.replace('/');
    };

    // Nothing usable arrived (e.g. Google already handled by the auth session): never hang here
    const safetyTimer = setTimeout(() => {
      if (isMounted && !processedRef.current) {
        processedRef.current = true;
        finish();
      }
    }, 3000);

    const processAuth = async () => {
      if (processedRef.current) return;
      try {
        try {
          await WebBrowser.dismissAuthSession();
        } catch {
          // no browser sheet open
        }

        const urlToParse = incomingUrl || (await Linking.getInitialURL()) || '';
        const params: Record<string, string> = {};
        for (const [k, v] of Object.entries(searchParams)) if (typeof v === 'string') params[k] = v;
        if (urlToParse) Object.assign(params, QueryParams.getQueryParams(urlToParse).params);

        const linkError = params.error_code || params.error;
        if (linkError) {
          processedRef.current = true;
          clearTimeout(safetyTimer);
          if (isMounted) setError(LINK_ERRORS[linkError] || params.error_description?.replace(/\+/g, ' ') || 'Ce lien n’est plus valide.');
          return;
        }

        const hasTokens = !!(params.access_token && params.refresh_token);
        if (!params.code && !hasTokens) {
          const { data } = await supabase.auth.getSession();
          if (!data.session) return; // let the safety timer decide
          processedRef.current = true;
          clearTimeout(safetyTimer);
          await finish();
          return;
        }

        processedRef.current = true;
        clearTimeout(safetyTimer);
        if (params.code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
          if (exchangeError) throw exchangeError;
        } else {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          if (sessionError) throw sessionError;
        }

        if (params.type === 'recovery') {
          if (isMounted) router.replace('/auth/reset-password');
          return;
        }
        await finish();
      } catch (err) {
        if (isMounted) setError(translateAuthError(err));
      }
    };

    processAuth();

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
    };
  }, [incomingUrl]);

  return (
    <View style={styles.container}>
      <GlowBackground />
      <SafeAreaView style={styles.center}>
        {error ? (
          <View style={[glassCard, styles.card]}>
            <GlassSheen radius={22} />
            <View style={styles.badge}>
              <Feather name="link-2" size={24} color={theme.colors.error} />
            </View>
            <Text style={styles.title}>Lien impossible à ouvrir</Text>
            <Text style={styles.text}>{error}</Text>
            <Button title="Retour à la connexion" onPress={() => router.replace('/(auth)/login')} style={styles.button} />
          </View>
        ) : (
          <>
            <ActivityIndicator size="large" color={theme.colors.sprintyBlue} />
            <Text style={styles.loading}>Connexion en cours…</Text>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backdrop },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, gap: 16 },
  loading: { fontSize: 15, color: theme.colors.textSecondary, fontWeight: '600' },
  card: { width: '100%', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 24 },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 20, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.4, textAlign: 'center' },
  text: { fontSize: 15, lineHeight: 21, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 6 },
  button: { alignSelf: 'stretch', marginTop: 20 },
});
