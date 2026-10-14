import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { useRouter } from 'expo-router';
import { SprintyLogo } from '../../../shared/components/SprintyLogo';

import { useAuthStore } from '../../../store/authStore';
import { HeaderProfileAvatar } from '../../../shared/components/HeaderProfileAvatar';
import { glassCard } from '../../../shared/components/DashboardCard';

import { tourRef } from '../../onboarding/tourRegistry';
export const AthleteHeader = () => {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();

  return (
    <View style={styles.container}>
      {/* Left: Group Button Minimalist */}
      <TouchableOpacity 
        ref={tourRef('athlete.groups')}
        onPress={() => router.push('/(athlete)/groups')} 
        style={styles.iconButton}
        activeOpacity={0.7}
      >
        <Feather name="users" size={20} color={theme.colors.text} />
      </TouchableOpacity>

      {/* Center: Main Logo (SVG) */}
      <View style={styles.logoContainer}>
        <SprintyLogo width={120} height={38} />
      </View>

      {/* Right: Profile Avatar (Photo if set, Instagram-style placeholder otherwise) */}
      <HeaderProfileAvatar
        avatarUrl={user?.avatarUrl}
        onPress={() => router.push('/(athlete)/settings')}
        targetRef={tourRef('athlete.profile')}
        size={44}
      />
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
    paddingBottom: 8,
    zIndex: 10,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
  },
  iconButton: {
    // Same glass material as the dashboard cards (the header sits on the glows)
    ...glassCard,
    padding: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
