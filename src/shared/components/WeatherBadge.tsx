import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useWeatherStore } from '../../store/weatherStore';
import { theme } from '../../core/theme';
import Svg, { Path, Circle } from 'react-native-svg';

export const WeatherBadge: React.FC = () => {
  const { data, isLoading, error, updateWeather } = useWeatherStore();

  useEffect(() => {
    updateWeather();
  }, []);

  if (error || (!data && !isLoading)) return null;

  if (isLoading && !data) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={theme.colors.accent} />
      </View>
    );
  }

  const renderIcon = () => {
    const color = theme.colors.accent;
    switch (data?.condition) {
      case 'clear':
        return (
          <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
            <Circle cx="12" cy="12" r="5" />
            <Path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </Svg>
        );
      case 'cloudy':
        return (
          <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
            <Path d="M17.5 19c2.5 0 4.5-2 4.5-4.5s-2-4.5-4.5-4.5c-.2 0-.4 0-.6.1-.9-3-3.7-5.1-6.9-5.1-4.1 0-7.5 3.4-7.5 7.5s3.4 7.5 7.5 7.5c.9 0 1.7-.2 2.5-.5.6.3 1.3.5 2.5.5z" />
          </Svg>
        );
      case 'rainy':
      case 'showers':
        return (
          <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
            <Path d="M16 13a4 4 0 0 1-8 0" />
            <Path d="M8 15v3M12 17v3M16 15v3" />
            <Path d="M20 10a8 8 0 1 0-16 0" />
          </Svg>
        );
      default:
        return (
          <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
            <Circle cx="12" cy="12" r="10" />
          </Svg>
        );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        {renderIcon()}
      </View>
      <Text style={styles.temp}>{data?.temperature}°</Text>
      <View style={styles.divider} />
      <Text style={styles.wind}>{data?.windSpeed} km/h</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  iconWrapper: {
    marginRight: 6,
  },
  temp: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: theme.typography.fontWeights.bold as any,
  },
  divider: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 8,
  },
  wind: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: theme.typography.fontWeights.medium as any,
  },
});
