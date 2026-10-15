import React from 'react';
import { Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBack } from '../../../../src/core/navigation';
import { Header } from '../../../../src/shared/components/Header';
import { GlassScreen } from '../../../../src/shared/components/GlassScreen';
import { useFrostedHeader } from '../../../../src/shared/hooks/useFrostedHeader';
import { useRefresh } from '../../../../src/shared/hooks/useRefresh';
import { useCoachStore } from '../../../../src/store/coach/coachStore';
import { PerformanceView } from '../../../../src/features/performance/PerformanceView';

export default function CoachAthletePerformanceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { scrollY, scrollProps } = useFrostedHeader();
  const [refreshKey, setRefreshKey] = React.useState(0);
  const profile = useCoachStore((st) => st.teamMembers.find((m) => m.user_id === id)?.profile) as any;
  const athleteName = profile?.full_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || undefined;
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
        {id ? <PerformanceView athleteId={String(id)} mode="full" audience="coach" athleteName={athleteName} refreshKey={refreshKey} /> : null}
      </Animated.ScrollView>
    </GlassScreen>
  );
}
