import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GlassSheenProps {
  /** Corner radius of the surface (the sheen follows its top corners). */
  radius?: number;
}

/**
 * Soft light reflection on the top of a frosted pane. Drop it as the FIRST child of
 * a glass surface. Plain gradient with its own top radii: no image and no clipping
 * wrapper (nested overflow-hidden clips inside animated cards misdraw on Android).
 */
export const GlassSheen = ({ radius = 0 }: GlassSheenProps) => (
  <LinearGradient
    pointerEvents="none"
    colors={['rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0)']}
    start={{ x: 0, y: 0 }}
    end={{ x: 0, y: 1 }}
    style={[styles.sheen, { borderTopLeftRadius: radius, borderTopRightRadius: radius }]}
  />
);

const styles = StyleSheet.create({
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
  },
});
