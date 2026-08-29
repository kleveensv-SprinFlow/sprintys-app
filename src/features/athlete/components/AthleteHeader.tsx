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
      <TouchableOpacity onPress={() => router.push('/(athlete)/groups')} style={[styles.iconButton, { backgroundColor: theme.colors.surfaceLight }]}>
        <Feather name="users" size={24} color={theme.colors.text} />
      </TouchableOpacity>

      {/* Center: Main Logo (SVG) */}
      <SprintyLogo width={120} height={40} />

      {/* Right: Profile Logo */}
      <TouchableOpacity onPress={() => router.push('/(athlete)/settings')} style={[styles.iconButton, { backgroundColor: theme.colors.surfaceLight }]}>
        <Feather name="user" size={24} color={theme.colors.text} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
