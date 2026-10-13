import React from 'react';
import { Animated, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { universalColors } from '../../core/theme';

interface Glow {
  id: string;
  color: string;
  /** Center, as a fraction of the screen width / height. */
  x: number;
  y: number;
  /** Radius, as a fraction of the screen width. */
  r: number;
  opacity: number;
}

// Brand palette only (Sprinty blue / cyan + a hint of violet), kept pastel for the light theme.
// Spread down the whole screen so frosted cards always have some color to diffuse.
const GLOWS: Glow[] = [
  { id: 'glowBlue', color: universalColors.sprintyBlue, x: 0.05, y: 0.03, r: 0.95, opacity: 0.2 },
  { id: 'glowCyan', color: universalColors.sprintyCyan, x: 1.0, y: 0.13, r: 0.85, opacity: 0.24 },
  { id: 'glowCyanMid', color: universalColors.sprintyCyan, x: 0.95, y: 0.5, r: 0.7, opacity: 0.12 },
  { id: 'glowViolet', color: '#8B5CF6', x: 0.05, y: 0.62, r: 0.8, opacity: 0.11 },
  { id: 'glowBottom', color: universalColors.sprintyBlue, x: 0.9, y: 0.92, r: 0.85, opacity: 0.12 },
];

// Extra height so the layer still covers the screen once the parallax has moved it up
const PARALLAX_OVERSCAN = 400;

interface GlowBackgroundProps {
  /** Scroll position of the screen; glows then drift at 30% of the scroll speed. */
  scrollY?: Animated.Value;
}

/**
 * Soft light-theme glows drawn with SVG radial gradients: no blur needed, so it
 * renders the same on Android and iOS and costs a single static layer.
 */
export const GlowBackground = ({ scrollY }: GlowBackgroundProps) => {
  const { width, height } = useWindowDimensions();
  const layerHeight = height + PARALLAX_OVERSCAN;

  const translateY = scrollY
    ? scrollY.interpolate({
        inputRange: [-300, 0, 1200],
        outputRange: [90, 0, -360],
        extrapolate: 'clamp',
      })
    : 0;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={{ width, height: layerHeight, transform: [{ translateY }] }}>
        <Svg width={width} height={layerHeight}>
          <Defs>
            {GLOWS.map((g) => (
              <RadialGradient
                key={g.id}
                id={g.id}
                cx={g.x * width}
                cy={g.y * height}
                r={g.r * width}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0" stopColor={g.color} stopOpacity={g.opacity} />
                {/* Mid stop gives an ease-out falloff instead of a visible disc edge */}
                <Stop offset="0.45" stopColor={g.color} stopOpacity={g.opacity * 0.45} />
                <Stop offset="1" stopColor={g.color} stopOpacity={0} />
              </RadialGradient>
            ))}
          </Defs>
          {GLOWS.map((g) => (
            <Rect key={g.id} x={0} y={0} width={width} height={layerHeight} fill={`url(#${g.id})`} />
          ))}
        </Svg>
      </Animated.View>
    </View>
  );
};
