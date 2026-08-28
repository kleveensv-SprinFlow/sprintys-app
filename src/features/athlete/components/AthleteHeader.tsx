import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';

export const AthleteHeader = () => {
  const theme = useTheme();

  const handlePress = () => {
    Alert.alert('Interface en cours de dev', "Cette fonctionnalité n'est pas encore prête.");
  };

  return (
    <View style={styles.container}>
      {/* Left: Group Logo (placeholder) */}
      <TouchableOpacity onPress={handlePress} style={[styles.iconButton, { backgroundColor: theme.colors.surfaceLight }]}>
        <Feather name="users" size={24} color={theme.colors.text} />
      </TouchableOpacity>

      {/* Center: Main Logo */}
      <Image 
        source={{ uri: 'https://tmmhznwstzmgnwoqlgqu.supabase.co/storage/v1/object/public/logo/sans%20fond.png' }}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Right: Profile Logo (placeholder) */}
      <TouchableOpacity onPress={handlePress} style={[styles.iconButton, { backgroundColor: theme.colors.surfaceLight }]}>
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
