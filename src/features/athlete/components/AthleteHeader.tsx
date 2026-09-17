import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { useRouter } from 'expo-router';
import { SprintyLogo } from '../../../shared/components/SprintyLogo';
import { BlurView } from 'expo-blur';

export const AthleteHeader = () => {
  const theme = useTheme();
  const router = useRouter();

  const isDark = theme.isDark;

  return (
    <View style={styles.container}>
      <BlurView 
        intensity={isDark ? 30 : 60} 
        tint={isDark ? "dark" : "light"} 
        style={[styles.blurContainer, { 
          backgroundColor: isDark ? 'rgba(30,41,59,0.7)' : 'rgba(255,255,255,0.7)',
          borderColor: theme.colors.border 
        }]}
      >
        {/* Left: Group Logo */}
        <TouchableOpacity 
          onPress={() => router.push('/(athlete)/groups')} 
          style={[styles.iconButton, { backgroundColor: theme.colors.surfaceLight }]}
        >
          <Feather name="users" size={20} color={theme.colors.accent} />
        </TouchableOpacity>

        {/* Center: Main Logo (SVG) */}
        <View style={styles.logoContainer}>
          <SprintyLogo width={110} height={35} />
        </View>

        {/* Right: Profile Logo */}
        <TouchableOpacity 
          onPress={() => router.push('/(athlete)/settings')} 
          style={[styles.iconButton, { backgroundColor: theme.colors.surfaceLight }]}
        >
          <Feather name="user" size={20} color={theme.colors.accent} />
        </TouchableOpacity>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    zIndex: 10,
  },
  blurContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#0026AE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
