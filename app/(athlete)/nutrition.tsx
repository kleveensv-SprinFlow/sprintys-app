import React, { useState, useEffect } from 'react';
import { ScrollView } from 'react-native';
import { useNutritionStore } from '../../src/store/nutrition/nutritionStore';
import { NutritionHeader } from '../../src/features/nutrition/components/NutritionHeader';
import { DateSelector } from '../../src/features/nutrition/components/DateSelector';
import { NutritionSummary } from '../../src/features/nutrition/components/NutritionSummary';
import { MealSection } from '../../src/features/nutrition/components/MealSection';
import { FoodSearchModal } from '../../src/features/nutrition/components/FoodSearchModal';
import { NutritionSettingsModal } from '../../src/features/nutrition/components/NutritionSettingsModal';
import { StreakCelebrationModal } from '../../src/features/nutrition/components/StreakCelebrationModal';
import { useAuthStore } from '../../src/store/authStore';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { GlassScreen } from '../../src/shared/components/GlassScreen';
import { useTabBarSpace } from '../../src/shared/hooks/useTabBarSpace';

export default function NutritionScreen() {
  const params = useLocalSearchParams();
  const athleteId = params.athleteId as string;
  const readonly = params.readonly === 'true';

  const tabBarSpace = useTabBarSpace();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [athleteProfile, setAthleteProfile] = useState<any>(null);
  const { currentDate, fetchMealLogs } = useNutritionStore();
  const user = useAuthStore(state => state.user);

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
        onSettingsPress={() => { if (!readonly) setSettingsVisible(true); }}
        athleteProfile={athleteProfile}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabBarSpace }}>
        <DateSelector athleteId={athleteId} />
        <NutritionSummary athleteProfile={athleteProfile} />
        <MealSection readonly={readonly} athleteId={athleteId} athleteProfile={athleteProfile} />
      </ScrollView>

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
