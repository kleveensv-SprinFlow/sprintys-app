import React, { useEffect } from 'react';
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
  const { reloadProfile } = useAuthStore();

  useEffect(() => {
    let isMounted = true;

    const processAuth = async () => {
      try {
        // Dismiss in-app browser sheet if still open
        try {
          await WebBrowser.dismissAuthSession();
        } catch {}

        const currentUrl = await Linking.getInitialURL();
        const urlParams = currentUrl ? QueryParams.getQueryParams(currentUrl).params : {};

        const code = (searchParams.code as string) || urlParams.code;
        const accessToken = (searchParams.access_token as string) || urlParams.access_token;
        const refreshToken = (searchParams.refresh_token as string) || urlParams.refresh_token;

        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        } else if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        }

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
    };
  }, []);

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
