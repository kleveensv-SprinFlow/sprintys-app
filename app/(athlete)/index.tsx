import React from 'react';
import { StyleSheet, SafeAreaView, ScrollView, View } from 'react-native';
import { theme } from '../../src/core/theme';
import { AthleteHeader } from '../../src/features/athlete/components/AthleteHeader';
import { AthleteGauges } from '../../src/features/athlete/components/AthleteGauges';
import { SessionCarousel } from '../../src/features/athlete/components/SessionCarousel';
import { AthleteWeatherCard } from '../../src/features/athlete/components/AthleteWeatherCard';

export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <AthleteHeader />
        
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <AthleteGauges />
          <SessionCarousel />
          <AthleteWeatherCard />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505', // Deep dark background for premium feel
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Extra space for the custom tab bar at the bottom
  },
});
