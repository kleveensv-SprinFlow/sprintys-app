import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { BlurView } from 'expo-blur';

const WeatherBadge = ({ temp, condition }: { temp: number; condition: string }) => {
  return (
    <BlurView intensity={30} tint="light" style={styles.container}>
      <Text style={styles.temp}>{temp}°C</Text>
      <Text style={styles.condition}>{condition.toUpperCase()}</Text>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  temp: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  condition: {
    color: '#00E5FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default WeatherBadge;
