import React from 'react';
import { View, Image, StyleSheet, Pressable } from 'react-native';
import { theme } from '../../core/theme';

interface ProfileAvatarProps {
  size?: number;
  onPress?: () => void;
  imageUrl?: string | null;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ 
  size = 40, 
  onPress, 
  imageUrl 
}) => {
  return (
    <Pressable 
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && styles.pressed
      ]}
    >
      <View style={[styles.border, { borderRadius: size / 2 }]}>
        {imageUrl ? (
          <Image 
            source={{ uri: imageUrl }} 
            style={[styles.image, { borderRadius: (size - 4) / 2 }]} 
          />
        ) : (
          <View style={[styles.placeholder, { borderRadius: (size - 4) / 2 }]}>
            <View style={styles.initialsContainer}>
              <View style={styles.dot} />
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  border: {
    flex: 1,
    padding: 2,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.accent,
  }
});
