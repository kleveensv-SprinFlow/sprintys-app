import React from 'react';
import { Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBack } from '../../../../src/core/navigation';
import { Header } from '../../../../src/shared/components/Header';
import { GlassScreen } from '../../../../src/shared/components/GlassScreen';
import { useFrostedHeader } from '../../../../src/shared/hooks/useFrostedHeader';
import { useRefresh } from '../../../../src/shared/hooks/useRefresh';
import { PerformanceView } from '../../../../src/features/performance/PerformanceView';

export default function CoachAthletePerformanceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { scrollY, scrollProps } = useFrostedHeader();
  const [refreshKey, setRefreshKey] = React.useState(0);
  const refreshControl = useRefresh(async () => setRefreshKey((k) => k + 1));

  return (
    <GlassScreen scrollY={scrollY}>
      <Header title="Performance" showBackButton onBackPress={() => goBack(router, `/(coach)/athlete/${id}`)} scrollY={scrollY} />
      <Animated.ScrollView
        {...scrollProps}
        refreshControl={refreshControl}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {id ? <PerformanceView athleteId={String(id)} mode="full" audience="coach" refreshKey={refreshKey} /> : null}
      </Animated.ScrollView>
    </GlassScreen>
  );
}
