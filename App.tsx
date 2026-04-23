import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Session } from '@supabase/supabase-js';
import { supabase } from './src/services/supabaseClient';

import * as SplashScreen from 'expo-splash-screen';

import AuthScreen from './src/screens/AuthScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import TabNavigator from './src/navigation/TabNavigator';
import CheckInScreen from './src/screens/CheckInScreen';
import AddWorkoutScreen from './src/screens/AddWorkoutScreen';
import DayDetailScreen from './src/screens/DayDetailScreen';
import WeatherDetailScreen from './src/screens/WeatherDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { BootScreen } from './src/screens/BootScreen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reload might happen */
});

const Stack = createNativeStackNavigator();

// Composant de chargement pour la navigation
const LoadingView = () => (
  <View style={styles.loadingContainer}>
    <BootScreen />
  </View>
);

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAppReady, setIsAppReady] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    // Phase d'initialisation avec sécurité (timeout 2.5s)
    const safetyTimeout = setTimeout(() => {
      setIsAppReady(true);
      SplashScreen.hideAsync().catch(() => {});
      setTimeout(() => setIsBooting(false), 500);
    }, 2500);

    async function initialize() {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
        
        if (initialSession?.user) {
          const { data } = await supabase
            .from('profiles')
            .select('disciplines')
            .eq('id', initialSession.user.id)
            .single();
          setHasCompletedOnboarding(!!(data && data.disciplines && data.disciplines.length > 0));
        }
      } catch (e) {
        console.warn('Init error:', e);
      } finally {
        clearTimeout(safetyTimeout);
        setIsAppReady(true);
        // Hide native splash screen
        await SplashScreen.hideAsync().catch(() => {});
        // Laisser l'animation Lottie se jouer un peu
        setTimeout(() => setIsBooting(false), 1500);
      }
    }

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isAppReady || isBooting) {
    return <BootScreen />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!session ? (
            <Stack.Screen name="Auth" component={AuthScreen} />
          ) : hasCompletedOnboarding === null ? (
            <Stack.Screen name="Loading" component={LoadingView} />
          ) : hasCompletedOnboarding === true ? (
            <>
              <Stack.Screen name="MainTabs" component={TabNavigator} />
              <Stack.Screen name="CheckIn" component={CheckInScreen} options={{ presentation: 'modal' }} />
              <Stack.Screen name="AddWorkout" component={AddWorkoutScreen} options={{ presentation: 'modal' }} />
              <Stack.Screen name="DayDetail" component={DayDetailScreen} />
              <Stack.Screen name="WeatherDetail" component={WeatherDetailScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
            </>
          ) : (
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
