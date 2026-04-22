import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Session } from '@supabase/supabase-js';
import { supabase } from './src/services/supabaseClient';

import AuthScreen from './src/screens/AuthScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import TabNavigator from './src/navigation/TabNavigator';

const Stack = createNativeStackNavigator();

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);

  const checkUserProfile = async (userId: string) => {
    console.log('Checking profile for user:', userId);
    
    // Failsafe : Timeout de 3 secondes pour éviter de bloquer l'app
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 3000)
    );

    try {
      const queryPromise = supabase
        .from('profiles')
        .select('disciplines')
        .eq('id', userId)
        .single();

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      if (error && error.code !== 'PGRST116') {
        console.error('Erreur Supabase lors de la vérification:', error);
      }

      if (data && data.disciplines && data.disciplines.length > 0) {
        console.log('Profile complete, moving to Dashboard.');
        setHasCompletedOnboarding(true);
      } else {
        console.log('Profile incomplete or not found, moving to Onboarding.');
        setHasCompletedOnboarding(false);
      }
    } catch (e: any) {
      console.warn('Profile check bypassed or timed out (Reason:', e.message, ')');
      setHasCompletedOnboarding(false);
    } finally {
      console.log('Failsafe trigger: forcing loading to false.');
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('App starting, initializing auth...');
    
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
        
        if (initialSession?.user) {
          await checkUserProfile(initialSession.user.id);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        console.log('Initialization finished, setting loading to false.');
        setLoading(false);
      }
    };

    initializeAuth();

    // Écouter les changements d'état (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('Auth event:', event);
      setSession(currentSession);
      
      if (currentSession?.user) {
        await checkUserProfile(currentSession.user.id);
      } else {
        setHasCompletedOnboarding(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!session ? (
            <Stack.Screen name="Auth" component={AuthScreen} />
          ) : hasCompletedOnboarding === true ? (
            <Stack.Screen name="MainTabs" component={TabNavigator} />
          ) : (
            <>
              {/* Par défaut ou si l'onboarding n'est pas fini */}
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
              <Stack.Screen name="MainTabs" component={TabNavigator} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
});
