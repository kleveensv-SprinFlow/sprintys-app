import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { useRouter } from 'expo-router';
import { SprintyLogo } from '../../../shared/components/SprintyLogo';

export const AthleteHeader = () => {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Left: Group Logo */}
      <TouchableOpacity 
        onPress={() => router.push('/(athlete)/groups')} 
        style={[styles.iconButton, { backgroundColor: theme.colors.surface }]}
      >
        <Feather name="users" size={22} color={theme.colors.accent} />
      </TouchableOpacity>

      {/* Center: Main Logo (SVG) */}
      <View style={styles.logoContainer}>
        <SprintyLogo width={120} height={38} />
      </View>

      {/* Right: Profile Logo */}
      <TouchableOpacity 
        onPress={() => router.push('/(athlete)/settings')} 
        style={[styles.iconButton, { backgroundColor: theme.colors.surface }]}
      >
        <Feather name="user" size={22} color={theme.colors.accent} />
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
    paddingTop: 12,
    paddingBottom: 16,
    zIndex: 10,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0026AE',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
});
