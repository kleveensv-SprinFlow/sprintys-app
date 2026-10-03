import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../core/theme';

interface HeaderProfileAvatarProps {
  avatarUrl?: string | null;
  onPress: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export const HeaderProfileAvatar: React.FC<HeaderProfileAvatarProps> = ({
  avatarUrl,
  onPress,
  size = 42,
  style,
}) => {
  const theme = useTheme();
  const radius = size / 2;
  const iconSize = Math.round(size * 0.52);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: theme.colors.surfaceLight,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={[
            styles.avatarImage,
            {
              width: size - 4,
              height: size - 4,
              borderRadius: (size - 4) / 2,
            },
          ]}
          resizeMode="cover"
        />
      ) : (
        /* Instagram-style default profile avatar */
        <View
          style={[
            styles.fallbackContainer,
            {
              width: size,
              height: size,
              borderRadius: radius,
              backgroundColor: '#F1F5F9',
            },
          ]}
        >
          <Ionicons name="person" size={iconSize} color="#94A3B8" />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarImage: {
    backgroundColor: '#E2E8F0',
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
