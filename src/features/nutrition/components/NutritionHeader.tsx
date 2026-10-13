import React from 'react';
import { Animated, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { useAuthStore } from '../../../store/authStore';
import { FrostedBar } from '../../../shared/components/FrostedBar';

interface Props {
  onSettingsPress: () => void;
  athleteProfile?: any;
  /** Frosted bar opacity (fades in once the content scrolls under the header). */
  barOpacity?: Animated.AnimatedInterpolation<number> | number;
}

export const NutritionHeader: React.FC<Props> = ({ onSettingsPress, athleteProfile, barOpacity = 0 }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);

  const activeProfile = athleteProfile || user;
  const currentStreak = activeProfile?.currentFlowStreak || activeProfile?.current_flow_streak || 0;

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) + 6 }]}>
      <FrostedBar opacity={barOpacity} />
      <View style={styles.streakContainer}>
        <Feather name="zap" size={20} color="#FFD700" />
        <Text style={[styles.streakText, { color: theme.colors.text }]}>{currentStreak}</Text>
      </View>

      <Text style={[styles.title, { color: theme.colors.text }]}>Nutrition</Text>

      <TouchableOpacity onPress={onSettingsPress} style={styles.settingsButton}>
        <Feather name="settings" size={24} color={theme.colors.text} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  streakText: {
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  settingsButton: {
    padding: 5,
  }
});
