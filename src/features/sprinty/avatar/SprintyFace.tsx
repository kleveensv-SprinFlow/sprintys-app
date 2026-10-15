import React from 'react';
import { Image, StyleProp, View, ViewStyle } from 'react-native';
import type { MoodKey } from './poses.generated';

/** Visage fixe de Sprinty pour les petites tailles et les listes (aucune animation, aucun coût). */
const FACES: Record<MoodKey, number> = {
  neutral: require('../../../../assets/sprinty/neutral.png'),
  success: require('../../../../assets/sprinty/success.png'),
  perplexed: require('../../../../assets/sprinty/perplexed.png'),
  caution: require('../../../../assets/sprinty/caution.png'),
  frustrated: require('../../../../assets/sprinty/frustrated.png'),
  sleep: require('../../../../assets/sprinty/sleep.png'),
};

interface Props {
  mood?: MoodKey;
  size?: number;
  /** Pastille ronde derrière le visage (listes, avatars) ; sinon le visage seul. */
  disc?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SprintyFace({ mood = 'neutral', size = 32, disc = false, style }: Props) {
  return (
    <View
      style={[
        { width: size, height: size, alignItems: 'center', justifyContent: 'center' },
        disc && { borderRadius: size / 2, backgroundColor: '#E4ECF8', overflow: 'hidden' },
        style,
      ]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Sprinty"
    >
      <Image source={FACES[mood]} style={{ width: size * (disc ? 1.12 : 1), height: size * (disc ? 1.12 : 1), marginTop: disc ? size * 0.06 : 0 }} resizeMode="contain" />
    </View>
  );
}
