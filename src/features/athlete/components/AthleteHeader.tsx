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

  return (
    <View style={styles.container}>
      <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
        {/* Left: Group Logo */}
        <TouchableOpacity 
          onPress={() => router.push('/(athlete)/groups')} 
          style={styles.iconButton}
        >
          <Feather name="users" size={22} color={theme.colors.text} />
        </TouchableOpacity>

        {/* Center: Main Logo (SVG) */}
        <View style={styles.logoContainer}>
          <SprintyLogo width={110} height={35} />
        </View>

        {/* Right: Profile Logo */}
        <TouchableOpacity 
          onPress={() => router.push('/(athlete)/settings')} 
          style={styles.iconButton}
        >
          <Feather name="user" size={22} color={theme.colors.text} />
        </TouchableOpacity>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    zIndex: 10,
  },
  blurContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
});
