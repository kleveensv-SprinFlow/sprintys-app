import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../core/theme';

export const AthleteHeader = () => {
  const handlePress = () => {
    Alert.alert('Interface en cours de dev', "Cette fonctionnalité n'est pas encore prête.");
  };

  return (
    <View style={styles.container}>
      {/* Left: Group Logo (placeholder) */}
      <TouchableOpacity onPress={handlePress} style={styles.iconButton}>
        <Feather name="users" size={24} color={theme.colors.text} />
      </TouchableOpacity>

      {/* Center: Main Logo */}
      <Image 
        source={{ uri: 'https://tmmhznwstzmgnwoqlgqu.supabase.co/storage/v1/object/public/logo/sans%20fond.png' }}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Right: Profile Logo (placeholder) */}
      <TouchableOpacity onPress={handlePress} style={styles.iconButton}>
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
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.md,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    height: 40,
    width: 150,
  },
});
