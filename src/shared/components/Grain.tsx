import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const GRAIN = require('../../../assets/textures/grain.png');

interface GrainProps {
  /** Corner radius of the surface the grain sits in (keeps the overlay inside it). */
  radius?: number;
  /** Soft light reflection on the top of the pane. */
  sheen?: boolean;
}

/**
 * Frosted-glass ("verre dépoli") texture: fine noise + a soft top reflection.
 * Drop it as the FIRST child of a glass surface. Clipped by its own wrapper so the
 * surface keeps its iOS shadow (overflow: hidden on the surface would cut it).
 * The noise is stretched (cover) rather than tiled: tiling + rounded corners is
 * unreliable on Android images.
 */
export const Grain = ({ radius = 0, sheen = true }: GrainProps) => (
  <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
    {sheen && (
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.55)', 'rgba(255, 255, 255, 0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.sheen}
      />
    )}
    <Image source={GRAIN} resizeMode="cover" style={StyleSheet.absoluteFill} />
  </View>
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
