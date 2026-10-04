import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: 'light' | 'default' | 'dark';
  borderRadius?: number;
  borderWidth?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = 50,
  tint = 'light',
  borderRadius = 20,
  borderWidth = 1,
}) => {
  return (
    <View
      style={[
        styles.outerContainer,
        {
          borderRadius,
          borderWidth,
        },
        style,
      ]}
    >
      <BlurView
        intensity={intensity}
        tint={tint}
        style={[StyleSheet.absoluteFillObject, { borderRadius }]}
      />
      <View
        style={[
          styles.innerSurface,
          {
            borderRadius,
            backgroundColor:
              Platform.OS === 'android'
                ? 'rgba(255, 255, 255, 0.78)'
                : 'rgba(255, 255, 255, 0.58)',
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    borderColor: 'rgba(255, 255, 255, 0.85)',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  innerSurface: {
    width: '100%',
  },
});
