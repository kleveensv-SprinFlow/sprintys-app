import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { getWeatherCondition } from '../../utils/weather';

interface HourlyForecastListProps {
  data: Array<{
    time: string;
    temp: number;
    conditionCode: number;
  }>;
}

export const HourlyForecastList: React.FC<HourlyForecastListProps> = ({ data }) => {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {data.map((hour, index) => {
        const time = new Date(hour.time).getHours();
        return (
          <View key={index} style={styles.hourCard}>
            <Text style={styles.timeText}>{time}:00</Text>
            <Text style={styles.tempText}>{Math.round(hour.temp)}°</Text>
            <Text style={styles.conditionText}>{getWeatherCondition(hour.conditionCode)}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    gap: 12,
  },
  hourCard: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    width: 90,
    borderWidth: 1,
    borderColor: '#333',
  },
  timeText: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  tempText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  conditionText: {
    color: '#aaa',
    fontSize: 10,
    textAlign: 'center',
  },
});
