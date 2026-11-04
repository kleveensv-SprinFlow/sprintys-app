import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { useRouter } from 'expo-router';
import { SprintyLogo } from '../../../shared/components/SprintyLogo';
import { useAuthStore } from '../../../store/authStore';
import { HeaderProfileAvatar } from '../../../shared/components/HeaderProfileAvatar';
import { PressableScale } from '../../../shared/components/PressableScale';
import { glassCard } from '../../../shared/components/DashboardCard';
import { SprintyAvatar } from '../../sprinty/avatar/SprintyAvatar';
import { tourRef } from '../../onboarding/tourRegistry';

/**
 * Home header: my group (left), logo (centre), Sprinty and my profile (right).
 * Sprinty is always one tap away from the home, not only when the daily card shows up.
 */
export const AthleteHeader = () => {
  const theme = useTheme();
  const router = useRouter();
  const avatarUrl = useAuthStore((s) => s.user?.avatarUrl);

  return (
    <View style={styles.container}>
      {/* Logo truly centred whatever the width of the side buttons */}
      <View style={styles.logoContainer} pointerEvents="none">
        <SprintyLogo width={120} height={38} />
      </View>

      <PressableScale
        targetRef={tourRef('athlete.groups')}
        haptic="selection"
        onPress={() => router.push('/(athlete)/groups')}
        style={styles.iconButton}
        accessibilityRole="button"
        accessibilityLabel="Mon groupe"
      >
        <Feather name="users" size={20} color={theme.colors.text} />
      </PressableScale>

      <View style={styles.right}>
        <PressableScale
          haptic="selection"
          onPress={() => router.push('/chat/sprinty')}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="Parler à Sprinty"
        >
          <SprintyAvatar size={34} animated={false} />
        </PressableScale>
        <HeaderProfileAvatar
          avatarUrl={avatarUrl}
          onPress={() => router.push('/(athlete)/settings')}
          targetRef={tourRef('athlete.profile')}
          size={44}
        />
      </View>
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
    ...StyleSheet.absoluteFillObject,
    top: 12,
    bottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconButton: {
    // Same glass material as the dashboard cards (the header sits on the glows)
    ...glassCard,
    padding: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
