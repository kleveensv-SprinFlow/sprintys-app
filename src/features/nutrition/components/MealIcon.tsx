import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { universalColors } from '../../../core/theme';
import { MEAL_ACCENT } from '../nutritionTheme';
import { MealType } from '../types';

interface MealIconProps {
  type: MealType;
  /** Size of the glyph (the tile is ~1.75x bigger). */
  size?: number;
  /** Draw the glyph inside a soft rounded tile. */
  tile?: boolean;
  color?: string;
}

/**
 * Sprintys meal icons, drawn for the app (24x24 grid, round 1.8 strokes):
 * sunrise, high sun, moon & star, "recharge" bolt.
 */
const Glyph = ({ type, size, color }: { type: MealType; size: number; color: string }) => {
  const stroke = { stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {type === 'petit_dejeuner' && (
        <>
          {/* Sunrise: half sun on the horizon */}
          <Path d="M6.5 16a5.5 5.5 0 0 1 11 0" {...stroke} />
          <Line x1="3" y1="19" x2="21" y2="19" {...stroke} />
          <Line x1="12" y1="5" x2="12" y2="7.5" {...stroke} />
          <Line x1="4.9" y1="9.4" x2="6.6" y2="11.1" {...stroke} />
          <Line x1="19.1" y1="9.4" x2="17.4" y2="11.1" {...stroke} />
        </>
      )}
      {type === 'dejeuner' && (
        <>
          {/* High sun */}
          <Circle cx="12" cy="12" r="4" {...stroke} />
          <Line x1="12" y1="2.8" x2="12" y2="4.8" {...stroke} />
          <Line x1="12" y1="19.2" x2="12" y2="21.2" {...stroke} />
          <Line x1="2.8" y1="12" x2="4.8" y2="12" {...stroke} />
          <Line x1="19.2" y1="12" x2="21.2" y2="12" {...stroke} />
          <Line x1="5.5" y1="5.5" x2="6.9" y2="6.9" {...stroke} />
          <Line x1="17.1" y1="17.1" x2="18.5" y2="18.5" {...stroke} />
          <Line x1="18.5" y1="5.5" x2="17.1" y2="6.9" {...stroke} />
          <Line x1="6.9" y1="17.1" x2="5.5" y2="18.5" {...stroke} />
        </>
      )}
      {type === 'diner' && (
        <>
          {/* Moon & star */}
          <Path d="M19 14.2A7.5 7.5 0 0 1 9.8 5a7.5 7.5 0 1 0 9.2 9.2Z" {...stroke} />
          <Path d="M17 3.5v3M15.5 5h3" {...stroke} />
        </>
      )}
      {type === 'collation' && (
        <>
          {/* Recharge bolt */}
          <Path d="M13 2.8 5.8 13.2h5.4l-1.2 8 7.2-10.4h-5.4l1.2-8Z" {...stroke} />
        </>
      )}
    </Svg>
  );
};

export const MealIcon = ({ type, size = 22, tile = true, color = MEAL_ACCENT }: MealIconProps) => {
  if (!tile) return <Glyph type={type} size={size} color={color} />;
  const box = Math.round(size * 1.8);
  return (
    <View
      style={{
        width: box,
        height: box,
        borderRadius: box * 0.3,
        borderCurve: 'continuous',
        backgroundColor: universalColors.sprintyMuted,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Glyph type={type} size={size} color={color} />
    </View>
  );
};
