import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { useAuthStore } from '../../../store/authStore';

interface Props {
  onSettingsPress: () => void;
}

export const NutritionHeader: React.FC<Props> = ({ onSettingsPress }) => {
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);

  const currentStreak = user?.currentFlowStreak || 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
    paddingTop: 50,
    paddingBottom: 15,
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
