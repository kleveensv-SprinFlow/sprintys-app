import React from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { glassSurface } from '../../../core/glass';
import { useAuthStore } from '../../../store/authStore';
import { FrostedBar } from '../../../shared/components/FrostedBar';
import { PressableScale } from '../../../shared/components/PressableScale';

interface Props {
  onSettingsPress: () => void;
  athleteProfile?: any;
  /** Frosted bar opacity (fades in once the content scrolls under the header). */
  barOpacity?: Animated.AnimatedInterpolation<number> | number;
  /** Hidden for the coach's read-only view. */
  showSettings?: boolean;
}

export const NutritionHeader: React.FC<Props> = ({ onSettingsPress, athleteProfile, barOpacity = 0, showSettings = true }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);

  const activeProfile = athleteProfile || user;
  const currentStreak = activeProfile?.currentFlowStreak || activeProfile?.current_flow_streak || 0;

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) + 6 }]}>
      <FrostedBar opacity={barOpacity} />
      <View style={styles.row}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Nutrition</Text>

        <View style={styles.right}>
          {/* Logging streak, in the app's own bolt */}
          <View style={[styles.streakChip, glassSurface]}>
            <Feather name="zap" size={14} color={theme.colors.sprintyBlue} />
            <Text style={[styles.streakText, { color: theme.colors.text }]}>{currentStreak}</Text>
          </View>

          {showSettings && (
            <PressableScale onPress={onSettingsPress} haptic="selection" hitSlop={8} style={[styles.iconButton, glassSurface]}>
              <Feather name="sliders" size={18} color={theme.colors.text} />
            </PressableScale>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    zIndex: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    height: 38,
    borderRadius: 19,
  },
  streakText: {
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
