import React from 'react';
import { Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { goBack } from '../../src/core/navigation';
import { Header } from '../../src/shared/components/Header';
import { GlassScreen } from '../../src/shared/components/GlassScreen';
import { useFrostedHeader } from '../../src/shared/hooks/useFrostedHeader';
import { useRefresh } from '../../src/shared/hooks/useRefresh';
import { useAuthStore } from '../../src/store/authStore';
import { PerformanceView } from '../../src/features/performance/PerformanceView';

export default function AthletePerformanceScreen() {
  const router = useRouter();
  const { scrollY, scrollProps } = useFrostedHeader();
  const { user } = useAuthStore();
  const [refreshKey, setRefreshKey] = React.useState(0);
  const refreshControl = useRefresh(async () => setRefreshKey((k) => k + 1));

  return (
    <GlassScreen scrollY={scrollY}>
      <Header title="Ma progression" showBackButton onBackPress={() => goBack(router, '/(athlete)')} scrollY={scrollY} />
      <Animated.ScrollView
        {...scrollProps}
        refreshControl={refreshControl}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {user?.id ? <PerformanceView athleteId={user.id} mode="full" audience="athlete" refreshKey={refreshKey} /> : null}
      </Animated.ScrollView>
    </GlassScreen>
  );
}
