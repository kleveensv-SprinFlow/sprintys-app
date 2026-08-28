import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { useRouter } from 'expo-router';

export const AthleteHeader = () => {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Left: Group Logo */}
      <TouchableOpacity onPress={() => router.push('/(athlete)/groups')} style={[styles.iconButton, { backgroundColor: theme.colors.surfaceLight }]}>
        <Feather name="users" size={24} color={theme.colors.text} />
      </TouchableOpacity>

      {/* Center: Main Logo */}
      <Image 
        source={{ uri: 'https://tmmhznwstzmgnwoqlgqu.supabase.co/storage/v1/object/public/logo/sans%20fond.png' }}
        style={styles.logo}
        resizeMode="contain"
      />

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
    paddingHorizontal: 24, // theme.spacing.xl
    paddingTop: 32, // theme.spacing.xxl
    paddingBottom: 12, // theme.spacing.md
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    height: 40,
    width: 150,
  },
});
