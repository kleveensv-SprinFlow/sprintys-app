import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: 'light' | 'default' | 'dark';
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  contentStyle,
  intensity = 60,
  tint = 'light',
  borderRadius = 22,
  borderWidth = 0,
  borderColor = 'transparent',
}) => {
  return (
    <View
      style={[
        styles.outerContainer,
        {
          borderRadius,
          borderWidth,
          borderColor,
        },
        style,
      ]}
    >
      {/* 1. Flou d'arrière-plan (20px blur) avec dimezisBlurView forcé sur Android */}
      <BlurView
        intensity={intensity}
        tint={tint}
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFillObject}
      />

      {/* 2. Dégradé de brillance zénithale spéculaire (35% moyen) */}
      <LinearGradient
        colors={[
          'rgba(255, 255, 255, 0.45)',
          'rgba(255, 255, 255, 0.18)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* 3. Contenu enfant */}
      <View style={[styles.innerContent, contentStyle]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 3,
    backgroundColor: Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
  },
  innerContent: {
    width: '100%',
  },
});
