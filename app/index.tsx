import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/useAuthStore';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { colors } from '../src/shared/theme/colors';
import { useEffect } from 'react';
import { supabase } from '../src/services/supabase';

export default function Index() {
  const { session, isLoading, setSession, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });
  }, []);
  
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (session) {
    // For now, redirect to login or a placeholder until tabs are created
    // When tabs are ready: return <Redirect href="/(tabs)" />;
    return <Redirect href="/(tabs)" />; 
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
