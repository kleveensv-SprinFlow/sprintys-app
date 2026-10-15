import { Appear } from '../../src/shared/components/Appear';
import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, Animated, View, Text, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/core/theme';
import { AthleteHeader } from '../../src/features/athlete/components/AthleteHeader';
import { AthleteGauges } from '../../src/features/athlete/components/AthleteGauges';
import { NotificationInvite } from '../../src/features/notifications/NotificationInvite';
import { SessionCarousel } from '../../src/features/athlete/components/SessionCarousel';
import { BodyCompositionCard } from '../../src/features/athlete/components/BodyCompositionCard';
import { PerformanceCard } from '../../src/features/athlete/components/PerformanceCard';
import { WeatherCard } from '../../src/shared/components/WeatherCard';
import { GlassScreen } from '../../src/shared/components/GlassScreen';
import { FrostedBar } from '../../src/shared/components/FrostedBar';
import { useTabBarSpace } from '../../src/shared/hooks/useTabBarSpace';
import { useNutritionStore } from '../../src/store/nutrition/nutritionStore';
import { useAuthStore } from '../../src/store/authStore';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useFocusEffect } from '@react-navigation/native';

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 5 || hour >= 18) return 'Bonsoir';
  return 'Bonjour';
};

export default function DashboardScreen() {
  const theme = useTheme();
  const { fetchMealLogs, currentDate } = useNutritionStore();
  const { user } = useAuthStore();
  const { loadUpcomingWorkouts } = useWorkoutStore();
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const tabBarSpace = useTabBarSpace(24);
  // iOS-like nav bar: transparent at rest, glass once content slides under it
  const headerBarOpacity = scrollY.interpolate({ inputRange: [0, 24], outputRange: [0, 1], extrapolate: 'clamp' });

  useFocusEffect(
    useCallback(() => {
      fetchMealLogs(currentDate);
      if (user?.id) {
        loadUpcomingWorkouts(user.id);
      }
    }, [user?.id, currentDate])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    // Cards that load their own data (check-in, competition, weight) reload on refreshKey
    setRefreshKey((k) => k + 1);
    try {
      await Promise.all([
        fetchMealLogs(currentDate),
        user?.id ? loadUpcomingWorkouts(user.id) : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const now = new Date();
  const dateLabel = `${DAY_NAMES[now.getDay()]} ${now.getDate()} ${MONTH_NAMES[now.getMonth()]}`;
  const firstName = user?.firstName || user?.name?.split(' ')[0] || '';

  return (
    <GlassScreen scrollY={scrollY}>
      <View style={[styles.headerWrap, { paddingTop: insets.top }]}>
        <FrostedBar opacity={headerBarOpacity} />
        <AthleteHeader />
      </View>

      {/* Runs to the bottom of the screen: the tab bar floats (frosted) over the content */}
      <View style={styles.body}>
        <Animated.ScrollView
          contentContainerStyle={{ paddingBottom: tabBarSpace }}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.textMuted}
              colors={[theme.colors.sprintyBlue]}
            />
          }
        >
          <Appear index={0}><View style={styles.greeting}>
            <Text style={[styles.greetingDate, { color: theme.colors.textSecondary }]}>{dateLabel.toUpperCase()}</Text>
            <Text style={[styles.greetingTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {firstName ? `${getGreeting()} ${firstName}` : getGreeting()}
            </Text>
          </View></Appear>

          <Appear index={1}><NotificationInvite role="athlete" /><AthleteGauges refreshKey={refreshKey} /></Appear>
          <Appear index={2}><SessionCarousel /></Appear>
          <Appear index={3}>
            <View style={styles.cardGutter}>
              <WeatherCard />
            </View>
          </Appear>
          <Appear index={4}><PerformanceCard refreshKey={refreshKey} /></Appear>
          <Appear index={5}><BodyCompositionCard refreshKey={refreshKey} /></Appear>
        </Animated.ScrollView>
      </View>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  headerWrap: {
    zIndex: 10,
  },
  greeting: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
  },
  greetingDate: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  greetingTitle: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: 2,
  },
  cardGutter: {
    // WeatherCard has no horizontal margin (the coach screen pads its scroll view)
    marginHorizontal: 16,
  },
});
