import { Appear } from '../../src/shared/components/Appear';
import React, { useState, useEffect } from 'react';
import { Animated } from 'react-native';
import { useNutritionStore } from '../../src/store/nutrition/nutritionStore';
import { NutritionHeader } from '../../src/features/nutrition/components/NutritionHeader';
import { DateSelector } from '../../src/features/nutrition/components/DateSelector';
import { NutritionSummary } from '../../src/features/nutrition/components/NutritionSummary';
import { GoalProgressCard } from '../../src/features/nutrition/components/GoalProgressCard';
import { AdaptiveTargetCard } from '../../src/features/nutrition/components/AdaptiveTargetCard';
import { MealSection } from '../../src/features/nutrition/components/MealSection';
import { FoodSearchModal } from '../../src/features/nutrition/components/FoodSearchModal';
import { NutritionSettingsModal } from '../../src/features/nutrition/components/NutritionSettingsModal';
import { StreakCelebrationModal } from '../../src/features/nutrition/components/StreakCelebrationModal';
import { useAuthStore } from '../../src/store/authStore';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { GlassScreen } from '../../src/shared/components/GlassScreen';
import { useTabBarSpace } from '../../src/shared/hooks/useTabBarSpace';
import { useFrostedHeader } from '../../src/shared/hooks/useFrostedHeader';

import { useRefresh } from '../../src/shared/hooks/useRefresh';

export default function NutritionScreen() {
  const params = useLocalSearchParams();
  const athleteId = params.athleteId as string;
  const readonly = params.readonly === 'true';

  const tabBarSpace = useTabBarSpace();
  const { barOpacity, scrollProps } = useFrostedHeader();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [athleteProfile, setAthleteProfile] = useState<any>(null);
  const { currentDate, fetchMealLogs } = useNutritionStore();
  const user = useAuthStore(state => state.user);

  const refreshControl = useRefresh(() => (user ? fetchMealLogs(currentDate, athleteId) : undefined));

  // Charger le profil spécifique de l'athlète consulté si mode coach
  useEffect(() => {
    if (athleteId) {
      supabase
        .from('profiles')
        .select('*')
        .eq('id', athleteId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setAthleteProfile(data);
        });
    } else {
      setAthleteProfile(null);
    }
  }, [athleteId]);

  useEffect(() => {
    if (user) {
      fetchMealLogs(currentDate, athleteId);
    }
  }, [currentDate, user, athleteId]);

  return (
    <GlassScreen>
      <NutritionHeader
        barOpacity={barOpacity}
        showSettings={!readonly}
        onSettingsPress={() => { if (!readonly) setSettingsVisible(true); }}
        athleteProfile={athleteProfile}
      />

      <Animated.ScrollView {...scrollProps} refreshControl={refreshControl} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabBarSpace }}>
        <Appear index={0}><DateSelector athleteId={athleteId} /></Appear>
        <Appear index={1}><NutritionSummary athleteProfile={athleteProfile} /></Appear>
        <Appear index={2}><GoalProgressCard athleteProfile={athleteProfile} athleteId={athleteId} readonly={readonly} /></Appear>
        {!athleteId && !readonly && <Appear index={3}><AdaptiveTargetCard /></Appear>}
        <Appear index={4}><MealSection readonly={readonly} athleteId={athleteId} athleteProfile={athleteProfile} /></Appear>
      </Animated.ScrollView>

      {!readonly && <FoodSearchModal />}

      {!readonly && (
        <NutritionSettingsModal
          visible={settingsVisible}
          onClose={() => setSettingsVisible(false)}
        />
      )}
      <StreakCelebrationModal />
    </GlassScreen>
  );
}
