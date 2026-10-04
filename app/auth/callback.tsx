import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/store/authStore';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const incomingUrl = Linking.useURL();
  const { reloadProfile } = useAuthStore();
  const processedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    // Safety timeout: guarantee redirection in at most 2 seconds
    const safetyTimer = setTimeout(async () => {
      if (isMounted && !processedRef.current) {
        processedRef.current = true;
        try {
          await reloadProfile();
        } catch {}
        router.replace('/');
      }
    }, 2000);

    const processAuth = async () => {
      if (processedRef.current) return;

      try {
        // Dismiss in-app browser sheet if still open
        try {
          await WebBrowser.dismissAuthSession();
        } catch {}

        // Check if session is already active
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          processedRef.current = true;
          clearTimeout(safetyTimer);
          await reloadProfile();
          if (isMounted) router.replace('/');
          return;
        }

        // Parse tokens/code from reactive deep link or params
        const initialUrl = await Linking.getInitialURL();
        const urlToParse = incomingUrl || initialUrl || '';

        let code = searchParams.code as string;
        let accessToken = searchParams.access_token as string;
        let refreshToken = searchParams.refresh_token as string;

        if (urlToParse) {
          const { params } = QueryParams.getQueryParams(urlToParse);
          if (params.code) code = params.code;
          if (params.access_token) accessToken = params.access_token;
          if (params.refresh_token) refreshToken = params.refresh_token;
        }

        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        } else if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        }

        processedRef.current = true;
        clearTimeout(safetyTimer);
        await reloadProfile();
      } catch (err) {
        console.warn('Callback exchange warning:', err);
      } finally {
        if (isMounted) {
          router.replace('/');
        }
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
      <ActivityIndicator size="large" color="#0069E8" />
      <Text style={styles.text}>Connexion en cours...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    gap: 16,
  },
  text: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
});
